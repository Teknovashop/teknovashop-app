"use client";

import { useEffect, useState } from "react";

type State = "checking" | "ready" | "waiting" | "error";

export default function SuccessPage({ searchParams }: any) {
  const sessionId = searchParams?.session_id as string | undefined;
  const urlDesignId = searchParams?.design_id as string | undefined;
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("Verificando el pago con Stripe…");
  const [plan, setPlan] = useState<string | undefined>();
  const [designId, setDesignId] = useState<string | undefined>();

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("No se ha recibido el identificador de la sesión de pago.");
      return;
    }

    let cancelled = false;

    async function verifyAndWaitForEntitlement() {
      try {
        const verifyRes = await fetch(
          "/api/checkout/session?session_id=" + encodeURIComponent(sessionId),
          { cache: "no-store" }
        );
        const verified = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok || !verified?.verified) {
          throw new Error(
            verified?.error || "No se ha podido verificar la sesión de pago."
          );
        }

        if (!verified?.complete) {
          setState("waiting");
          setMessage(
            "La sesión existe, pero Stripe todavía no marca el pago como completado."
          );
          return;
        }

        const verifiedDesignId =
          typeof verified.designId === "string" && verified.designId
            ? verified.designId
            : undefined;

        if (
          urlDesignId &&
          verifiedDesignId &&
          urlDesignId !== verifiedDesignId
        ) {
          throw new Error(
            "El diseño de la URL no coincide con la compra verificada."
          );
        }

        setDesignId(verifiedDesignId);
        setPlan(
          typeof verified.plan === "string" ? verified.plan : undefined
        );
        setMessage("Pago verificado. Activando tu licencia…");

        for (let attempt = 0; attempt < 15 && !cancelled; attempt++) {
          const qs = verifiedDesignId
            ? "?design_id=" + encodeURIComponent(verifiedDesignId)
            : "";
          const res = await fetch("/api/entitlements" + qs, {
            cache: "no-store",
          });
          const data = await res.json().catch(() => ({}));

          if (data?.hasAccess) {
            setPlan(data?.plan || verified.plan);
            setState("ready");
            setMessage(
              verifiedDesignId
                ? "Pago confirmado. Tu diseño ya tiene licencia y está listo para descargar."
                : "Pago confirmado. Tu suscripción ya está activa."
            );
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (!cancelled) {
          setState("waiting");
          setMessage(
            "El pago está verificado, pero la licencia todavía se está sincronizando. Puedes volver a intentarlo en unos segundos."
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setState("error");
          setMessage(err?.message || "No se ha podido verificar la compra.");
        }
      }
    }

    void verifyAndWaitForEntitlement();
    return () => {
      cancelled = true;
    };
  }, [sessionId, urlDesignId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
          Teknovashop Forge
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          Gracias por tu compra
        </h1>

        <div
          className={
            "mt-4 rounded-xl border px-4 py-3 text-sm leading-6 " +
            (state === "ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : state === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-800")
          }
        >
          {message}
          {plan && (
            <div className="mt-1 text-xs font-semibold">Licencia: {plan}</div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {state === "ready" && designId && (
            <a
              href={"/api/download/" + encodeURIComponent(designId)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Descargar paquete ZIP
            </a>
          )}

          <a
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            href="/account"
          >
            Mis compras
          </a>

          <a
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            href="/forge"
          >
            Volver al configurador
          </a>
        </div>

        {designId && (
          <div className="mt-5 font-mono text-[10px] text-neutral-500">
            Design ID: {designId}
          </div>
        )}
      </div>
    </main>
  );
}
