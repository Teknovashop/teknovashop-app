'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

type Props = { path: string; fileName?: string };

export default function DownloadButton({ path, fileName }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Descarga disponible solo en el navegador (intenta recargar la página).');
      }
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
      if (error) throw error;
      const url = data?.signedUrl;
      if (!url) throw new Error('No se pudo generar el enlace firmado');

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName ?? path.split('/').pop() ?? 'model.stl';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setErr(e.message || 'Error al descargar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-4 py-2 rounded-2xl bg-black/10 md:bg-white/10 hover:bg-black/20 md:hover:bg-white/20 transition shadow border border-black/10 md:border-white/10 backdrop-blur active:scale-95"
      >
        {loading ? 'Generando enlace…' : 'Descargar STL'}
      </button>
      {err && <span className="text-sm text-red-500">{err}</span>}
    </div>
  );
}
