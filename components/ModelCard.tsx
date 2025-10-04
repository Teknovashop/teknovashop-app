"use client";

import { useState } from "react";
import DownloadButton from "./DownloadButton";
import type { ForgeModel } from "@/data/models";

export default function ModelCard({ m }: { m: ForgeModel }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border border-[#e6eaf2] dark:border-neutral-800 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-[#f4f7fb] dark:bg-neutral-800">
        {imgOk ? (
          <img
            src={m.thumbnail}
            alt={m.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-300">
              {m.slug}
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-[#0b1526] dark:text-white">
          {m.name}
        </h3>
        <p className="mt-1 text-sm text-[#6b7280] dark:text-neutral-400">
          {m.description}
        </p>

        {m.tips && m.tips.length > 0 && (
          <ul className="mt-3 text-xs text-[#6b7280] dark:text-neutral-400 space-y-1 list-disc pl-5">
            {m.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {/* El botón normaliza 'public/xxx.stl' a 'xxx.stl' y el backend busca variantes con hash si hace falta */}
          <DownloadButton path={m.stlPath} fileName={`${m.slug}.stl`} />
        </div>
      </div>
    </div>
  );
}
