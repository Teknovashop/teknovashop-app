"use client";

import { useState } from "react";
import { generateSTL, type GenerateResponse } from "@/lib/api";
import STLViewer from "@/components/STLViewer";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

export default function ForgeForm() {
  const [kind, setKind] = useState<ModelKind>("cable_tray");

  // cable tray params
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [json, setJson] = useState<GenerateResponse | null>(null);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onGenerate = async () => {
    setLoading(true);
    setStlUrl(null);

    const payload =
      kind === "cable_tray"
        ? {
            model: "cable_tray" as const,
            width_mm: width,
            height_mm: height,
            length_mm: length,
            thickness_mm: thickness,
            ventilated
          }
        : // placeholders para futuras llamadas:
          ({
            model: "cable_tray" as const,
            width_mm: width,
            height_mm: height,
            length_mm: length,
            thickness_mm: thickness,
            ventilated
          });

    const res = await generateSTL(payload);
    setJson(res);
    if (res.status === "ok") setStlUrl(res.stl_url);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 12 }}>
        <label>
          <span>Modelo&nbsp;</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as ModelKind)}>
            <option value="cable_tray">Cable Tray</option>
            <option value="vesa_adapter" disabled>VESA Adapter (próx.)</option>
            <option value="router_mount" disabled>Router Mount (próx.)</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(140px, 1fr))", gap: 8 }}>
          <Range label="Ancho (mm)" min={10} max={200} value={width} setValue={setWidth} />
          <Range label="Alto (mm)" min={10} max={120} value={height} setValue={setHeight} />
          <Range label="Longitud (mm)" min={50} max={600} value={length} setValue={setLength} />
          <Range label="Espesor (mm)" min={2} max={10} value={thickness} setValue={setThickness} />
        </div>

        <label>
          <input type="checkbox" checked={ventilated} onChange={(e) => setVentilated(e.target.checked)} />{" "}
          Con ranuras de ventilación
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={onGenerate} disabled={loading} style={btnStyle}>
            {loading ? "Generando…" : "Generar STL"}
          </button>
          {json && json.status === "ok" && (
            <a href={json.stl_url} target="_blank" rel="noreferrer">
              Descargar STL (en Supabase)
            </a>
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <STLViewer url={stlUrl} height={520} background="#ffffff" />
      </div>

      <details style={{ marginTop: 12 }}>
        <summary>Ver respuesta JSON</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(json, null, 2)}</pre>
      </details>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  value,
  setValue
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "100px 1fr 60px", gap: 8, alignItems: "center" }}>
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(parseInt(e.target.value, 10))} />
      <code>{value}</code>
    </label>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer"
};
