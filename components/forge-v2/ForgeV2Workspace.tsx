"use client";

import { useMemo, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";
import {
  FORGE_V2_PILOTS,
  forgeV2Capabilities,
} from "@/lib/forge-v2/capabilities";
import {
  createOperationId,
  type ForgeV2Operation,
} from "@/lib/forge-v2/spec";

type OpKind = "hole" | "slot" | "cutout_rect";

function defaultOperation(type: OpKind): ForgeV2Operation {
  if (type === "hole") {
    return {
      id: createOperationId(),
      type,
      version: 1,
      enabled: true,
      target: { face: "top" },
      placement: { x: 0, y: 0, rotation_deg: 0 },
      params: { diameter_mm: 6 },
    };
  }
  if (type === "slot") {
    return {
      id: createOperationId(),
      type,
      version: 1,
      enabled: true,
      target: { face: "top" },
      placement: { x: 0, y: 0, rotation_deg: 0 },
      params: { length_mm: 24, width_mm: 6 },
    };
  }
  return {
    id: createOperationId(),
    type,
    version: 1,
    enabled: true,
    target: { face: "top" },
    placement: { x: 0, y: 0, rotation_deg: 0 },
    params: { width_mm: 24, height_mm: 14 },
  };
}

export default function ForgeV2Workspace({ slug }: { slug: string }) {
  const product = FORGE_V2_PILOTS[slug];
  const capabilities = useMemo(() => forgeV2Capabilities(slug), [slug]);
  const [operations, setOperations] = useState<ForgeV2Operation[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string>("Laboratorio V2 · sin cambios en V1");
  const [busy, setBusy] = useState(false);

  function add(type: OpKind) {
    setOperations((current) => [...current, defaultOperation(type)]);
  }

  function remove(id: string) {
    setOperations((current) => current.filter((op) => op.id !== id));
  }

  function patchNumber(id: string, field: "x" | "y", value: number) {
    setOperations((current) =>
      current.map((op) =>
        op.id === id
          ? {
              ...op,
              placement: { ...(op.placement || {}), [field]: value },
            }
          : op
      )
    );
  }

  async function generate() {
    setBusy(true);
    setFeedback("Validando y generando…");
    try {
      const response = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          params: {},
          operations,
          engine_version: "mesh-v2",
          schema_version: 2,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || data?.error || "Error V2");
      setPreviewUrl(data.preview_url || data.url);
      setFeedback("V2 generado · artefacto trazable registrado");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar V2");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#06111d] text-white">
      <header className="border-b border-white/10 bg-[#071321]/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Teknovashop Forge · V2 Lab
            </div>
            <h1 className="mt-1 text-xl font-black">{product.label}</h1>
          </div>
          <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[11px] font-bold text-amber-200">
            Beta aislada · V1 intacto
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-4 p-4 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Herramientas</div>
          <div className="mt-4 grid gap-2">
            {capabilities.holes && (
              <button onClick={() => add("hole")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-bold hover:bg-white/10">
                + Agujero
              </button>
            )}
            {capabilities.slots && (
              <button onClick={() => add("slot")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-bold hover:bg-white/10">
                + Ranura
              </button>
            )}
            {capabilities.cutouts && (
              <button onClick={() => add("cutout_rect")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-bold hover:bg-white/10">
                + Corte rectangular
              </button>
            )}
          </div>
          <div className="mt-6 text-xs leading-5 text-slate-400">
            La primera iteración solo expone operaciones con validación geométrica y tests automáticos.
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#071321] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <STLViewerPro url={previewUrl} className="h-[720px] border-0 bg-[#071321] shadow-none" />
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pila de operaciones</div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">{operations.length}/24</span>
          </div>

          <div className="mt-4 space-y-3">
            {operations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">
                Añade una operación desde la columna izquierda.
              </div>
            )}
            {operations.map((op, index) => (
              <div key={op.id} className="rounded-2xl border border-white/10 bg-[#0b1d30] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black">{index + 1}. {op.type}</div>
                  <button onClick={() => remove(op.id)} className="text-xs font-bold text-rose-300 hover:text-rose-200">Eliminar</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["x", "y"] as const).map((key) => (
                    <label key={key} className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {key} mm
                      <input
                        type="number"
                        value={Number(op.placement?.[key] || 0)}
                        onChange={(event) => patchNumber(op.id, key, Number(event.target.value))}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 font-mono text-[10px] leading-5 text-slate-400">
                  {JSON.stringify(op.params)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-[#04101d] transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy ? "Generando…" : "Validar y generar V2"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-400">{feedback}</p>
        </aside>
      </div>
    </main>
  );
}
