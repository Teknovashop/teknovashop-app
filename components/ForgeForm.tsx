"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Gltf, useCursor } from "@react-three/drei";
import * as THREE from "three";

/**
 * Visor “clásico”:
 * - Barra superior con: Sombras, Tone (slider), preset (studio), Clipping, Fondo claro, Descargar STL
 * - ALT+click → emite CustomEvent("forge:add-hole", { detail: { x_mm, y_mm, d_mm } })
 * - Escucha "forge:generated-url" para habilitar la descarga
 *
 * Props mínimas; no toca tu lógica actual del formulario ni del backend.
 */
export default function ForgeViewer() {
  // UI state (mismos nombres visuales de la versión anterior)
  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(0.35); // 0..1
  const [preset, setPreset] = useState<"studio" | "city" | "sunset">("studio");
  const [clipping, setClipping] = useState(true);
  const [lightBg, setLightBg] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // último URL generado por /generate
  useEffect(() => {
    const onGen = (ev: Event) => {
      const d = (ev as CustomEvent).detail || {};
      if (d?.url) setDownloadUrl(String(d.url));
    };
    window.addEventListener("forge:generated-url", onGen as any);
    return () => window.removeEventListener("forge:generated-url", onGen as any);
  }, []);

  // estilo del contenedor para replicar la UI “antigua”
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Barra superior compacta, con los mismos “chips” */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => setShadows((v) => !v)}
          className={`rounded-md border px-2 py-1 ${shadows ? "bg-neutral-100 border-neutral-300" : "bg-white border-neutral-300"}`}
          title="Sombras"
        >
          Sombras
        </button>

        <div className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 py-1">
          <span className="text-neutral-600">Tone</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tone}
            onChange={(e) => setTone(Number(e.target.value))}
          />
        </div>

        <div className="rounded-md border border-neutral-300 bg-white px-2 py-1">
          <select
            className="bg-transparent"
            value={preset}
            onChange={(e) => setPreset(e.target.value as any)}
            title="HDRI"
          >
            <option value="studio">studio</option>
            <option value="city">city</option>
            <option value="sunset">sunset</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 py-1">
          <input type="checkbox" checked={clipping} onChange={(e) => setClipping(e.target.checked)} />
          <span>Clipping</span>
        </label>

        <label className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px=2 py-1">
          <input type="checkbox" checked={lightBg} onChange={(e) => setLightBg(e.target.checked)} />
          <span>Fondo claro</span>
        </label>

        <button
          type="button"
          disabled={!downloadUrl}
          onClick={() => downloadUrl && window.open(downloadUrl, "_blank")}
          className="ml-auto rounded-md bg-neutral-800 px-3 py-1 text-white hover:bg-neutral-900 disabled:opacity-50"
        >
          Descargar STL
        </button>
      </div>

      {/* Lienzo */}
      <div className="h-[520px] w-full overflow-hidden rounded-b-2xl">
        <Canvas
          shadows={shadows}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: clipping, // feel of “clipping”
          }}
          camera={{ position: [12, 8, 12], fov: 45, near: 0.1, far: 2000 }}
        >
          <Scene tone={tone} preset={preset} lightBg={lightBg} />
        </Canvas>
      </div>
    </div>
  );
}

/* ---------- Escena con controles, luz y rejilla ---------- */

function Scene({
  tone,
  preset,
  lightBg,
}: {
  tone: number;
  preset: "studio" | "city" | "sunset";
  lightBg: boolean;
}) {
  const { gl, scene } = useThree();

  // fondo claro/oscuro (igual que el anterior)
  useEffect(() => {
    const col = lightBg ? new THREE.Color("#F5F6F8") : new THREE.Color("#0f1115");
    scene.background = col;
  }, [lightBg, scene]);

  // luz ambiental (tone)
  const amb = useMemo(() => new THREE.AmbientLight(0xffffff, THREE.MathUtils.clamp(tone * 1.25, 0.05, 1.6)), [tone]);

  useEffect(() => {
    scene.add(amb);
    return () => void scene.remove(amb);
  }, [amb, scene]);

  // Luz direccional suave
  const dirRef = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    if (dirRef.current) {
      dirRef.current.intensity = 0.85;
      dirRef.current.castShadow = true;
      dirRef.current.shadow.mapSize.set(1024, 1024);
    }
  }, []);

  return (
    <>
      <directionalLight ref={dirRef} position={[6, 12, 6]} />
      <Environment preset={preset as any} />

      {/* Rejilla isométrica y ejes, como la UI antigua */}
      <Grid
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.6}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={lightBg ? "#999999" : "#595959"}
        cellColor={lightBg ? "#CFCFCF" : "#2b2b2b"}
        infiniteGrid
        followCamera
        fadeDistance={40}
        fadeStrength={1}
      />
      <axesHelper args={[2]} />

      {/* Plano de “pick” para ALT+click y soltar un agujero (x,y en mm) */}
      <PickPlane />

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
    </>
  );
}

/* ---------- Plano “pickeable” para ALT+click (añadir agujero) ---------- */

function PickPlane() {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.altKey) return;
    setHovered(true);
  };

  const onPointerOut = () => setHovered(false);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.altKey) return;
    // intersección con el plano (X,Y,Z=0)
    const p = e.point; // mundo
    // mm con centro en (0,0). Enviamos ambos ejes (x_mm,y_mm)
    const detail = { x_mm: Math.round(p.x), y_mm: Math.round(p.y), d_mm: 4 };
    window.dispatchEvent(new CustomEvent("forge:add-hole", { detail }));
  };

  return (
    <mesh
      ref={ref}
      rotation-x={-Math.PI / 2}
      position={[0, 0, 0]}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* plano “infinito”: grande y transparente */}
      <planeGeometry args={[2000, 2000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}
