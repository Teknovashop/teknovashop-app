'use client';

import Link from 'next/link';
import Image from 'next/image';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      {/* Imagen principal enlazada al configurador */}
      <Link
        href={`/forge/${m.slug}`}
        title={`Configurar ${m.name}`}
        aria-label={`Ir al configurador de ${m.name}`}
        className="relative w-full aspect-[16/9] overflow-hidden bg-[#f4f7fb] dark:bg-neutral-800 block"
      >
        <Image
          src={m.thumbnail}
          alt={m.name}
          fill
          priority={false}
          loading="lazy"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition" />
      </Link>

      {/* Contenido textual */}
      <div className="p-5 flex flex-col justify-between flex-grow">
        <div>
          <Link
            href={`/forge/${m.slug}`}
            className="hover:underline decoration-2 underline-offset-4"
          >
            <h3 className="text-lg font-semibold text-[#0b1526] dark:text-white">
              {m.name}
            </h3>
          </Link>

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
        </div>

        {/* Botones */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/forge/${m.slug}`}
            className="flex-1 text-center rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Configurar
          </Link>

          <DownloadButton
            path={m.stlPath}
            fileName={`${m.slug}.stl`}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
