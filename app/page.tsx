"use client";

import React, { useMemo, useState } from "react";
import STLPreview from "@/components/STLPreview";
import { generateSTL, type GenerateResponse } from "@/lib/api";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

export default function HomePage() {
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Cable tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // VESA (UI preparada)
  const [vesaW, setVesaW] = useState(180);
  const [vesaH, setVesaH] = useState(180);
  const [vesaT, setVesaT] = useState(6);
  const [vesaPattern, setVesaPattern] = useState("100x100");

  // Router mount (UI preparada)
  const [rmW, setRmW] = useState(160);
  const [rmH, setRmH] = useState(220);
  const [rmD, setRmD] = useState(40);
  const [rmT, setRmT] = useState(4);

  const [stlUrl, setStlUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<GenerateResponse | null>(null);

  const canGenerate = model === "cable_tray"; // por ahora solo cable_tray en backend

  const onGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setStlUrl(undefined);
    try {
      const payload = {
        model: "cable_tray" as const,
        width_mm: width,
        height_mm: height,
        length_mm: length,
        thickness_mm: thickness,
        ventilated,
      };
      const res = await generateSTL(payload);
      setLastResponse(res);
      if (res.status === "ok") {
        setStlUrl(res.stl_url);
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadHref = useMemo(() => {
    return lastResponse && lastResponse.status === "ok" ? lastResponse.stl_url : undefined;
  }, [lastResponse]);

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Teknovashop Forge</h1>
      <p style={{ marginBottom: 16 }}>
        Generador paramétrico (v1). <b>Cable Tray</b> listo; <b>VESA</b> y <b>Router Mount</b> quedan preparados en la UI.
      </p>

      {/* Selector de modelo */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>Modelo</label>
        <select value={model} onChange={(e) => setModel(e.target.value as ModelKind)}>
          <option value="cable_tray">Cable Tray</option>
          <option value="vesa_adapter">VESA Adapter (UI)</option>
          <option value="router_mount">Router Mount (UI)</option>
        </select>
      </div>

      {/* Panel de parámetros */}
      {model === "cable_tray" && (
        <section style={{ marginBottom: 12 }}>
          <LabeledRange label="Ancho (mm)" value={width} setValue={setWidth} min={30} max={200} />
          <LabeledRange label="Alto (mm)" value={height} setValue={setHeight} min={15} max={80} />
          <LabeledRange label="Longitud (mm)" value={length} setValue={setLength} min={80} max={400} />
          <LabeledRange label="Espesor (mm)" value={thickness} setValue={setThickness} min={2} max={10} />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={ventilated} onChange={(e) => setVentilated(e.target.checked)} /> Con ranuras de
            ventilación
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button onClick={onGenerate} disabled={busy} style={btn}>
              {busy ? "Generando…" : "Generar STL"}
            </button>
            {downloadHref && (
              <a href={downloadHref} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                Descargar STL (en Supabase)
              </a>
            )}
          </div>
        </section>
      )}

      {model === "vesa_adapter" && (
        <section style={{ marginBottom: 12 }}>
          <LabeledRange label="Ancho (mm)" value={vesaW} setValue={setVesaW} min={100} max={300} />
          <LabeledRange label="Alto (mm)" value={vesaH} setValue={setVesaH} min={100} max={300} />
          <LabeledRange label="Espesor (mm)" value={vesaT} setValue={setVesaT} min={3} max={12} />
          <div style={{ marginTop: 6 }}>
            <label>Patrón agujeros: </label>{" "}
            <select value={vesaPattern} onChange={(e) => setVesaPattern(e.target.value)}>
              <option value="75x75">75 × 75</option>
              <option value="100x100">100 × 100</option>
              <option value="100x200">100 × 200</option>
              <option value="200x200">200 × 200</option>
            </select>
          </div>
          <p style={{ color: "#6b7280", marginTop: 8 }}>Backend pendiente. El botón se activará cuando esté el endpoint.</p>
          <button disabled style={{ ...btn, opacity: 0.6, cursor: "not-allowed" }}>
            Generar STL
          </button>
        </section>
      )}

      {model === "router_mount" && (
        <section style={{ marginBottom: 12 }}>
          <LabeledRange label="Ancho base (mm)" value={rmW} setValue={setRmW} min={120} max={280} />
          <LabeledRange label="Alto base (mm)" value={rmH} setValue={setRmH} min={120} max={300} />
          <LabeledRange label="Fondo (mm)" value={rmD} setValue={setRmD} min={30} max={100} />
          <LabeledRange label="Espesor (mm)" value={rmT} setValue={setRmT} min={3} max={12} />
          <p style={{ color: "#6b7280", marginTop: 8 }}>Backend pendiente. El botón se activará cuando esté el endpoint.</p>
          <button disabled style={{ ...btn, opacity: 0.6, cursor: "not-allowed" }}>
            Generar STL
          </button>
        </section>
      )}

      {/* Visor */}
      <div style={{ marginTop: 12 }}>
        <STLPreview url={stlUrl} height={540} background="#ffffff" />
      </div>

      {/* JSON */}
      <details style={{ marginTop: 16 }} open={jsonOpen} onToggle={(e) => setJsonOpen((e.target as any).open)}>
        <summary>Ver respuesta JSON</summary>
        <pre
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            padding: 12,
            borderRadius: 8,
            overflow: "auto",
          }}
        >
{JSON.stringify(lastResponse ?? {}, null, 2)}
        </pre>
      </details>
    </main>
  );
}

function LabeledRange({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ minWidth: 110 }}>{label}</label>
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ width: 220 }}
        />
        <span style={{ width: 48 }}>{value}</span>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontWeight: 600,
};
