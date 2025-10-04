'use client';
import { useState } from 'react';

export default function DownloadButton({
  stem,
  fileName,
  className,
}: {
  stem: string;       // p.ej. "cable-tray"
  fileName: string;   // nombre sugerido
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      if (!stem) throw new Error('Falta el identificador del modelo');

      const res = await fetch(`/api/files/signed-url?stem=${encodeURIComponent(stem)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || 'No se pudo firmar la URL');
      }

      const a = document.createElement('a');
      a.href = json.url as string;
      a.download = fileName || `${stem}.stl`;
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
