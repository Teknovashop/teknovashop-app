"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";
import { DEFAULT_PARAMS, FIELDS } from "@/lib/forge-config";
import {
  FORGE_V2_PILOTS,
  forgeV2Capabilities,
} from "@/lib/forge-v2/capabilities";
import {
  createOperationId,
  type ForgeV2Operation,
  type ForgeV2OperationType,
} from "@/lib/forge-v2/spec";

type OpKind =
  | "hole"
  | "slot"
  | "cutout_rect"
  | "cutout_circle"
  | "counterbore"
  | "hole_pattern"
  | "vesa_pattern"
  | "vent_linear"
  | "vent_hex"
  | "cable_channel"
  | "rib"
  | "wave_ribs";

type Params = Record<string, number | string | boolean>;

const LABELS: Record<OpKind, string> = {
  hole: "Agujero",
  slot: "Ranura",
  cutout_rect: "Corte rectangular",
  cutout_circle: "Corte circular",
  counterbore: "Agujero con rebaje",
  hole_pattern: "Patrón de agujeros",
  vesa_pattern: "Patrón VESA",
  vent_linear: "Ventilación lineal",
  vent_hex: "Rejilla hexagonal",
  cable_channel: "Canal de cable",
  rib: "Refuerzo",
  wave_ribs: "Ondulación estructural",
};

const PRESETS: Record<string, Array<{ name: string; copy: string; params: Params }>> = {
  "cable-tray": [
    { name: "Minimal", copy: "Compacta y ligera", params: { width: 180, depth: 60, height: 40, wall: 3 } },
    { name: "Office", copy: "Equilibrada para escritorio", params: { width: 220, depth: 80, height: 50, wall: 4 } },
    { name: "Heavy", copy: "Más volumen y pared", params: { width: 280, depth: 95, height: 60, wall: 5 } },
  ],
  "vesa-adapter": [
    { name: "75 → 100", copy: "Adaptación habitual", params: { width: 120, height: 120, thickness: 5, pattern_from: 75, pattern_to: 100, hole_d: 5 } },
    { name: "100 → 200", copy: "Placa reforzada", params: { width: 220, height: 220, thickness: 6, pattern_from: 100, pattern_to: 200, hole_d: 5 } },
  ],
  "enclosure-ip65": [
    { name: "Compact", copy: "Electrónica pequeña", params: { length: 100, width: 60, height: 38, wall: 3, lid_thickness: 3, lid_gap: 2 } },
    { name: "Standard", copy: "Uso general", params: { length: 120, width: 68, height: 45, wall: 3, lid_thickness: 3, lid_gap: 2 } },
    { name: "Workshop", copy: "Más espacio interior", params: { length: 160, width: 90, height: 60, wall: 4, lid_thickness: 4, lid_gap: 2 } },
  ],
};

function defaultOperation(type: OpKind): ForgeV2Operation {
  const base = {
    id: createOperationId(),
    type: type as ForgeV2OperationType,
    version: 1 as const,
    enabled: true,
    target: { face: "top" as const },
    placement: { x: 0, y: 0, rotation_deg: 0 },
  };

  switch (type) {
    case "hole":
      return { ...base, params: { diameter_mm: 6 } };
    case "slot":
      return { ...base, params: { length_mm: 24, width_mm: 6 } };
    case "cutout_rect":
      return { ...base, params: { width_mm: 24, height_mm: 14 } };
    case "cutout_circle":
      return { ...base, params: { diameter_mm: 18 } };
    case "counterbore":
      return {
        ...base,
        params: {
          through_diameter_mm: 5,
          bore_diameter_mm: 10,
          bore_depth_mm: 2,
        },
      };
    case "hole_pattern":
      return {
        ...base,
        params: {
          diameter_mm: 4,
          rows: 2,
          cols: 2,
          spacing_x_mm: 18,
          spacing_y_mm: 18,
        },
      };
    case "vesa_pattern":
      return { ...base, params: { pitch_mm: 75, diameter_mm: 5 } };
    case "vent_linear":
      return {
        ...base,
        params: { count: 5, length_mm: 32, width_mm: 3, spacing_mm: 7 },
      };
    case "vent_hex":
      return {
        ...base,
        params: { rows: 2, cols: 3, radius_mm: 3, gap_mm: 2 },
      };
    case "cable_channel":
      return { ...base, params: { length_mm: 28, width_mm: 7 } };
    case "rib":
      return { ...base, params: { length_mm: 30, width_mm: 4, height_mm: 4 } };
    case "wave_ribs":
      return {
        ...base,
        params: {
          length_mm: 36,
          rib_width_mm: 2,
          amplitude_mm: 4,
          count: 5,
          spacing_mm: 5,
        },
      };
  }
}

function ToolButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-bold transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
    >
      <span>{label}</span>
      <span className="text-cyan-300 transition group-hover:translate-x-0.5">＋</span>
    </button>
  );
}

