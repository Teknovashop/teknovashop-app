"use client";

import { useEffect, useMemo, useState } from "react";
import { FLAGS } from "@/lib/flags";

const API_V2 = "/api/forge/v2/generate"; // proxy local a backend v2

type Out = { stl_url?: string; dxf_url?: string; png_url?: string; design_id?: string };

const MODEL_OPTIONS = [
  { value: "cable_tray", label: "Cable Tray" },
  { value: "vesa_adapter", label: "VESA Adapter" },
  { value: "router_mount", label: "Router Mount" },
  { value: "phone_dock", label: "Phone Dock (USB-C)" },
  { value: "tablet_stand", label: "Tablet Stand" },
  // añade aquí más modelos pro…
];

export default function ForgeProForm({ onGenerated }: { onGenerated: (o: Out) => void }) {
  const [model, setModel] = useState("cable_tray");
  const [length_mm, setL] = useState(120);
  const [width_mm, setW] = useState(80);
  const [height_mm, setH] = useState(40);
  const [thickness_mm, setT] = useState(3);

  // PRO
  const [fillet_mm, setFillet] = useState(2);
  const [chamfer_mm, setChamfer] = useState(0);
  const [engrave, setEngrave] = useState(true);
  const [text, setText] = useState("TEKNOVA");
  const [text_height_mm, setTextH] = useState(8);
  const [text_depth_mm, setTextD] = useState(0.6);
  const [font, setFont] = useState("Inter");

  const [wantDXF, setWantDXF] = useState(true);
  const [wantPNG, setWantPNG] = useState(true);

  const params = useMemo(
    () => ({ length_mm, width_mm, height_mm, thickness_mm, fillet_mm, chamfer_mm }),
    [length_mm, width_mm, height_mm, thickness_mm, fillet_mm, chamfer_mm]
  );

  const disabled = !FLAGS.v2;

  const generate = async () => {
    const payload: any = {
      model,
      params,
      outputs: ["stl"].concat(wantDXF && FLAGS.laser ? ["dxf"] : []).concat(wantPNG ? ["png"] : []),
    };
    if (FLAGS.text && text) {
      payload.text = {
        value: text,
        height_mm: text_height_mm,
        depth_mm: text_depth_mm,
        mode: engrave ? "engrave" : "emboss",
        font,
      };
    }

    const res = await fetch(API_V2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Error en v2");
    onGenerated(json as Out);
  };

  useEffect(() => {
    // estado inicial no hace nada disruptivo
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm">
          <span className="mb-1 block text-neutral-600">Modelo</span>
          <select className="w-full rounded-md border px-3 py-2" value={model} onChange={(e) => setModel(e.target.value)}>
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <NumberField label="Largo (mm)" v={length_mm} set={setL} min={1} step={0.5} />
        <NumberField label="Ancho (mm)" v={width_mm} set={setW} min={1} step={0.5} />
        <NumberField label="Alto (mm)" v={height_mm} set={setH} min={1} step={0.5} />
        <NumberField label="Grosor (mm)" v={thickness_mm} set={setT} min={0.2} step={0.2} />

        {/* PRO */}
        <NumberField label="Fillet (mm)" v={fillet_mm} set={setFillet} min={0} step={0.5} />
        <NumberField label="Chaflán (mm)" v={chamfer_mm} set={setChamfer} min={0} step={0.5} />
      </div>

      {FLAGS.text && (
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Texto (grabado/relieve)</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm">
              <span className="mb-1 block text-neutral-600">Texto</span>
              <input className="w-full rounded-md border px-3 py-2" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <NumberField label="Altura letras (mm)" v={text_height_mm} set={setTextH} min={1} step={0.5} />
            <NumberField label="Profundidad (mm)" v={text_depth_mm} set={setTextD} min={0.1} step={0.1} />
            <label className="text-sm">
              <span className="mb-1 block text-neutral-600">Modo</span>
              <select className="w-full rounded-md border px-3 py-2" value={engrave ? "engrave" : "emboss"} onChange={(e) => setEngrave(e.target.value === "engrave")}>
                <option value="engrave">Grabar</option>
                <option value="emboss">Relieve</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-neutral-600">Fuente</span>
              <select className="w-full rounded-md border px-3 py-2" value={font} onChange={(e) => setFont(e.target.value)}>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Source Sans Pro">Source Sans Pro</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-3">
        <div className="mb-2 text-sm font-medium">Salidas</div>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked readOnly /> STL
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={wantPNG} onChange={(e) => setWantPNG(e.target.checked)} /> Render PNG
          </label>
          {FLAGS.laser && (
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={wantDXF} onChange={(e) => setWantDXF(e.target.checked)} /> DXF (láser)
            </label>
          )}
        </div>
      </div>

      <button
        type="button"
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        onClick={generate}
        disabled={disabled}
      >
        {disabled ? "Activa NEXT_PUBLIC_FORGE_V2" : "Generar con v2"}
      </button>
    </div>
  );
}

function NumberField({ label, v, set, min, step }: { label: string; v: number; set: (n: number) => void; min: number; step: number }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      <input
        type="number"
        className="w-full rounded-md border px-3 py-2"
        value={v}
        onChange={(e) => set(Number(e.target.value))}
        min={min}
        step={step}
      />
    </label>
  );
}
