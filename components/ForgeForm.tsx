// components/ForgeForm.tsx
"use client";

import { useState } from "react";
import { generateSTL, type GenerateResponse } from "@/lib/api";
import STLViewer from "@/components/STLViewer";

type ModelKind = "cable_tray"; // dejamos el resto para el siguiente paso

export default function ForgeForm() {
  // Estado de parámetros
  const [model] = useState<ModelKind>("cable_tray");

  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [jsonOpen, setJsonOpen] = useState(true);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const stlUrl = resp && resp.status === "ok" ? resp.stl_url : undefined;

  const [loading, setLoading] = useState(false);

  async function onGenerate() {
    try {
      setLoading(true);
      setResp(null);
      const payload = {
        model: "cable_tray" as const,
        width_mm: width,
        height_mm: height,
        length_mm: length,
        thickness_mm: thickness,
        ventilated,
      };
      const r = await generateSTL(payload);
      setResp(r);
    } catch (err) {
      setResp({ status: "error", detail: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      {/* Panel Izquierdo: Controles */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "#fff",
          position: "sticky",
          top: 84,
        }}
      >
        <div style={{ marginBottom: 12, color: "#111827", fontWeight: 600 }}>
          Parámetros
        </div>

        {/* Sliders */}
        <Field label="Ancho (mm)" value={width} onChange={setWidth} min={40} max={120} />
        <Field label="Alto (mm)" value={height} onChange={setHeight} min={15} max={60} />
        <Field label="Longitud (mm)" value={length} onChange={setLength} min={120} max={360} />
        <Field label="Espesor (mm)" value={thickness} onChange={setThickness} min={2} max={8} />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            color: "#111827",
          }}
        >
          <input
            type="checkbox"
            checked={ventilated}
            onChange={(e) => setVentilated(e.target.checked)}
          />
          Con ranuras de ventilación
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              background: "#111827",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Generando…" : "Generar STL"}
          </button>

          <a
            href={
              stlUrl ??
              "https://ewglrecvdhnsniqauqjh.supabase.co" // placeholder desactivado
            }
            target="_blank"
            rel="noreferrer"
            style={{
              color: stlUrl ? "#111827" : "#9ca3af",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              pointerEvents: stlUrl ? "auto" : "none",
              background: "#fff",
            }}
          >
            Descargar STL (en Supabase)
          </a>
        </div>

        {/* JSON */}
        <details
          open={jsonOpen}
          onToggle={(e) => setJsonOpen((e.target as HTMLDetailsElement).open)}
          style={{ marginTop: 16 }}
        >
          <summary
            style={{ color: "#111827", cursor: "pointer", marginBottom: 8 }}
          >
            Ver respuesta JSON
          </summary>
          <pre
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 12,
              background: "#f9fafb",
              color: "#111827",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 220,
              overflow: "auto",
            }}
          >
{JSON.stringify(resp ?? { status: "…" }, null, 2)}
          </pre>
        </details>
      </div>

      {/* Panel Derecho: Visor */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 12, color: "#6b7280" }}>
          {stlUrl ? "Listo" : "Genera o selecciona un STL para previsualizarlo"}
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb" }}>
          <STLViewer
            url={stlUrl}
            height={520}
            background="#ffffff"
            // el color del modelo ahora va dentro del STLViewer (si lo implementas)
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <label style={{ color: "#111827" }}>{label}</label>
        <span style={{ color: "#6b7280" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
    </div>
  );
}
