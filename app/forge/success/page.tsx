// app/forge/success/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function SuccessPage({ searchParams }: any) {
  const sessionId = searchParams?.session_id;
  const [msg, setMsg] = useState("Verificando compra…");

  useEffect(() => {
    if (!sessionId) return;
    // Aquí podrías llamar a tu backend si quieres firmar de nuevo una URL por object_key
    setMsg("Compra verificada. Revisa tu email: te hemos activado la licencia y podrás descargar tus STL desde la app.");
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">¡Gracias! ✅</h1>
      <p className="mt-2 text-gray-700">{msg}</p>
      <a className="mt-6 inline-block rounded-lg border px-4 py-2" href="/forge">Volver al configurador</a>
    </div>
  );
}
