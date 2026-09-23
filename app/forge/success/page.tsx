"use client";

import { useEffect, useState } from "react";

type State = "checking" | "ready" | "waiting" | "error";

export default function SuccessPage({ searchParams }: any) {
  const sessionId = searchParams?.session_id as string | undefined;
  const designId = searchParams?.design_id as string | undefined;
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("Confirmando el pago y activando la licencia…");
  const [plan, setPlan] = useState<string | undefined>();

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("No se ha recibido el identificador de la sesión de pago.");
      return;
    }

    let cancelled = false;

    async function checkEntitlement() {
      for (let attempt = 0; attempt < 15 && !cancelled; attempt++) {
        try {
          const qs = designId
            ? "?design_id=" + encodeURIComponent(designId)
            : "";
          const res = await fetch("/api/entitlements" + qs, {
            cache: "no-store",
          });
          const data = await res.json().catch(() => ({}));

          if (data?.hasAccess) {
            setPlan(data?.plan);
            setState("ready");
            setMessage(
              designId
                ? "Pago confirmado. Tu diseño ya tiene licencia y está listo para descargar."
                : "Pago confirmado. Tu suscripción ya está activa."
            );
            return;
          }
        } catch {
          // El webhook puede tardar unos segundos; seguimos reintentando.
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!cancelled) {
        setState("waiting");
        setMessage(
          "Stripe ha devuelto el pago correctamente, pero la licencia todavía se está sincronizando. Puedes volver al configurador y reintentar en unos segundos."
        );
      }
    }

    void checkEntitlement();
    return () => {
      cancelled = true;
    };
  }, [sessionId, designId]);

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
            <div className="mt-1 text-xs font-semibold">
              Licencia: {plan}
            </div>
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
