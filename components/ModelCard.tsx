'use client';
import Image from 'next/image';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="group rounded-3xl bg-white border border-[#e6eaf2] shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-[#f4f7fb]">
        <Image src={m.thumbnail} alt={m.name} fill className="object-cover" />
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-[#0b1526]">{m.name}</h3>
        <p className="mt-1 text-sm text-[#6b7280]">{m.description}</p>

        {m.tips && (
          <ul className="mt-3 text-xs text-[#6b7280] space-y-1 list-disc pl-5">
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
