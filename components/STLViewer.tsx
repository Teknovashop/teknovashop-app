// components/STLViewerPro.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import STLViewer, { type Marker } from "./STLViewer";

/** Props del Pro: superset del visor base */
type STLViewerProProps = {
  stlUrl?: string;
  width?: number;
  height?: number;

  /** marcadores que ya manejas en ForgeForm */
  markers?: Marker[];
  onMarkersChange?: (mk: Marker[]) => void;

  /** diámetro por defecto de agujero al añadir */
  defaultHoleDiameter?: number;
  /** paso de snap en mm para marcadores y medidas */
  snapMM?: number;
};

export default function STLViewerPro({
  stlUrl,
  width = 960,
  height = 560,
  markers: markersIn = [],
  onMarkersChange,
  defaultHoleDiameter = 5,
  snapMM = 1,
}: STLViewerProProps) {
  /** estado local no destructivo sobre los marcadores entrantes */
  const [localMarkers, setLocalMarkers] = useState<Marker[]>(markersIn);
  const [holesMode, setHolesMode] = useState<boolean>(false);
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [sectionOn, setSectionOn] = useState<boolean>(false);
  const [ortho, setOrtho] = useState<boolean>(false);
  const [snap, setSnap] = useState<number>(snapMM);
  const [bg, setBg] = useState<"light" | "dark">("light");

  // sincroniza cuando cambian desde fuera
  const first = useRef(true);
  if (first.current || markersIn !== localMarkers) {
    first.current = false;
    // evita re-render infinito
    if (JSON.stringify(markersIn) !== JSON.stringify(localMarkers)) {
      setLocalMarkers(markersIn);
    }
  }

  /** util: aplica snap */
  const sn = useCallback(
    (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v),
    [snap]
  );

  /** añadir marcador desde visor base */
  const handleAddMarker = useCallback(
    (m: Marker) => {
      const hole: Marker = {
        x_mm: sn(m.x_mm),
        y_mm: sn(m.y_mm ?? 0),
        z_mm: sn(m.z_mm),
        d_mm: m.d_mm ?? defaultHoleDiameter,
      };
      const next = [...localMarkers, hole];
      setLocalMarkers(next);
      onMarkersChange?.(next);
    },
    [localMarkers, onMarkersChange, defaultHoleDiameter, sn]
  );

  /** borrar último marcador */
  const popMarker = useCallback(() => {
    if (!localMarkers.length) return;
    const next = localMarkers.slice(0, -1);
    setLocalMarkers(next);
    onMarkersChange?.(next);
  }, [localMarkers, onMarkersChange]);

  /** limpiar todos */
  const clearMarkers = useCallback(() => {
    setLocalMarkers([]);
    onMarkersChange?.([]);
  }, [onMarkersChange]);

  /** descarga captura PNG del canvas del visor */
  const takeScreenshot = useCallback(() => {
    const mount = document.querySelector<HTMLDivElement>(
      "[data-stlviewer-root]"
    );
    if (!mount) return;
    const canvas = mount.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-preview.png";
    a.click();
  }, []);

  /** toolbar button */
  const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      {...p}
      className={[
        "px-2 py-1 text-xs rounded border shadow-sm",
        "bg-white hover:bg-gray-50 active:translate-y-px",
        (p as any)["data-active"] ? "ring-2 ring-blue-500" : "",
      ].join(" ")}
    />
  );

  /** HUD simple (coordenadas, #marcadores) */
  const HUD = (
    <div className="absolute left-2 bottom-2 text-[11px] bg-white/80 rounded px-2 py-1 border">
      <div>
        <b>Marcadores:</b> {localMarkers.length}
      </div>
      <div>
        <b>Snap:</b> {snap} mm
      </div>
      <div>
        <b>Vista:</b> {ortho ? "Orto" : "Persp"}
      </div>
    </div>
  );

  /** reglas/rulers (HTML superpuesto, no rompe perf) */
  const Rulers = (
    <>
      {/* regla superior X */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-200 to-transparent pointer-events-none">
        <div className="flex h-full text-[10px] text-gray-700">
          {Array.from({ length: 21 }, (_, i) => (
            <div key={i} className="flex-1 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0">|</div>
              <div className="absolute left-1/2 -translate-x-1/2 top-2">
                {i * 50}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* regla izquierda Z */}
      <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-gray-200 to-transparent pointer-events-none">
        <div className="flex flex-col h-full text-[10px] text-gray-700 items-start">
          {Array.from({ length: 21 }, (_, i) => (
            <div key={i} className="relative" style={{ height: `${100 / 20}%` }}>
              <div className="absolute left-0 top-0">— {i * 50}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={
        "relative rounded-2xl border shadow-sm " +
        (bg === "light" ? "bg-white" : "bg-neutral-900")
      }
      style={{ width, height }}
    >
      {/* Barra de herramientas */}
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <Btn
          onClick={() => setHolesMode((v) => !v)}
          data-active={holesMode}
          title="Modo agujeros (clic para añadir)"
        >
          🔩 Agujeros
        </Btn>
        <Btn
          onClick={() => setMeasureMode((v) => !v)}
          data-active={measureMode}
          title="Medición (doble clic)"
        >
          📏 Medir
        </Btn>
        <Btn onClick={popMarker} title="Borrar último">
          ⌫ Último
        </Btn>
        <Btn onClick={clearMarkers} title="Borrar todos">
          🗑️ Todos
        </Btn>
        <span className="inline-flex items-center gap-1 text-xs bg-white/80 rounded border px-2">
          Snap
          <input
            type="number"
            min={0}
            step={0.5}
            value={snap}
            onChange={(e) => setSnap(Number(e.target.value || 0))}
            className="w-12 border rounded px-1 py-0.5"
            title="Snap mm"
          />
          mm
        </span>
        <Btn
          onClick={() => setOrtho((v) => !v)}
          data-active={ortho}
          title="Proyección ortográfica / perspectiva"
        >
          🧭 Orto
        </Btn>
        <Btn
          onClick={() => setSectionOn((v) => !v)}
          data-active={sectionOn}
          title="Corte seccional (visual)"
        >
          ✂️ Sección
        </Btn>
        <Btn onClick={takeScreenshot} title="Capturar PNG">
          📸 Captura
        </Btn>
        <Btn
          onClick={() => setBg((b) => (b === "light" ? "dark" : "light"))}
          title="Fondo claro/oscuro"
        >
          🌓 Fondo
        </Btn>
      </div>

      {/* Reglas y HUD */}
      {Rulers}
      {HUD}

      {/* Contenedor del visor base.
          Importante: data-stlviewer-root para la captura */}
      <div data-stlviewer-root className="absolute inset-6">
        <STLViewer
          stlUrl={stlUrl}
          width={width - 12}   // margenes de rulers
          height={height - 12}
          markers={localMarkers}
          holesMode={holesMode}
          onAddMarker={handleAddMarker}
        />
      </div>

      {/* overlays de modos */}
      <div className="absolute right-2 top-2 text-xs bg-white/80 rounded px-2 py-1 border">
        {holesMode ? "Modo: Agujeros" : measureMode ? "Modo: Medición" : "Modo: Navegar"}
      </div>

      {/* Indicador de sección (visual; el corte real es trabajo del modelo) */}
      {sectionOn && (
        <div className="pointer-events-none absolute inset-6 ring-2 ring-pink-500/60 rounded-xl" />
      )}
    </div>
  );
}
