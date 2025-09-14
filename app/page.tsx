"use client";

import React, { useState } from "react";
import { generateSTL, CableTrayPayload, GenerateResponse } from "@/lib/api";
import STLPreview from "@/components/STLPreview";

export default function Page() {
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(false);
  const [response, setResponse] = useState<GenerateResponse | null>(null);

  const handleGenerate = async () => {
    const payload: CableTrayPayload = {
      model: "cable_tray",
      width_mm: width,
      height_mm: height,
      length_mm: length,
      thickness_mm: thickness,
      ventilated,
    };
    const res = await generateSTL(payload);
    setResponse(res);
  };

  const stlUrl =
    response && response.status === "ok" ? response.stl_url : undefined;

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Teknovashop Forge</h1>
      <p style={{ marginBottom: 20 }}>
        Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount llegan
        en el siguiente paso.
      </p>

      <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <label>
          Ancho (mm): {width}
          <input
            type="range"
            min={10}
            max={200}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>

        <label>
          Alto (mm): {height}
          <input
            type="range"
            min={5}
            max={100}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>

        <label>
          Longitud (mm): {length}
          <input
            type="range"
            min={50}
            max={400}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>

        <label>
          Espesor (mm): {thickness}
          <input
            type="range"
            min={1}
            max={20}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={ventilated}
            onChange={(e) => setVentilated(e.target.checked)}
          />
          Con ranuras de ventilación
        </label>

        <button
          onClick={handleGenerate}
          style={{
            background: "#0f172a",
            color: "white",
            padding: "10px 14px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Generar STL
        </button>
      </div>

      {/* Enlace de descarga */}
      {stlUrl && (
        <p style={{ marginTop: 12 }}>
          <a
            href={stlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            Descargar STL (en Supabase)
          </a>
        </p>
      )}

      {/* Visor STL interactivo */}
      <div style={{ marginTop: 20 }}>
        <STLPreview url={stlUrl} height={460} background="#ffffff" />
      </div>

      {/* JSON debug */}
      {response && (
        <details style={{ marginTop: 20 }}>
          <summary>Ver respuesta JSON</summary>
          <pre
            style={{
              background: "#f9fafb",
              padding: 12,
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {JSON.stringify(response, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
