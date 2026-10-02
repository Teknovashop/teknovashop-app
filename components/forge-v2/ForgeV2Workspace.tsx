"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [history, setHistory] = useState<ForgeV2Operation[][]>([]);
  const [future, setFuture] = useState<ForgeV2Operation[][]>([]);
  const [issues, setIssues] = useState<Array<{ code: string; message: string; level: string }>>([]);
  const validationSeq = useRef(0);

  function commit(next: ForgeV2Operation[]) {
    setHistory((items) => [...items.slice(-29), operations]);
    setFuture([]);
    setOperations(next);
  }
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string>("Laboratorio V2 · sin cambios en V1");
  const [busy, setBusy] = useState(false);

  function add(type: OpKind) {
    commit([...operations, defaultOperation(type)]);
  }

  function remove(id: string) {
    commit(operations.filter((op) => op.id !== id));
  }

  function duplicate(id: string) {
    const source = operations.find((op) => op.id === id);
    if (!source) return;
    const copy = {
      ...source,
      id: createOperationId(),
      placement: { ...(source.placement || {}), x: Number(source.placement?.x || 0) + 5 },
      params: { ...source.params },
    };
    const index = operations.findIndex((op) => op.id === id);
    const next = [...operations];
    next.splice(index + 1, 0, copy);
    commit(next);
  }

  function toggle(id: string) {
    commit(
      operations.map((op) =>
        op.id === id ? { ...op, enabled: !op.enabled } : op
      )
    );
  }

  function move(id: string, delta: number) {
    const index = operations.findIndex((op) => op.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= operations.length) return;
    const next = [...operations];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [operations, ...items].slice(0, 30));
    setOperations(previous);
    setHistory((items) => items.slice(0, -1));
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items.slice(-29), operations]);
    setOperations(next);
    setFuture((items) => items.slice(1));
  }

  function patchNumber(id: string, field: "x" | "y", value: number) {
    commit(
      operations.map((op) =>
        op.id === id
          ? {
              ...op,
              placement: { ...(op.placement || {}), [field]: value },
            }
          : op
      )
    );
  }

  function patchParam(id: string, key: string, value: number) {
    commit(
      operations.map((op) =>
        op.id === id
          ? { ...op, params: { ...op.params, [key]: value } }
          : op
      )
    );
  }

  useEffect(() => {
    const seq = ++validationSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/forge/v2/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, params: {}, operations }),
        });
        const data = await response.json().catch(() => ({}));
        if (seq !== validationSeq.current) return;
        setIssues(Array.isArray(data?.issues) ? data.issues : []);
      } catch {
        if (seq === validationSeq.current) {
          setIssues([{ code: "validation", message: "Validación temporalmente no disponible", level: "warning" }]);
        }
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [operations, slug]);

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

      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <button disabled={!history.length} onClick={undo} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30">↶ Undo</button>
          <button disabled={!future.length} onClick={redo} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30">↷ Redo</button>
        </div>
        <div className={"rounded-full px-3 py-1.5 text-[11px] font-black " + (issues.some((x) => x.level === "error") ? "bg-rose-400/10 text-rose-200" : "bg-emerald-400/10 text-emerald-200")}>
          {issues.some((x) => x.level === "error") ? `${issues.length} incidencias` : "Geometría válida"}
        </div>
      </div>

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
                  <div className="flex gap-1">
                    <button onClick={() => move(op.id, -1)} className="rounded px-1.5 text-xs text-slate-400 hover:bg-white/10">↑</button>
                    <button onClick={() => move(op.id, 1)} className="rounded px-1.5 text-xs text-slate-400 hover:bg-white/10">↓</button>
                    <button onClick={() => duplicate(op.id)} className="rounded px-1.5 text-xs text-cyan-300 hover:bg-white/10">Duplicar</button>
                    <button onClick={() => remove(op.id)} className="rounded px-1.5 text-xs font-bold text-rose-300 hover:bg-white/10">Eliminar</button>
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={op.enabled} onChange={() => toggle(op.id)} className="accent-cyan-300" />
                  Operación activa
                </label>
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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {Object.entries(op.params).filter(([, value]) => typeof value === "number").map(([key, value]) => (
                    <label key={key} className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {key.replaceAll("_", " ")}
                      <input
                        type="number"
                        value={Number(value)}
                        min={0}
                        step={0.5}
                        onChange={(event) => patchParam(op.id, key, Number(event.target.value))}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {issues.map((issue, index) => (
                <div key={issue.code + index} className={"rounded-xl border px-3 py-2 text-xs leading-5 " + (issue.level === "error" ? "border-rose-300/20 bg-rose-400/10 text-rose-200" : "border-amber-300/20 bg-amber-400/10 text-amber-200")}>
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={generate}
            disabled={busy || issues.some((issue) => issue.level === "error")}
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
