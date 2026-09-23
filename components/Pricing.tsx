"use client";

import { useState } from "react";

async function startSubscription(price: "maker" | "commercial") {
  const res = await fetch("/api/checkout/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && data?.login_url) {
    window.location.href = data.login_url;
    return;
  }
  if (!res.ok || !data?.url) throw new Error(data?.error || "No se pudo crear la sesión");
  window.location.href = data.url;
}

const PLANS = [
  {
    key: "oneoff",
    label: "Compra única",
    title: "Un diseño, una licencia",
    price: "Por diseño",
    desc: "Configura una pieza concreta y compra exactamente esa versión.",
    items: ["Licencia ligada al design ID", "Paquete STL trazable", "Manifiesto y SHA-256"],
    cta: "Configurar pieza",
  },
  {
    key: "maker",
    label: "Maker",
    title: "Para crear con frecuencia",
    price: "Mensual",
    desc: "Para quien necesita iterar y descargar diseños de forma recurrente.",
    items: ["Suscripción activa", "Generación recurrente", "Licencia Maker"],
    cta: "Suscribirme",
    featured: true,
  },
  {
    key: "commercial",
    label: "Commercial",
    title: "Para fabricar y vender",
    price: "Mensual",
    desc: "Pensado para talleres, estudios y pequeños negocios.",
    items: ["Derechos comerciales", "Descargas trazables", "Cuenta asociada a Stripe"],
    cta: "Suscribirme",
  },
] as const;

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  async function select(plan: (typeof PLANS)[number]) {
    if (plan.key === "oneoff") {
      window.location.href = "/forge";
      return;
    }
    setLoading(plan.key);
    try {
      await startSubscription(plan.key);
    } catch (e: any) {
      alert(e?.message || "No se pudo iniciar el pago");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <article
          key={plan.key}
          className={
            "relative rounded-[1.4rem] border bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.06)] transition hover:-translate-y-1 " +
            (plan.featured ? "border-blue-400 ring-4 ring-blue-500/5" : "border-slate-200")
          }
        >
          {plan.featured && (
            <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
              Recomendado
            </span>
          )}
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{plan.label}</p>
          <h3 className="mt-3 text-xl font-black">{plan.title}</h3>
          <div className="mt-5 text-3xl font-black">{plan.price}</div>
          <p className="mt-3 min-h-[3rem] text-sm leading-6 text-slate-500">{plan.desc}</p>
          <div className="my-6 h-px bg-slate-100" />
          <ul className="space-y-3">
            {plan.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-600">
                <span className="text-emerald-500">✓</span>{item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => select(plan)}
            className={
              "mt-7 w-full rounded-xl px-4 py-3 text-sm font-black transition disabled:opacity-60 " +
              (plan.featured
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-slate-200 bg-[#f8faff] hover:bg-blue-50")
            }
          >
            {loading === plan.key ? "Redirigiendo…" : plan.cta}
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-400">
            El precio final aparecerá en checkout antes de confirmar.
          </p>
        </article>
      ))}
    </div>
  );
}
