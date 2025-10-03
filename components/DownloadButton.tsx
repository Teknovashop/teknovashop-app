'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabaseClient';

type Props = { path: string; fileName?: string };

export default function DownloadButton({ path, fileName }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ?? path.split('/').pop() ?? 'model.stl';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onClick = async () => {
    setErr(null);
    setLoading(true);
    try {
      const hasPublic =
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (hasPublic) {
        // vía Supabase (cliente)
        const supabase = getSupabase();
        if (!supabase) throw new Error('Disponible solo en el navegador.');
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl';
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 120);
        if (error) throw error;
        if (!data?.signedUrl) throw new Error('No se pudo generar enlace firmado');
        download(data.signedUrl);
      } else {
        // fallback: proxy a backend (Render)
        const r = await fetch(`/api/files/signed-url?path=${encodeURIComponent(path)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || 'No se pudo obtener signed URL');
        }
        const j = await r.json(); // { signed_url }
        if (!j?.signed_url) throw new Error('Respuesta inválida del backend');
        download(j.signed_url);
      }
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
        className="px-4 py-2 rounded-2xl bg-[#1118270f] hover:bg-[#1118271a] dark:bg-white/10 dark:hover:bg-white/20 transition shadow-sm border border-[#e6eaf2] dark:border-neutral-800"
      >
        {loading ? 'Generando enlace…' : 'Descargar STL'}
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </div>
  );
}
