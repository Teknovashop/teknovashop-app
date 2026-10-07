"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";
import {
  createOperationId,
  type ForgeV2Operation,
  type ForgeV2OperationType,
} from "@/lib/forge-v2/spec";

type CadParams = {
  width: number;
  height: number;
  thickness: number;
  corner_radius: number;
  chamfer: number;
};

const DEFAULTS: CadParams = {
  width: 120,
  height: 80,
  thickness: 8,
  corner_radius: 5,
  chamfer: 1,
};


type CadOpKind =
  | "hole"
  | "slot"
  | "cutout_rect"
  | "cutout_circle"
  | "counterbore"
  | "pocket_rect"
  | "hole_pattern"
  | "vesa_pattern"
  | "vent_linear"
  | "vent_hex"
  | "cable_channel"
  | "rib"
  | "boss";

const CAD_OP_LABELS: Record<CadOpKind, string> = {
  hole: "Agujero",
  slot: "Ranura",
  cutout_rect: "Corte rectangular",
  cutout_circle: "Corte circular",
  counterbore: "Counterbore",
  pocket_rect: "Rebaje",
  hole_pattern: "Patrón de agujeros",
  vesa_pattern: "Patrón VESA",
  vent_linear: "Ventilación lineal",
  vent_hex: "Ventilación hexagonal",
  cable_channel: "Canal de cable",
  rib: "Nervio / refuerzo",
  boss: "Boss",
};

function createCadOperation(type: CadOpKind): ForgeV2Operation {
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
    case "pocket_rect":
      return { ...base, params: { width_mm: 24, height_mm: 16, depth_mm: 1.5 } };
    case "hole_pattern":
      return {
        ...base,
        params: {
          diameter_mm: 4,
          rows: 2,
          cols: 3,
          spacing_x_mm: 14,
          spacing_y_mm: 14,
        },
      };
    case "vesa_pattern":
      return { ...base, params: { pitch_mm: 75, diameter_mm: 5 } };
    case "vent_linear":
      return {
        ...base,
        params: { count: 5, length_mm: 30, width_mm: 3, spacing_mm: 8 },
      };
    case "vent_hex":
      return {
        ...base,
        params: { rows: 2, cols: 3, radius_mm: 3, gap_mm: 2 },
      };
    case "cable_channel":
      return { ...base, params: { length_mm: 45, width_mm: 9 } };
    case "rib":
      return { ...base, params: { length_mm: 55, width_mm: 5, height_mm: 4 } };
    case "boss":
      return { ...base, params: { diameter_mm: 14, height_mm: 4 } };
  }
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  );
}

