'use client';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-[#f4f7fb] dark:bg-neutral-800">
        {/* Forzamos <img> simple para evitar optimizer y que SIEMPRE se vea */}
        <img
          src={m.thumbnail}
          alt={m.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-[#0b1526] dark:text-white">{m.name}</h3>
        <p className="mt-1 text-sm text-[#6b7280] dark:text-neutral-400">{m.description}</p>

        {m.tips && (
          <ul className="mt-3 text-xs text-[#6b7280] dark:text-neutral-400 space-y-1 list-disc pl-5">
            {m.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}

        <div className="mt-4">
          <DownloadButton path={m.stlPath} fileName={`${m.slug}.stl`} />
        </div>
      </div>
    </div>
  );
}
