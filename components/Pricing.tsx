'use client';
import { useState } from 'react';

async function startCheckout(price: 'oneoff'|'maker'|'commercial') {
  const res = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price }), // email opcional (Stripe lo pide en Checkout)
  });
  if (!res.ok) throw new Error('No se pudo crear la sesión');
  const data = await res.json();
  if (!data?.url) throw new Error('Respuesta inesperada del servidor');
  window.location.href = data.url;
}

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold mb-2">Compra unica</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">Descarga STL de un modelo.</p>
        <button className="px-4 py-2 rounded-xl bg-black/10 md:bg-white/10 hover:bg-black/20 md:hover:bg-white/20"
          disabled={!!loading}
          onClick={async ()=>{ setLoading('one'); try { await startCheckout('oneoff'); } finally { setLoading(null); } }}>
          {loading==='one' ? 'Redirigiendo…' : 'Comprar'}
        </button>
      </div>
      <div className="p-6 rounded-2xl bg-white/10 border border-white/20">
        <h3 className="text-lg font-semibold mb-2">Maker (mensual)</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">Presets y descargas mensuales.</p>
        <button className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black"
          disabled={!!loading}
          onClick={async ()=>{ setLoading('maker'); try { await startCheckout('maker'); } finally { setLoading(null); } }}>
          {loading==='maker' ? 'Redirigiendo…' : 'Suscribirme'}
        </button>
      </div>
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold mb-2">Comercial</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">Uso comercial y prioridad.</p>
        <button className="px-4 py-2 rounded-xl bg-black/10 md:bg-white/10 hover:bg-black/20 md:hover:bg-white/20"
          disabled={!!loading}
          onClick={async ()=>{ setLoading('com'); try { await startCheckout('commercial'); } finally { setLoading(null); } }}>
          {loading==='com' ? 'Redirigiendo…' : 'Solicitar'}
        </button>
      </div>
    </div>
  );
}
