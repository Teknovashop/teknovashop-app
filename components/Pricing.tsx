'use client';
import { useState } from 'react';

async function startSubscription(price: 'maker'|'commercial') {
  const res = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && data?.login_url) {
    window.location.href = data.login_url;
    return;
  }
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || 'No se pudo crear la sesión');
  }
  window.location.href = data.url;
}

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold mb-2">Compra única</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">
          Configura una pieza concreta y compra la licencia de ese diseño.
        </p>
        <button
          className="px-4 py-2 rounded-xl bg-black/10 md:bg-white/10 hover:bg-black/20 md:hover:bg-white/20"
          onClick={() => { window.location.href = '/forge'; }}
        >
          Configurar pieza
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white/10 border border-white/20">
        <h3 className="text-lg font-semibold mb-2">Maker (mensual)</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">
          Generación y descargas para uso maker/personal mientras la suscripción esté activa.
        </p>
        <button
          className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black"
          disabled={!!loading}
          onClick={async () => {
            setLoading('maker');
            try { await startSubscription('maker'); }
            catch (e: any) { alert(e?.message || 'No se pudo iniciar el pago'); }
            finally { setLoading(null); }
          }}
        >
          {loading === 'maker' ? 'Redirigiendo…' : 'Suscribirme'}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold mb-2">Comercial</h3>
        <p className="text-sm text-black/70 md:text-white/70 mb-4">
          Descargas con licencia comercial mientras la suscripción esté activa.
        </p>
        <button
          className="px-4 py-2 rounded-xl bg-black/10 md:bg-white/10 hover:bg-black/20 md:hover:bg-white/20"
          disabled={!!loading}
          onClick={async () => {
            setLoading('commercial');
            try { await startSubscription('commercial'); }
            catch (e: any) { alert(e?.message || 'No se pudo iniciar el pago'); }
            finally { setLoading(null); }
          }}
        >
          {loading === 'commercial' ? 'Redirigiendo…' : 'Suscribirme'}
        </button>
      </div>
    </div>
  );
}
