// /components/ForgeForm.tsx
"use client";

import { useState } from "react";
import { generateSTL, type GenerateResponse } from "@/lib/api";
import STLViewer from "@/components/STLViewer";

type ModelKind = "cable_tray"; // futuros: "vesa_adapter" | "router_mount"

export default function ForgeForm() {
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // sliders
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // resultado
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const onGenerate = async () => {
    setLoading(true);
    setStlUrl(null);
    const res = await generateSTL({
      model: "cable_tray",
      width_mm: width,
      height_mm: height,
      length_mm: length,
      thickness_mm: thickness,
      ventilated,
    });
    setLastResponse(res);
    if (res.status === "ok") setStlUrl(res.stl_url);
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Modelo (por ahora sólo Cable Tray) */}
      <div>
        <label style={{ fontSize: 14, color: "#374151" }}>Modelo&nbsp;</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as ModelKind)}
          style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 8px" }}
        >
          <option value="cable_tray">Cable Tray</option>
        </select>
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gap: 12 }}>
        <Slider
          label="Ancho (mm)"
          value={width}
          min={30}
          max={120}
          step={1}
          onChange={setWidth}
        />
        <Slider
          label="Alto (mm)"
          value={height}
          min={15}
          max={60}
          step={1}
          onChange={setHeight}
        />
        <Slider
          label="Longitud (mm)"
          value={length}
          min={120}
          max={360}
          step={5}
          onChange={setLength}
        />
        <Slider
          label="Espesor (mm)"
          value={thickness}
          min={2}
          max={10}
          step={1}
          onChange={setThickness}
        />

        <label style={{ userSelect: "none", display: "inline-flex", gap: 8 }}>
          <input
            type="checkbox"
            checked={ventilated}
            onChange={(e) => setVentilated(e.target.checked)}
          />
          Con ranuras de ventilación
        </label>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              background: "#111827",
              color: "white",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111827",
            }}
          >
            {loading ? "Generando..." : "Generar STL"}
          </button>

          {stlUrl && (
            <a
              href={stlUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb", padding: "8px 0" }}
            >
              Descargar STL (en Supabase)
            </a>
          )}
        </div>
      </div>

      {/* Visor */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        {/* IMPORTANTE: convertimos null -> undefined para el tipado de la prop */}
        <STLViewer url={stlUrl || undefined} height={520} background="#ffffff" />
      </div>

      {/* JSON */}
      <details open={jsonOpen} onToggle={(e) => setJsonOpen((e.target as any).open)}>
        <summary>Ver respuesta JSON</summary>
        <pre
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            whiteSpace: "pre-wrap",
          }}
        >
{JSON.stringify(lastResponse ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, onChange } = props;
  return (
    <div>
      <label style={{ fontSize: 14, color: "#374151" }}>
        {label}: <b>{value}</b>
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
    </div>
  );
}
