"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FLAGS } from "@/lib/flags";

const STLViewerPro = dynamic(() => import("@/components/STLViewerPro"), { ssr: false });
const ForgeProForm = dynamic(() => import("@/components/ForgeProForm"), { ssr: false });

export default function ForgeProPage() {
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">FORGE PRO</h1>
        <div className="text-xs text-neutral-500">
          Motor CAD v2 {FLAGS.v2 ? "activo" : "desactivado"} · Láser {FLAGS.laser ? "activo" : "off"} · Texto {FLAGS.text ? "activo" : "off"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <ForgeProForm
            onGenerated={(out) => {
              setStlUrl(out.stl_url || null);
              setDxfUrl(out.dxf_url || null);
              setPngUrl(out.png_url || null);
            }}
          />
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-900/5 p-3">
            <STLViewerPro url={stlUrl} className="h-[480px] w-full rounded-xl bg-black/90" />
          </div>

          {/* Preview 2D (láser) */}
          {dxfUrl && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Proyección 2D · DXF</h3>
                <a className="text-xs underline" href={dxfUrl} target="_blank">Descargar DXF</a>
              </div>
              <iframe className="mt-2 h-[360px] w-full rounded-lg border" src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(dxfUrl)}`} />
            </div>
          )}

          {/* Render PNG */}
          {pngUrl && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Render Pro</h3>
                <a className="text-xs underline" href={pngUrl} target="_blank">Descargar PNG</a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pngUrl} alt="render" className="mt-2 w-full rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
