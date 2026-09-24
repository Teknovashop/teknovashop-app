"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  plan: "oneoff" | "maker" | "commercial";
  mode: "payment" | "subscription";
  design_id: string | null;
  product_slug: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  created_at: string;
};

type Entitlement = {
  id: string;
  kind: "design" | "subscription";
  plan: "oneoff" | "maker" | "commercial";
  design_id: string | null;
  active: boolean;
  starts_at: string;
  expires_at: string | null;
  terms_version: string;
  license_version: string;
  created_at: string;
};

type AccountData = {
  ok: boolean;
  authenticated: boolean;
  email?: string | null;
  orders?: Order[];
  entitlements?: Entitlement[];
  error?: string;
};

function planLabel(plan: string) {
  if (plan === "commercial") return "Commercial";
  if (plan === "maker") return "Maker";
  return "Diseño individual";
}

function dateLabel(value?: string | null) {
  if (!value) return "Sin caducidad";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function amountLabel(order: Order) {
  if (order.amount_total == null || !order.currency) return "—";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: order.currency.toUpperCase(),
    }).format(order.amount_total / 100);
  } catch {
    return `${(order.amount_total / 100).toFixed(2)} ${order.currency.toUpperCase()}`;
  }
}

function isCurrent(entitlement: Entitlement) {
  if (!entitlement.active) return false;
  if (!entitlement.expires_at) return true;
  return new Date(entitlement.expires_at).getTime() > Date.now();
}

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setData(json);
    } catch {
      setData({ ok: false, authenticated: false, error: "NETWORK_ERROR" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeSubscriptions = useMemo(
    () =>
      (data?.entitlements || []).filter(
        (row) => row.kind === "subscription" && isCurrent(row)
      ),
    [data]
  );

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-slate-600">Cargando tus compras…</p>
      </main>
    );
  }

  if (!data?.authenticated) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
            Cuenta Teknovashop
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Mis compras</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Inicia sesión con el mismo email usado en Stripe para ver licencias,
            compras y descargas disponibles.
          </p>
          <Link
            href="/login?next=/account"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  const orders = data.orders || [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              ← Teknovashop Forge
            </Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Mis compras y licencias
            </h1>
            <p className="mt-2 text-sm text-slate-600">{data.email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/forge"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Abrir configurador
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-black text-slate-950">Suscripciones activas</h2>
          {activeSubscriptions.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {activeSubscriptions.map((entitlement) => (
                <article
                  key={entitlement.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-slate-950">
                      {planLabel(entitlement.plan)}
                    </strong>
                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                      Activa
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-emerald-900">
                    Vigente hasta: {dateLabel(entitlement.expires_at)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Licencia {entitlement.license_version} · Términos {entitlement.terms_version}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No tienes una suscripción activa.
            </p>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">Historial de compras</h2>
            <span className="text-xs text-slate-500">{orders.length} operaciones</span>
          </div>

          {orders.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-slate-950">{planLabel(order.plan)}</strong>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-600">
                          {order.payment_status || "registrada"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.product_slug || (order.mode === "subscription" ? "Suscripción Forge" : "Diseño Forge")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dateLabel(order.created_at)} · {amountLabel(order)}
                      </p>
                    </div>

                    {order.plan === "oneoff" && order.design_id ? (
                      <a
                        href={"/api/download/" + encodeURIComponent(order.design_id)}
                        className="inline-flex shrink-0 justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Descargar ZIP
                      </a>
                    ) : (
                      <Link
                        href="/forge"
                        className="inline-flex shrink-0 justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Crear diseño
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Todavía no hay compras registradas en esta cuenta.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
