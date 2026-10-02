"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";

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
  const [health, setHealth] = useState<{
    ok?: boolean;
    latencyMs?: number;
    engine?: string | null;
    cadqueryVersion?: string | null;
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  async function generate() {
    setBusy(true);
    setFeedback("Generando B-Rep y triangulación STL…");
    try {
      const response = await fetch("/api/forge/cad/plate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...params, format: "stl" }),
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
        body: JSON.stringify({ ...params, format: "step" }),
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
            label="Latencia health"
            value={
              typeof health.latencyMs === "number"
                ? `${health.latencyMs} ms`
                : "—"
            }
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
