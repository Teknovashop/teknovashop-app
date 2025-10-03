'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DownloadButton({ path, fileName }: { path: string; fileName?: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onClick = async () => {
    setErr(null); setLoading(true);
    try {
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (error) throw error;
      const url = data?.signedUrl;
      if (!url) throw new Error('No signed URL');
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
      <button onClick={onClick} disabled={loading}
        className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 transition shadow border border-white/10 backdrop-blur active:scale-95">
        {loading ? 'Generando enlace…' : 'Descargar STL'}
      </button>
      {err && <span className="text-sm text-red-400">{err}</span>}
    </div>
  );
}
