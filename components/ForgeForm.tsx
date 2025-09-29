"use client";

import React, { useMemo, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";

type Hole = { x_mm: number; z_mm: number; d_mm: number };

const ForgeForm: React.FC = () => {
  // Estado de ejemplo; ajusta a tu esquema real de modelo seleccionado
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);

  const [holesMode, setHolesMode] = useState(true);
  const [holeDiameter, setHoleDiameter] = useState(5);
  const [snapStep, setSnapStep] = useState(1);

  const [markers, setMarkers] = useState<Hole[]>([]);

  const box = useMemo(
    () => ({ length, width, height, thickness }),
    [length, width, height, thickness]
  );

  const onGenerate = async () => {
    const payload = {
      model: "cable_tray",
      params: { length_mm: length, width_mm: width, height_mm: height, thickness_mm: thickness },
      holes: markers, // [{x_mm,z_mm,d_mm}]
    };

    const res = await fetch("/api/forge/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      alert(`Error: ${t}`);
      return;
    }
    const data = await res.json();
    // data.stl_url es firmado o público
    window.open(data.stl_url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <div className="rounded-xl bg-white p-4 shadow">
        <h3 className="font-semibold mb-3">Configuración · Cable Tray</h3>
        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>Ancho (mm)</span>
            <input type="range" min={40} max={120} value={width} onChange={(e)=>setWidth(parseInt(e.target.value))} className="w-48" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Alto (mm)</span>
            <input type="range" min={10} max={60} value={height} onChange={(e)=>setHeight(parseInt(e.target.value))} className="w-48" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Longitud (mm)</span>
            <input type="range" min={80} max={300} value={length} onChange={(e)=>setLength(parseInt(e.target.value))} className="w-48" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Espesor (mm)</span>
            <input type="range" min={2} max={8} value={thickness} onChange={(e)=>setThickness(parseInt(e.target.value))} className="w-48" />
          </label>

          <div className="pt-2 border-t">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={holesMode} onChange={(e)=>setHolesMode(e.target.checked)} />
              <span>Modo agujeros (usa Alt + clic)</span>
            </label>
            <label className="mt-2 flex items-center justify-between gap-3">
              <span>Diámetro (mm)</span>
              <input type="range" min={3} max={12} value={holeDiameter} onChange={(e)=>setHoleDiameter(parseInt(e.target.value))} className="w-48" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Snap (mm)</span>
              <input type="range" min={1} max={10} value={snapStep} onChange={(e)=>setSnapStep(parseInt(e.target.value))} className="w-48" />
            </label>
          </div>

          <button onClick={onGenerate} className="mt-4 w-full rounded-lg bg-black text-white py-2">
            Generar STL
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <STLViewerPro
          className=""
          box={box}
          holesEnabled={holesMode}
          holeDiameter={holeDiameter}
          snapMM={snapStep}
          markers={markers}
          onMarkersChange={setMarkers}
        />
      </div>
    </div>
  );
};

export default ForgeForm;
