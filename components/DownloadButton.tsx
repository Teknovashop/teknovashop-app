'use client';

import { useState } from 'react';

export default function DownloadButton({
  path,
  fileName,
  className,
}: {
  path: string;        // lo que venga del modelo (p.ej. "public/vesa-adapter.stl" o "vesa-adapter")
  fileName: string;    // nombre sugerido para guardar (p.ej. "vesa-adapter.stl")
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Normaliza:
  //  - quita barras iniciales
  //  - si empieza por "public/", lo elimina (venía de antiguos modelos)
  function normalizeKey(p: string) {
    let k = (p || '').trim().replace(/^\/+/, '');
    if (k.startsWith('public/')) k = k.slice('public/'.length);
    return k; // puede quedar "vesa-adapter.stl" o "vesa-adapter"
  }

  const onClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      const raw = normalizeKey(path);
      const res = await fetch(
        `/api/files/signed-url?key=${encodeURIComponent(raw)}`,
        { method: 'GET', cache: 'no-store' }
      );

      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || 'No se pudo firmar la URL');
      }

      // Dispara descarga
      const a = document.createElement('a');
      a.href = json.url as string;
      a.download = fileName || raw.split('/').pop() || 'modelo.stl';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setErr(e?.message || 'Error al descargar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? 'Preparando…' : 'Descargar STL'}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
