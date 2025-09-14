"use client";

import React, { useMemo, useState } from "react";
import STLPreview from "@/components/STLPreview";
import {
  generateSTL,
  CableTrayPayload,
  VesaAdapterPayload,
  RouterMountPayload,
  GenerateResponse,
} from "@/lib/api";

type ModelKey = "cable_tray" | "vesa_adapter" | "router_mount";

export default function Page() {
  const [model, setModel] = useState<ModelKey>("cable_tray");

  // Cable Tray
  const [ctWidth, setCtWidth] = useState(60);
  const [ctHeight, setCtHeight] = useState(25);
  const [ctLength, setCtLength] = useState(180);
  const [ctThickness, setCtThickness] = useState(3);
  const [ctVent, setCtVent] = useState(true);

  // VESA
  const [vaWidth, setVaWidth] = useState(180);
  const [vaHeight, setVaHeight] = useState(180);
  const [vaThickness, setVaThickness] = useState(6);
  const [vaPattern, setVaPattern] = useState<"75x75" | "100x100" | "200x200">(
    "100x100"
  );

  // Router Mount
  const [rmBaseW, setRmBaseW] = useState(160);
  const [rmBaseH, setRmBaseH] = useState(220);
  const [rmDepth, setRmDepth] = useState(40);
  const [rmThickness, setRmThickness] = useState(4);

  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const stlUrl = useMemo(
    () => (resp && resp.status === "ok" ? resp.stl_url : undefined),
    [resp]
  );

  const onGenerate = async () => {
    setResp(null);

    if (model === "cable_tray") {
      const payload: CableTrayPayload = {
        model: "cable_tray",
        width_mm: ctWidth,
        height_mm: ctHeight,
        length_mm: ctLength,
        thickness_mm: ctThickness,
        ventilated: ctVent,
      };
      const r = await generateSTL(payload);
      setResp(r);
    }

    if (model === "vesa_adapter") {
      // Cuando actives el endpoint en backend, bastará con descomentar:
      const payload: VesaAdapterPayload = {
        model: "vesa_adapter",
        width_mm: vaWidth,
        height_mm: vaHeight,
        thickness_mm: vaThickness,
        pattern: vaPattern,
      };
      const r = await generateSTL(payload);
      setResp(r);
    }

    if (model === "router_mount") {
      // Igual aquí cuando esté activo:
      const payload: RouterMountPayload = {
        model: "router_mount",
        base_width_mm: rmBaseW,
        base_height_mm: rmBaseH,
        depth_mm: rmDepth,
        thickness_mm: rmThickness,
      };
      const r = await generateSTL(payload);
      setResp(r);
    }
  };

  const generatorDisabled =
    (model === "vesa_adapter" || model === "router_mount") &&
    false /* pon true para desactivar si el backend aún no está listo */;

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
        Teknovashop Forge
      </h1>
      <p style={{ marginBottom: 18 }}>
        Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount ya
        preparados en la UI.
      </p>

      {/* Selector de modelo */}
      <div style={{ marginBottom: 14 }}>
        <label>
          <span style={{ marginRight: 8 }}>Modelo</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelKey)}
          >
            <option value="cable_tray">Cable Tray</option>
            <option value="vesa_adapter">VESA Adapter</option>
            <option value="router_mount">Router Mount</option>
          </select>
        </label>
      </div>

      {/* Formularios por modelo */}
      {model === "cable_tray" && (
        <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
          <label>
            Ancho (mm): {ctWidth}
            <input
              type="range"
              min={10}
              max={300}
              value={ctWidth}
              onChange={(e) => setCtWidth(+e.target.value)}
            />
          </label>
          <label>
            Alto (mm): {ctHeight}
            <input
              type="range"
              min={5}
              max={120}
              value={ctHeight}
              onChange={(e) => setCtHeight(+e.target.value)}
            />
          </label>
          <label>
            Longitud (mm): {ctLength}
            <input
              type="range"
              min={50}
              max={600}
              value={ctLength}
              onChange={(e) => setCtLength(+e.target.value)}
            />
          </label>
          <label>
            Espesor (mm): {ctThickness}
            <input
              type="range"
              min={1}
              max={20}
              value={ctThickness}
              onChange={(e) => setCtThickness(+e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={ctVent}
              onChange={(e) => setCtVent(e.target.checked)}
            />{" "}
            Con ranuras de ventilación
          </label>
        </div>
      )}

      {model === "vesa_adapter" && (
        <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
          <label>
            Ancho (mm): {vaWidth}
            <input
              type="range"
              min={100}
              max={400}
              value={vaWidth}
              onChange={(e) => setVaWidth(+e.target.value)}
            />
          </label>
          <label>
            Alto (mm): {vaHeight}
            <input
              type="range"
              min={100}
              max={400}
              value={vaHeight}
              onChange={(e) => setVaHeight(+e.target.value)}
            />
          </label>
          <label>
            Espesor (mm): {vaThickness}
            <input
              type="range"
              min={2}
              max={20}
              value={vaThickness}
              onChange={(e) => setVaThickness(+e.target.value)}
            />
          </label>
          <label>
            Patrón agujeros
            <select
              value={vaPattern}
              onChange={(e) =>
                setVaPattern(e.target.value as "75x75" | "100x100" | "200x200")
              }
            >
              <option value="75x75">75 × 75</option>
              <option value="100x100">100 × 100</option>
              <option value="200x200">200 × 200</option>
            </select>
          </label>
          <small style={{ color: "#64748b" }}>
            Nota: si tu backend aún no implementa este modelo, puedes dejar
            inactivo el botón o reutilizar el endpoint actual cuando esté listo.
          </small>
        </div>
      )}

      {model === "router_mount" && (
        <div style={{ display: "grid", gap: 10, maxWidth: 480 }}>
          <label>
            Ancho base (mm): {rmBaseW}
            <input
              type="range"
              min={80}
              max={300}
              value={rmBaseW}
              onChange={(e) => setRmBaseW(+e.target.value)}
            />
          </label>
          <label>
            Alto base (mm): {rmBaseH}
            <input
              type="range"
              min={80}
              max={400}
              value={rmBaseH}
              onChange={(e) => setRmBaseH(+e.target.value)}
            />
          </label>
          <label>
            Fondo (mm): {rmDepth}
            <input
              type="range"
              min={20}
              max={120}
              value={rmDepth}
              onChange={(e) => setRmDepth(+e.target.value)}
            />
          </label>
          <label>
            Espesor (mm): {rmThickness}
            <input
              type="range"
              min={2}
              max={20}
              value={rmThickness}
              onChange={(e) => setRmThickness(+e.target.value)}
            />
          </label>
          <small style={{ color: "#64748b" }}>
            Nota: preparado en UI; espera a tener /generate activo para este
            modelo en el backend.
          </small>
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <button
          onClick={onGenerate}
          disabled={generatorDisabled}
          title={
            generatorDisabled
              ? "Este modelo aún no está activo en el backend"
              : undefined
          }
          style={{
            background: generatorDisabled ? "#94a3b8" : "#0f172a",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 6,
            cursor: generatorDisabled ? "not-allowed" : "pointer",
            border: 0,
          }}
        >
          Generar STL
        </button>

        {stlUrl && (
          <a
            href={stlUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              alignSelf: "center",
              color: "#2563eb",
              textDecoration: "underline",
            }}
          >
            Descargar STL (en Supabase)
          </a>
        )}
      </div>

      {/* Visor */}
      <div style={{ marginTop: 16 }}>
        <STLPreview url={stlUrl} height={520} background="#ffffff" />
      </div>

      {/* Respuesta JSON */}
      {resp && (
        <details style={{ marginTop: 16 }}>
          <summary>Ver respuesta JSON</summary>
          <pre
            style={{
              background: "#f8fafc",
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              border: "1px solid #e2e8f0",
              overflow: "auto",
            }}
          >
            {JSON.stringify(resp, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
