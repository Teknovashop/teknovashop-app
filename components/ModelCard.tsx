'use client';
import Image from 'next/image';
import DownloadButton from './DownloadButton';
import type { ForgeModel } from '@/data/models';

export default function ModelCard({ m }: { m: ForgeModel }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 shadow border border-white/10">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3">
        <Image src={m.thumbnail} alt={m.name} fill className="object-cover" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{m.name}</h3>
      <p className="text-sm text-white/70 mb-3">{m.description}</p>
      {m.tips && <ul className="text-xs text-white/60 mb-4 list-disc pl-5 space-y-1">{m.tips.map((t,i)=>(<li key={i}>{t}</li>))}</ul>}
      <DownloadButton path={m.stlPath} fileName={`${m.slug}.stl`} />
    </div>
  );
}
