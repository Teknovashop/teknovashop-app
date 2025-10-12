// components/ViewerHUD.tsx
"use client";

import { useEffect, useRef, useState } from "react";

function emit<T = any>(name: string, detail?: T) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

export default function ViewerHUD() {
  const mounted = useRef(false);
  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [bgLight, setBgLight] = useState(true);
  const [clipping, setClipping] = useState(false);

  // Monta la HUD en el slot del layout (justo bajo el header)
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const slot = document.getElementById("viewer-hud-slot");
    if (!slot) return;

    // este componente ya está renderizado aquí; sólo aseguramos el contenedor
  }, []);

  // Emites cambios al visor actual
  useEffect(() => { emit("forge:toggle-shadows", { enabled: shadows }); }, [shadows]);
  useEffect(() => { emit("forge:set-tone", { tone }); }, [tone]);
  useEffect(() => { emit("forge:toggle-clipping", { enabled: clipping }); }, [clipping]);
  useEffect(() => { emit("forge:set-background", { mode: bgLight ? "light" : "dark" }); }, [bgLight]);

  const handleDownload = () => emit("forge:download-stl");

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex flex-wrap items-center gap-3 py-2">
        <button
          className={`rounded-md border px-3 py-1 text-sm ${shadows ? "bg-black text-white" : "bg-white"}`}
          onClick={() => setShadows((s) => !s)}
        >
          Sombras: {shadows ? "ON" : "OFF"}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600">Tone</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.target.value))}
          />
        </div>

        <select
          className="rounded-md border bg-white px-2 py-1 text-sm"
          onChange={(e) => emit("forge:set-preset", { preset: e.target.value })}
          defaultValue="studio"
        >
          <option value="studio">studio</option>
          <option value="neutral">neutral</option>
          <option value="product">product</option>
        </select>

        <button
          className={`rounded-md border px-3 py-1 text-sm ${clipping ? "bg-black text-white" : "bg-white"}`}
          onClick={() => setClipping((s) => !s)}
        >
          Clipping
        </button>

        <label className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-sm">
          <input
            type="checkbox"
            checked={bgLight}
            onChange={(e) => setBgLight(e.target.checked)}
          />
          Fondo claro
        </label>

        <button
          className="ml-auto rounded-md bg-black px-3 py-1 text-sm text-white"
          onClick={handleDownload}
        >
          Descargar STL
        </button>
      </div>
    </div>
  );
}