export default function ForgeV2Workspace({ slug }: { slug: string }) {
  const product = FORGE_V2_PILOTS[slug];
  const capabilities = useMemo(() => forgeV2Capabilities(slug), [slug]);
  const fields = useMemo(
    () => ((FIELDS as unknown as Record<string, Record<string, any>>)[slug] || {}),
    [slug]
  );
  const baseParams = useMemo(
    () => ({ ...((DEFAULT_PARAMS as unknown as Record<string, Params>)[slug] || {}) }),
    [slug]
  );

  const [params, setParams] = useState<Params>(baseParams);
  const [operations, setOperations] = useState<ForgeV2Operation[]>([]);
  const [history, setHistory] = useState<ForgeV2Operation[][]>([]);
  const [future, setFuture] = useState<ForgeV2Operation[][]>([]);
  const [issues, setIssues] = useState<
    Array<{ code: string; message: string; level: string }>
  >([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [feedback, setFeedback] = useState(
    "Laboratorio V2 · producción permanece en V1"
  );
  const [busy, setBusy] = useState(false);
  const validationSeq = useRef(0);

  function commit(next: ForgeV2Operation[]) {
    setHistory((items) => [...items.slice(-29), operations]);
    setFuture([]);
    setOperations(next);
  }

  function add(type: OpKind) {
    commit([...operations, defaultOperation(type)]);
  }

  function remove(id: string) {
    commit(operations.filter((op) => op.id !== id));
  }

  function duplicate(id: string) {
    const source = operations.find((op) => op.id === id);
    if (!source) return;
    const copy: ForgeV2Operation = {
      ...source,
      id: createOperationId(),
      placement: {
        ...(source.placement || {}),
        x: Number(source.placement?.x || 0) + 5,
      },
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
    const previous = history.length ? history[history.length - 1] : undefined;
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

  function patchPlacement(
    id: string,
    field: "x" | "y" | "rotation_deg",
    value: number
  ) {
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

  function applyPreset(preset: { params: Params }) {
    setParams((current) => ({ ...current, ...preset.params }));
    setPreviewUrl(undefined);
    setFeedback("Preset aplicado · genera para validar la geometría final");
  }

  useEffect(() => {
    const seq = ++validationSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/forge/v2/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, params, operations }),
        });
        const data = await response.json().catch(() => ({}));
        if (seq !== validationSeq.current) return;
        setIssues(Array.isArray(data?.issues) ? data.issues : []);
      } catch {
        if (seq === validationSeq.current) {
          setIssues([
            {
              code: "validation",
              message: "Validación temporalmente no disponible",
              level: "warning",
            },
          ]);
        }
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [operations, params, slug]);

  async function generate() {
    setBusy(true);
    setFeedback("Validando y generando…");
    try {
      const response = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          params,
          operations,
          engine_version: "mesh-v2",
          schema_version: 2,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.detail || data?.error || "Error V2");
      setPreviewUrl(data.preview_url || data.url);
      setFeedback("V2 generado · artefacto trazable registrado");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar V2");
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = issues.some((issue) => issue.level === "error");
  const presets = PRESETS[slug] || [];

  return (
    <main className="min-h-screen bg-[#06111d] text-white">
      <header className="border-b border-white/10 bg-[#071321]/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Teknovashop Forge · V2 Lab
            </div>
            <h1 className="mt-1 text-xl font-black">{product.label}</h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              mesh-v2 · schema 2
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200">
              Preview aislado · V1 intacto
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <button
            disabled={!history.length}
            onClick={undo}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
          >
            ↶ Undo
          </button>
          <button
            disabled={!future.length}
            onClick={redo}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
          >
            ↷ Redo
          </button>
        </div>
        <div
          className={
            "rounded-full px-3 py-1.5 text-[11px] font-black " +
            (hasErrors
              ? "bg-rose-400/10 text-rose-200"
              : "bg-emerald-400/10 text-emerald-200")
          }
        >
          {hasErrors ? `${issues.length} incidencias` : "Geometría válida"}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1680px] gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_390px]">
        <aside className="max-h-[calc(100vh-132px)] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <details className="group rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Dimensiones
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="border-t border-white/10 p-3">
              <div className="grid gap-3">
                {Object.entries(fields).map(([key, field]) => (
                  <label
                    key={key}
                    className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    {field.label || key}
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={Number(params[key] ?? field.defaultValue ?? 0)}
                        onChange={(event) =>
                          setParams((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                      <span className="text-[10px] text-slate-600">mm</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </details>

          {presets.length > 0 && (
            <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
                <span className="flex items-center justify-between">
                  Presets
                  <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/5"
                  >
                    <div className="text-xs font-black text-white">{preset.name}</div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">
                      {preset.copy}
                    </div>
                  </button>
                ))}
              </div>
            </details>
          )}

          <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Agujeros y cortes
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="grid gap-2 border-t border-white/10 p-3">
              {capabilities.holes && (
                <ToolButton label="Agujero" onClick={() => add("hole")} />
              )}
              {capabilities.slots && (
                <ToolButton label="Ranura" onClick={() => add("slot")} />
              )}
              {capabilities.cutouts && (
                <>
                  <ToolButton
                    label="Corte rectangular"
                    onClick={() => add("cutout_rect")}
                  />
                  <ToolButton
                    label="Corte circular"
                    onClick={() => add("cutout_circle")}
                  />
                </>
              )}
              {capabilities.holes && (
                <ToolButton
                  label="Agujero con rebaje"
                  onClick={() => add("counterbore")}
                />
              )}
              {capabilities.holePatterns && (
                <ToolButton
                  label="Patrón de agujeros"
                  onClick={() => add("hole_pattern")}
                />
              )}
              {Array.isArray(capabilities.mountingPatterns) &&
                capabilities.mountingPatterns.includes("vesa") && (
                  <ToolButton
                    label="Patrón VESA"
                    onClick={() => add("vesa_pattern")}
                  />
                )}
            </div>
          </details>

          {(capabilities.vents || capabilities.cableChannels || capabilities.ribs) && (
            <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
                <span className="flex items-center justify-between">
                  Funciones avanzadas
                  <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-3">
                {Array.isArray(capabilities.vents) &&
                  capabilities.vents.includes("linear") && (
                    <ToolButton
                      label="Ventilación lineal"
                      onClick={() => add("vent_linear")}
                    />
                  )}
                {Array.isArray(capabilities.vents) &&
                  capabilities.vents.includes("hex") && (
                    <ToolButton
                      label="Rejilla hexagonal"
                      onClick={() => add("vent_hex")}
                    />
                  )}
                {capabilities.cableChannels && (
                  <ToolButton
                    label="Canal de cable"
                    onClick={() => add("cable_channel")}
                  />
                )}
                {capabilities.ribs && (
                  <ToolButton label="Refuerzo" onClick={() => add("rib")} />
                )}
                {capabilities.waves && (
                  <ToolButton
                    label="Ondulación estructural"
                    onClick={() => add("wave_ribs")}
                  />
                )}
              </div>
            </details>
          )}

          <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3 text-[11px] leading-5 text-slate-400">
            Todas las secciones se mantienen cerradas al entrar. Solo aparecen
            herramientas que el contrato de esta pieza declara compatibles.
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#071321] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <STLViewerPro
            url={previewUrl}
            className="h-[720px] border-0 bg-[#071321] shadow-none"
          />
        </section>

        <aside className="max-h-[calc(100vh-132px)] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Pila de operaciones
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              {operations.length}/24
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {operations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs leading-5 text-slate-500">
                Abre una sección de herramientas y añade una operación. La
                configuración seguirá siendo editable y reversible.
              </div>
            )}
            {operations.map((op, index) => (
              <details
                key={op.id}
                className="group rounded-2xl border border-white/10 bg-[#0b1d30]"
              >
                <summary className="cursor-pointer list-none p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black">
                      {index + 1}. {LABELS[op.type as OpKind] || op.type}
                    </span>
                    <span
                      className={
                        "h-2 w-2 rounded-full " +
                        (op.enabled ? "bg-emerald-300" : "bg-slate-600")
                      }
                    />
                  </span>
                </summary>
                <div className="border-t border-white/10 p-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => move(op.id, -1)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(op.id, 1)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(op.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-cyan-300"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(op.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-rose-300"
                    >
                      Eliminar
                    </button>
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={op.enabled}
                      onChange={() => toggle(op.id)}
                      className="accent-cyan-300"
                    />
                    Operación activa
                  </label>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["x", "y", "rotation_deg"] as const).map((key) => (
                      <label
                        key={key}
                        className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
                      >
                        {key === "rotation_deg" ? "Rotación" : `${key} mm`}
                        <input
                          type="number"
                          value={Number(op.placement?.[key] || 0)}
                          onChange={(event) =>
                            patchPlacement(op.id, key, Number(event.target.value))
                          }
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(op.params)
                      .filter(([, value]) => typeof value === "number")
                      .map(([key, value]) => (
                        <label
                          key={key}
                          className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
                        >
                          {key.split("_").join(" ")}
                          <input
                            type="number"
                            value={Number(value)}
                            min={0}
                            step={0.5}
                            onChange={(event) =>
                              patchParam(op.id, key, Number(event.target.value))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                          />
                        </label>
                      ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          {issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={issue.code + index}
                  className={
                    "rounded-xl border px-3 py-2 text-xs leading-5 " +
                    (issue.level === "error"
                      ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                      : "border-amber-300/20 bg-amber-400/10 text-amber-200")
                  }
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={busy || hasErrors}
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
