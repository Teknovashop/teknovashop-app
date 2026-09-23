"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [next, setNext] = useState("/forge");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/forge");
  }, []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase no está configurado en el navegador.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const redirectTo =
      window.location.origin +
      "/auth/callback?next=" +
      encodeURIComponent(next);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Te hemos enviado un enlace de acceso por email.");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
          Cuenta Teknovashop
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          Accede para comprar y descargar
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Usamos un enlace de acceso por email para asociar compras, suscripciones,
          licencias y descargas a tu cuenta.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="tu@email.com"
            />
          </label>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "sending" ? "Enviando enlace…" : "Enviar enlace de acceso"}
          </button>
        </form>

        {message && (
          <div
            className={
              "mt-4 rounded-xl border px-3 py-2 text-sm " +
              (status === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800")
            }
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
