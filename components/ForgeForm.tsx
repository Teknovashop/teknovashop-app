// components/ForgeForm.tsx
import React, { useMemo, useState } from "react";

type HoleInput = { x_mm: number; y_mm: number; d_mm: number };

const MODEL_OPTIONS = [
  { key: "cable_tray", label: "Cable Tray" },
  { key: "vesa_adapter", label: "VESA Adapter" },
  { key: "router_mount", label: "Router Mount" },
  { key: "camera_mount", label: "Camera Mount" },
  { key: "wall_bracket", label: "Wall Bracket" },
] as const;

type ModelKey = typeof MODEL_OPTIONS[number]["key"];
type GenerateResponse = { stl_url: string; object_key: string };

const apiBase =
  (process.env.NEXT_PUBLIC_FORGE_API || "").replace(/\/+$/, "") ||
  "https://teknovashop-forge.onrender.com";

export default function ForgeForm() {
  const [model, setModel] = useState<ModelKey>("cable_tray");
  const [lenX, setLenX] = useState<number>(200);
  const [widY, setWidY] = useState<number>(100);
  const [heiZ, setHeiZ] = useState<number>(60);
  const [thickness, setThickness] = useState<number>(3);
  const [fillet, setFillet] = useState<number>(0);
  const [holes, setHoles] = useState<HoleInput[]>([{ x_mm: 10, y_mm: 10, d_mm: 4 }]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUrl, setLastUrl] = useState("");

  const normalizedModel = useMemo(() => (model as string).split("_").join("-"), [model]);

  function addHole() {
    setHoles((prev) => [...prev, { x_mm: 10, y_mm: 10, d_mm: 4 }]);
  }
  function removeHole(i: number) {
    setHoles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleGenerate() {
    setIsLoading(true);
    setErrorMsg("");
    setLastUrl("");
    try {
      const body = {
        model, // <- clave canonical
        params: {
          length_mm: Number(lenX),
          width_mm: Number(widY),
          height_mm: Number(heiZ),
          thickness_mm: Number(thickness),
          fillet_mm: Number(fillet), // si no lo soporta, backend lo ignora sin romper
        },
        holes: holes.map((h) => ({
          x_mm: Number(h.x_mm),
          y_mm: Number(h.y_mm),
          d_mm: Number(h.d_mm),
        })),
      };

      const res = await fetch(`${apiBase}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data: GenerateResponse = await res.json();
      setLastUrl(data.stl_url || "");
    } catch (e: any) {
      setErrorMsg(e?.message || "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!lastUrl) return;
    const a = document.createElement("a");
    const name = `${normalizedModel}-${lenX}x${widY}x${heiZ}.stl`;
    a.href = lastUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="w-full max-w-xl p-4 bg-[#111] text-gray-100 rounded-lg">
      <label className="block mb-2 text-sm font-medium">Modelo</label>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as ModelKey)}
        className="w-full mb-4 rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
      >
        {MODEL_OPTIONS.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-sm">Largo X (mm)</label>
          <input
            type="number"
            value={lenX}
            onChange={(e) => setLenX(Number(e.target.value))}
            className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Ancho Y (mm)</label>
          <input
            type="number"
            value={widY}
            onChange={(e) => setWidY(Number(e.target.value))}
            className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Alto Z (mm)</label>
          <input
            type="number"
            value={heiZ}
            onChange={(e) => setHeiZ(Number(e.target.value))}
            className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Grosor (mm)</label>
          <input
            type="number"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block mb-1 text-sm">Redondeo/Fillet (mm)</label>
        <input
          type="number"
          value={fillet}
          onChange={(e) => setFillet(Number(e.target.value))}
          className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">Si no hay soporte en backend, no romperá.</p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Agujeros (X/Y arriba, pasantes)</label>
          <button
            type="button"
            className="text-sm px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
            onClick={addHole}
          >
            + Añadir agujero
          </button>
        </div>

        {holes.map((h, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-3 items-end mt-2">
            <div>
              <label className="block mb-1 text-xs">X (mm)</label>
              <input
                type="number"
                value={h.x_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) => (i === idx ? { ...hh, x_mm: Number(e.target.value) } : hh))
                  )
                }
                className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs">Y (mm)</label>
              <input
                type="number"
                value={h.y_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) => (i === idx ? { ...hh, y_mm: Number(e.target.value) } : hh))
                  )
                }
                className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs">Ø (mm)</label>
              <input
                type="number"
                value={h.d_mm}
                onChange={(e) =>
                  setHoles((prev) =>
                    prev.map((hh, i) => (i === idx ? { ...hh, d_mm: Number(e.target.value) } : hh))
                  )
                }
                className="w-full rounded-md bg-[#1a1a1a] border border-gray-700 p-2 outline-none"
              />
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={() => removeHole(idx)}
                className="ml-auto text-sm px-3 py-2 rounded bg-red-600 hover:bg-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex-1 py-3 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
        >
          {isLoading ? "Generando..." : "Generar STL"}
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!lastUrl}
          className="w-44 py-3 rounded bg-green-600 hover:bg-green-500 disabled:opacity-60"
        >
          Descargar STL
        </button>
      </div>

      {errorMsg && <p className="mt-3 text-sm text-red-400">Error: {errorMsg}</p>}
      {lastUrl && (
        <p className="mt-3 text-xs text-gray-400 break-all">
          Último STL:{" "}
          <a className="underline" href={lastUrl} target="_blank" rel="noreferrer">
            {lastUrl}
          </a>
        </p>
      )}
    </div>
  );
}
