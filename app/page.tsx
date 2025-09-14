"use client";

import "./globals.css";
import React, { useMemo, useState } from "react";
import STLPreview from "../components/STLPreview";
import { generateSTL, type GenerateResponse } from "../lib/api";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

export default function Page() {
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Parámetros del Cable Tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const stlUrl = useMemo(
    () => (resp && resp.status === "ok" ? resp.stl_url : undefined),
    [resp]
  );

  const handleGenerate = async () => {
    if (model !== "cable_tray") {
      alert("De momento solo Cable Tray genera STL. VESA y Router Mount quedan listos en UI.");
      return;
    }
    setLoading(true);
    setResp(null);

    const payload = {
      model: "cable_tray" as const,
      width_mm: width,
      height_mm: height,
      length_mm: length,
      thickness_mm: thickness,
      ventilated
    };

    const r = await generateSTL(payload);
    setResp(r);
    setLoading(false);
  };

  return (
    <main className="container">
      <h1 style={{ marginBottom: 6 }}>Teknovashop Forge</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Generador paramétrico (v1). Cable Tray operativo. VESA y Router Mount quedarán listos en la UI.
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Modelo</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelKind)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            <option value="cable_tray">Cable Tray</option>
            <option value="vesa_adapter">VESA Adapter (próximamente)</option>
            <option value="router_mount">Router Mount (próximamente)</option>
          </select>
        </div>

        {model === "cable_tray" && (
          <>
            <div className="row">
              <div>
                <label>Ancho (mm): {width}</label>
                <input type="range" min={30} max={300} value={width} onChange={(e) => setWidth(+e.target.value)} />
              </div>
              <div>
                <label>Alto (mm): {height}</label>
                <input type="range" min={10} max={200} value={height} onChange={(e) => setHeight(+e.target.value)} />
              </div>
              <div>
                <label>Longitud (mm): {length}</label>
                <input type="range" min={60} max={1200} value={length} onChange={(e) => setLength(+e.target.value)} />
              </div>
              <div>
                <label>Espesor (mm): {thickness}</label>
                <input type="range" min={2} max={10} value={thickness} onChange={(e) => setThickness(+e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label>
                <input
                  type="checkbox"
                  checked={ventilated}
                  onChange={(e) => setVentilated(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Con ranuras de ventilación
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <button onClick={handleGenerate} disabled={loading}>
                {loading ? "Generando…" : "Generar STL"}
              </button>

              {resp && resp.status === "ok" && (
                <a href={resp.stl_url} target="_blank" rel="noreferrer">
                  Descargar STL (en Supabase)
                </a>
              )}
            </div>
          </>
        )}

        {/* Visor */}
        <div style={{ marginTop: 16 }}>
          <STLPreview url={stlUrl} height={560} background="#ffffff" showEdges />
        </div>

        {/* JSON */}
        <div style={{ marginTop: 12 }}>
          <details>
            <summary>Ver respuesta JSON</summary>
            <pre>{resp ? JSON.stringify(resp, null, 2) : "{}"}</pre>
          </details>
        </div>

        <hr />
        <small className="muted">
          Backend: <code>{process.env.NEXT_PUBLIC_BACKEND_URL ?? "NO CONFIGURADO"}</code>
        </small>
      </div>
    </main>
  );
}
