'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  // ---- Imagen con fallback -----------------------------------------------
  const [imgOk, setImgOk] = useState(true);

  // ---- Ruta STL robusta a partir del slug si no hay m.stlPath ------------
  const bestStlPath = useMemo(() => {
    // Si ya viene definida en datos, la usamos tal cual
    if (m.stlPath && typeof m.stlPath === 'string' && m.stlPath.trim().length > 0) {
      return m.stlPath.trim();
    }

    // Heurística por lo que hay en tu bucket:
    // - vesa-adapter/vesa-adapter.stl
    // - vesa_adapter/vesa_adapter.stl
    // - vesa-adapter.stl
    // - vesa_adapter.stl
    const dash = m.slug.replace(/_/g, '-');
    const undr = m.slug.replace(/-/g, '_');

    const candidates = [
      `${m.slug}.stl`,
      `${dash}.stl`,
      `${undr}.stl`,
      `${m.slug}/${m.slug}.stl`,
      `${dash}/${dash}.stl`,
      `${undr}/${undr}.stl`,
    ];

    // Quitamos duplicados y devolvemos la primera
    const unique = Array.from(new Set(candidates));
    return unique[0];
  }, [m.slug, m.stlPath]);

  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-[#f4f7fb] dark:bg-neutral-800">
        {imgOk ? (
          <Image
            src={m.thumbnail}
            alt={m.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImgOk(false)}
            priority={false}
          />
        ) : (
          // Fallback visual si la imagen falla
          <div
            className="absolute inset-0"
            aria-label="Vista previa no disponible"
            style={{
              background:
                'repeating-linear-gradient(45deg,#eef2f7,#eef2f7 12px,#e7ecf4 12px,#e7ecf4 24px)',
            }}
          />
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-[#0b1526] dark:text-white">{m.name}</h3>
        <p className="mt-1 text-sm text-[#6b7280] dark:text-neutral-400">{m.description}</p>

        {m.tips && m.tips.length > 0 && (
          <ul className="mt-3 text-xs text-[#6b7280] dark:text-neutral-400 space-y-1 list-disc pl-5">
            {m.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <DownloadButton path={bestStlPath} fileName={`${m.slug}.stl`} />
        </div>

        {/* pista útil (solo si no venía un path explícito) */}
        {!m.stlPath && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Nota: usando ruta sugerida <code className="font-mono">{bestStlPath}</code>.  
            Asegúrate de que exista en el bucket <code>forge-stl</code>.
          </p>
        )}
      </div>
    </div>
  );
}
