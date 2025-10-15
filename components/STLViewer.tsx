// components/STLViewer.tsx
"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

type ViewerProps = { url?: string | null; className?: string };

function useSTL(url?: string | null) {
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);
  const cacheKey = url || "";
  useMemo(() => {
    if (!url) { setGeom(null); return; }
    const loader = new STLLoader();
    loader.load(url, (g) => { g.center(); setGeom(g); });
  }, [cacheKey]);
  return geom;
}

function MeshFromSTL({ url, castShadows, tone }: { url?: string | null; castShadows: boolean; tone: number }) {
  const geom = useSTL(url);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f0f0f0", metalness: 0.1, roughness: 0.9 }), []);
  (mat as any).roughness = 1 - tone; // 0..1
  if (!geom) return null;
  return <mesh geometry={geom} material={mat} castShadow={castShadows} receiveShadow />;
}

export default function STLViewer({ url, className }: ViewerProps) {
  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [preset, setPreset] = useState<"studio" | "city" | "apartment">("studio");
  const [clipping, setClipping] = useState(false); // placeholder
  const [lightBg, setLightBg] = useState(true);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-output.stl";
    a.click();
  };

  return (
    <div className={"relative w-full rounded-xl " + (className ?? "h-[520px] bg-white")}>
      {/* Barra de controles dentro del visor */}
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <button onClick={() => setShadows((s) => !s)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm">Sombras</button>
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xs text-neutral-600">Tone</span>
          <input type="range" min={0} max={1} step={0.01} value={tone} onChange={(e)=>setTone(parseFloat((e.target as HTMLInputElement).value))} />
        </div>
        <select value={preset} onChange={(e)=>setPreset(e.target.value as any)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm">
          <option value="studio">studio</option>
          <option value="city">city</option>
          <option value="apartment">apartment</option>
        </select>
        <button onClick={() => setClipping((c)=>!c)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm">Clipping</button>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-2 py-1 text-sm">
          <input type="checkbox" checked={lightBg} onChange={(e)=>setLightBg(e.target.checked)} />
          Fondo claro
        </label>
        <button onClick={download} className="rounded-md bg-[#2663EB] px-2 py-1 text-sm text-white hover:bg-[#1f55c8]">Descargar STL</button>
      </div>

      <div className={"absolute inset-0 rounded-xl " + (lightBg ? "bg-white" : "bg-black")}></div>
      <Canvas shadows={shadows} className="absolute inset-0 rounded-xl">
        <ambientLight intensity={0.3 + tone * 0.5} />
        <directionalLight position={[3, 5, 2]} castShadow intensity={0.6} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Suspense fallback={null}>
          <MeshFromSTL url={url || undefined} castShadows={shadows} tone={tone} />
          <Environment preset={preset} background={false} />
        </Suspense>
        <Grid args={[20, 20]} cellSize={0.5} sectionThickness={1} position={[0, -0.001, 0]} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#f00", "#0f0", "#00f"]} labelColor="white" />
        </GizmoHelper>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
