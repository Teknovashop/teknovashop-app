'use client';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-[#f4f7fb] dark:bg-neutral-800">
        {/* img plano para evitar cualquier problema del optimizador */}
        <img
          src={m.thumbnail}
          alt={m.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
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
          {/* Buscamos por el slug (stem) dentro del bucket */}
          <DownloadButton stem={m.slug} fileName={`${m.slug}.stl`} />
        </div>
      </div>
    </div>
  );
}