export default function CadLabWorkspace() {
  const [params, setParams] = useState<CadParams>(DEFAULTS);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [operations, setOperations] = useState<ForgeV2Operation[]>([]);
  const [health, setHealth] = useState<{
    ok?: boolean;
    latencyMs?: number;
    engine?: string | null;
    cadqueryVersion?: string | null;
    operations?: string[];
  }>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(
    "CAD V2 aislado · no sustituye al motor estable"
  );

  const fields = useMemo(
    () => [
      ["width", "Ancho", 20, 500, 1, "mm"],
      ["height", "Alto", 20, 500, 1, "mm"],
      ["thickness", "Espesor", 2, 40, 0.5, "mm"],
      ["corner_radius", "Radio de esquina", 0, 30, 0.5, "mm"],
      ["chamfer", "Chaflán", 0, 10, 0.25, "mm"],
    ] as const,
    []
  );

  useEffect(() => {
    let active = true;
    fetch("/api/forge/cad/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => active && setHealth(data))
      .catch(() => active && setHealth({ ok: false }));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function generate() {
    setBusy(true);
    setFeedback("Generando B-Rep y triangulación STL…");
    try {
      const response = await fetch("/api/forge/cad/plate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...params, operations, format: "stl" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setFeedback("B-Rep válido → STL listo para inspección.");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar la geometría CAD");
    } finally {
      setBusy(false);
    }
  }

  async function downloadStep() {
    setBusy(true);
    setFeedback("Exportando STEP nativo…");
    try {
      const response = await fetch("/api/forge/cad/plate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...params, operations, format: "step" }),
      });
      if (!response.ok) throw new Error("No se pudo exportar STEP");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "teknovashop-cad-plate.step";
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("STEP exportado correctamente.");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo exportar STEP");
    } finally {
      setBusy(false);
    }
  }

  function addOperation(type: CadOpKind) {
    setOperations((current) => [...current, createCadOperation(type)].slice(0, 24));
    setPreviewUrl(undefined);
  }

  function removeOperation(id: string) {
    setOperations((current) => current.filter((operation) => operation.id !== id));
    setPreviewUrl(undefined);
  }

  function patchPlacement(id: string, key: "x" | "y" | "rotation_deg", value: number) {
    setOperations((current) =>
      current.map((operation) =>
        operation.id === id
          ? {
              ...operation,
              placement: { ...(operation.placement || {}), [key]: value },
            }
          : operation
      )
    );
    setPreviewUrl(undefined);
  }

  function patchParam(id: string, key: string, value: number) {
    setOperations((current) =>
      current.map((operation) =>
        operation.id === id
          ? { ...operation, params: { ...operation.params, [key]: value } }
          : operation
      )
    );
    setPreviewUrl(undefined);
  }

  return (
    <main className="min-h-screen bg-[#05101c] text-white">
      <header className="border-b border-white/10 bg-[#071321]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Teknovashop Forge · CAD Engine Lab
            </div>
            <h1 className="mt-1 text-xl font-black">
              B-Rep real · Fillet · Chamfer · STEP
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <Link
              href="/catalog"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-300 hover:bg-white/10"
            >
              ← Catálogo
            </Link>
            <Link
              href="/forge-v2/vesa-adapter"
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-cyan-100"
            >
              Forge V2 Mesh
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1680px] px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Motor" value={health.engine || "CadQuery"} />
          <Metric
            label="Estado"
            value={health.ok ? "Operativo" : "Comprobando…"}
          />
          <Metric
            label="Versión"
            value={health.cadqueryVersion || "2.8.x"}
          />
          <Metric
            label="Operaciones B-Rep"
            value={String(health.operations?.length || "—")}
          />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1680px] gap-4 px-5 pb-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.05] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
              Pieza piloto CAD
            </div>
            <div className="mt-2 text-sm font-black">Placa técnica paramétrica</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Este laboratorio valida geometría B-Rep real antes de trasladar fillets,
              chaflanes, shells, lofts y futuras exportaciones STEP al configurador V2.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {fields.map(([key, label, min, max, step, unit]) => (
              <label
                key={key}
                className="block text-[10px] font-black uppercase tracking-wide text-slate-500"
              >
                {label}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={params[key]}
                    onChange={(event) => {
                      setParams((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }));
                      setPreviewUrl(undefined);
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#071321] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                  />
                  <span className="text-xs text-slate-600">{unit}</span>
                </div>
              </label>
            ))}
          </div>

          <details className="group mt-5 rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Operaciones CAD
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="border-t border-white/10 p-3">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CAD_OP_LABELS) as CadOpKind[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addOperation(type)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] font-bold text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
                  >
                    ＋ {CAD_OP_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </details>

          {operations.length > 0 && (
            <div className="mt-4 space-y-2">
              {operations.map((operation, index) => (
                <details
                  key={operation.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.035]"
                >
                  <summary className="cursor-pointer list-none px-3 py-3 text-xs font-black">
                    {index + 1}. {CAD_OP_LABELS[operation.type as CadOpKind] || operation.type}
                  </summary>
                  <div className="border-t border-white/10 p-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(["x", "y", "rotation_deg"] as const).map((key) => (
                        <label key={key} className="text-[9px] font-bold uppercase text-slate-500">
                          {key === "rotation_deg" ? "Rotación" : key}
                          <input
                            type="number"
                            value={Number(operation.placement?.[key] || 0)}
                            onChange={(event) =>
                              patchPlacement(operation.id, key, Number(event.target.value))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-1.5 text-xs text-white"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(operation.params)
                        .filter(([, value]) => typeof value === "number")
                        .map(([key, value]) => (
                          <label key={key} className="text-[9px] font-bold uppercase text-slate-500">
                            {key.replace(/_/g, " ")}
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={Number(value)}
                              onChange={(event) =>
                                patchParam(operation.id, key, Number(event.target.value))
                              }
                              className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-1.5 text-xs text-white"
                            />
                          </label>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOperation(operation.id)}
                      className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-1.5 text-[10px] font-black text-rose-200"
                    >
                      Eliminar
                    </button>
                  </div>
                </details>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-[#04101d] transition hover:bg-cyan-200 disabled:opacity-50"
            >
              {busy ? "Procesando…" : "Generar CAD → STL"}
            </button>
            <button
              type="button"
              onClick={downloadStep}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Exportar STEP
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">{feedback}</p>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#071321] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                CAD inspection
              </div>
              <div className="mt-1 text-sm font-bold text-slate-100">
                Fillets y chaflanes generados por OpenCascade/CadQuery
              </div>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black text-emerald-200">
              Servicio Frankfurt · aislado
            </span>
          </div>
          <STLViewerPro
            url={previewUrl}
            className="h-[720px] border-0 bg-[#071321] shadow-none"
          />
        </section>
      </div>
    </main>
  );
}
