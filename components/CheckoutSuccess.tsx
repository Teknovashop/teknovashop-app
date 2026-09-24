"use client";

import { useEffect, useState } from "react";

type State = "checking" | "ready" | "waiting" | "error";

export default function CheckoutSuccess({
  sessionId,
  urlDesignId,
}: {
  sessionId?: string;
  urlDesignId?: string;
}) {
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
          "/api/checkout/status?session_id=" + encodeURIComponent(sessionId),
          { cache: "no-store" }
        );
        const verified = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok || !verified?.ok) {
          throw new Error(
            verified?.error || "No se ha podido verificar la sesión de pago."
          );
        }

        if (!verified?.paid) {
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

        if (urlDesignId && verifiedDesignId && urlDesignId !== verifiedDesignId) {
          throw new Error(
            "El diseño de la URL no coincide con la compra verificada."
          );
        }

        setDesignId(verifiedDesignId);
        setPlan(typeof verified.plan === "string" ? verified.plan : undefined);
        setMessage("Pago verificado. Activando tu licencia…");

        if (verified?.ready) {
          setState("ready");
          setMessage(
            verifiedDesignId
              ? "Pago confirmado. Tu diseño ya tiene licencia y está listo para descargar."
              : "Pago confirmado. Tu suscripción ya está activa."
          );
          return;
        }

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
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-16">
      <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
          Teknovashop Forge
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Gracias por tu compra
        </h1>

        <div
          className={
            "mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 " +
            (state === "ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : state === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-800")
          }
        >
          {message}
          {plan && <div className="mt-1 text-xs font-bold">Licencia: {plan}</div>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {state === "ready" && designId && (
            <a
              href={"/api/download/" + encodeURIComponent(designId)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
            >
              Descargar paquete ZIP
            </a>
          )}
          <a
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            href="/account"
          >
            Mis compras
          </a>
          <a
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            href="/forge"
          >
            Volver al configurador
          </a>
        </div>

        {designId && (
          <div className="mt-5 font-mono text-[10px] text-slate-500">
            Design ID: {designId}
          </div>
        )}
      </div>
    </main>
  );
}