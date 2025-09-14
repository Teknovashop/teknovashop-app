"use client";

import React, { useMemo, useState } from "react";
import STLPreview from "@/components/STLPreview";
import { generateSTL, type GenerateResponse } from "@/lib/api";

type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

export default function Page() {
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Cable Tray state
  const [w, setW] = useState(60);
  const [h, setH] = useState(25);
  const [L, setL] = useState(180);
  const [t, setT] = useState(3);
  const [vent, setVent] = useState(true);

  // Placeholder states (para cuando actives en backend)
  const [vesa, setVesa] = useState({
    width_mm: 180,
    height_mm: 180,
    thickness_mm: 6,
    pattern: "100x100",
  });
  const [router, setRouter] = useState({
    base_w_mm: 160,
    base_h_mm: 220,
    depth_mm: 40,
    thickness_mm: 4,
  });

  const [stlUrl, setStlUrl] = useState<string | undefined>(undefined);
  const [resp, setResp] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = useMemo(() => model === "cable_tray", [model]);

  async function onGenerate() {
    if (model !== "cable_tray") return; // de momento solo Cable Tray

    setLoading(true);
    setStlUrl(undefined);
    setResp(null);

    const payload = {
      model: "cable_tray" as const,
      width_mm: w,
      height_mm: h,
      length_mm: L,
      thickness_mm: t,
      ventilated: vent,
    };

    try {
      const r = await generateSTL(payload);
      setResp(r);
      if (r.status === "ok") {
        setStlUrl(r.stl_url);
      }
    } catch (err) {
      console.error(err);
      setResp({ status: "error", detail: "Network/Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Teknovashop Forge
      </h1>
      <p style={{ marginBottom: 16 }}>
        Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount
        llegarán en el siguiente paso.
      </p>

      {/* Selector de modelo */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Modelo</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as ModelKind)}
        >
          <option value="cable_tray">Cable Tray</option>
          <option value="vesa_adapter">VESA Adapter</option>
          <option value="router_mount">Router Mount</option>
        </select>
      </div>

      {/* Parámetros según modelo */}
      {model === "cable_tray" && (
        <div style={{ marginBottom: 16 }}>
          <Range
            label="Ancho (mm)"
            value={w}
            min={40}
            max={200}
            step={1}
            onChange={setW}
          />
          <Range
            label="Alto (mm)"
            value={h}
            min={15}
            max={60}
            step={1}
            onChange={setH}
          />
          <Range
            label="Longitud (mm)"
            value={L}
            min={120}
            max={300}
            step={5}
            onChange={setL}
          />
          <Range
            label="Espesor (mm)"
            value={t}
            min={2}
            max={10}
            step={1}
            onChange={setT}
          />
          <div style={{ margin: "8px 0 16px" }}>
            <label>
              <input
                type="checkbox"
                checked={vent}
                onChange={(e) => setVent(e.target.checked)}
              />{" "}
              Con ranuras de ventilación
            </label>
          </div>
          <button onClick={onGenerate} disabled={!canGenerate || loading}>
            {loading ? "Generando…" : "Generar STL"}
          </button>{" "}
          {resp?.status === "ok" && (
            <a href={resp.stl_url} target="_blank" rel="noreferrer">
              Descargar STL (en Supabase)
            </a>
          )}
        </div>
      )}

      {model === "vesa_adapter" && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            UI lista. A la espera de endpoint <code>/generate</code> para VESA.
          </Notice>
          <Range
            label="Ancho (mm)"
            value={vesa.width_mm}
            min={100}
            max={300}
            step={10}
            onChange={(v) => setVesa((s) => ({ ...s, width_mm: v }))}
          />
          <Range
            label="Alto (mm)"
            value={vesa.height_mm}
            min={100}
            max={300}
            step={10}
            onChange={(v) => setVesa((s) => ({ ...s, height_mm: v }))}
          />
          <Range
            label="Espesor (mm)"
            value={vesa.thickness_mm}
            min={3}
            max={12}
            step={1}
            onChange={(v) => setVesa((s) => ({ ...s, thickness_mm: v }))}
          />
          <div style={{ margin: "8px 0 16px" }}>
            <label>Patrón agujeros: </label>{" "}
            <select
              value={vesa.pattern}
              onChange={(e) =>
                setVesa((s) => ({ ...s, pattern: e.target.value }))
              }
            >
              <option value="75x75">75 × 75 mm</option>
              <option value="100x100">100 × 100 mm</option>
              <option value="100x200">100 × 200 mm</option>
              <option value="200x200">200 × 200 mm</option>
            </select>
          </div>
        </div>
      )}

      {model === "router_mount" && (
        <div style={{ marginBottom: 16 }}>
          <Notice>
            UI lista. A la espera de endpoint <code>/generate</code> para
            Router Mount.
          </Notice>
          <Range
            label="Ancho base (mm)"
            value={router.base_w_mm}
            min={100}
            max={240}
            step={5}
            onChange={(v) => setRouter((s) => ({ ...s, base_w_mm: v }))}
          />
          <Range
            label="Alto base (mm)"
            value={router.base_h_mm}
            min={120}
            max={280}
            step={5}
            onChange={(v) => setRouter((s) => ({ ...s, base_h_mm: v }))}
          />
          <Range
            label="Fondo (mm)"
            value={router.depth_mm}
            min={30}
            max={80}
            step={2}
            onChange={(v) => setRouter((s) => ({ ...s, depth_mm: v }))}
          />
          <Range
            label="Espesor (mm)"
            value={router.thickness_mm}
            min={3}
            max={10}
            step={1}
            onChange={(v) =>
              setRouter((s) => ({ ...s, thickness_mm: v }))
            }
          />
        </div>
      )}

      {/* Visor */}
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <STLPreview url={stlUrl} height={520} background="#ffffff" />
      </div>

      {/* Respuesta JSON */}
      <details style={{ marginTop: 8 }}>
        <summary>Ver respuesta JSON</summary>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: 12,
            overflow: "auto",
          }}
        >
{JSON.stringify(resp ?? {status:"idle"}, null, 2)}
        </pre>
      </details>
    </main>
  );
}

/** Input tipo range con etiqueta y valor en vivo */
function Range(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, onChange } = props;
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>
        {label}: <strong>{value}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 260 }}
      />
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        padding: "8px 10px",
        background: "#fef3c7",
        border: "1px solid #fde68a",
        borderRadius: 6,
        marginBottom: 8,
        color: "#7c2d12",
      }}
    >
      {children}
    </div>
  );
}
