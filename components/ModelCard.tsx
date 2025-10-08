'use client';

import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';
import Image from 'next/image';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden">
      {/* Imagen principal centrada y responsiva */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-[#f4f7fb] dark:bg-neutral-800">
        <Image
          src={m.thumbnail}
          alt={m.name || 'Modelo'}
          fill
          priority={false}
          loading="lazy"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Evita fondo roto si la imagen no carga
            const t = e.target as HTMLImageElement;
            t.style.display = 'none';
          }}
        />
      </div>

      {/* Contenido textual */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-[#0b1526] dark:text-white">
          {m.name}
        </h3>
        <p className="mt-1 text-sm text-[#6b7280] dark:text-neutral-400">
          {m.description}
        </p>

        {m.tips && (
          <ul className="mt-3 text-xs text-[#6b7280] dark:text-neutral-400 space-y-1 list-disc pl-5">
            {m.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}

        {/* Acciones */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`/forge/${m.slug}`}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 transition"
          >
            Configurar
          </a>
          <DownloadButton
            path={m.stlPath}
            fileName={`${m.slug}.stl`}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
