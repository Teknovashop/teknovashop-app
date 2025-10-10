"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";

// --- Cargador STL lazy para evitar SSR issues
function useSTLLoader() {
  const loaderRef = useRef<THREE.Loader | null>(null);
  const get = async () => {
    if (!loaderRef.current) {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      loaderRef.current = new STLLoader();
    }
    return loaderRef.current as any;
  };
  return get;
}

function Model({ url, clipPlane, color = "#d1d5db" }: { url: string; clipPlane: THREE.Plane | null; color?: string }) {
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);
  const getLoader = useSTLLoader();

  useEffect(() => {
    if (!url) return;
    let alive = true;
    (async () => {
      const loader = await getLoader();
      loader.load(
        url,
        (g: THREE.BufferGeometry) => {
          if (!alive) return;
          g.center();
          g.computeVertexNormals();
          setGeom(g);
        },
        undefined,
        () => setGeom(null)
      );
    })();
    return () => { alive = false; };
  }, [url, getLoader]);

  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.05,
      roughness: 0.6,
      clearcoat: 0.04,
      transparent: false,
    });
    if (clipPlane) m.clippingPlanes = [clipPlane];
    m.clipShadows = true;
    return m;
  }, [clipPlane, color]);

  if (!geom) return null;
  return <mesh geometry={geom} material={mat} castShadow receiveShadow />;
}

function HUD({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/80 px-2 py-1 text-xs text-black shadow">
      {text}
    </div>
  );
}

function Toolbar({
  onScreenshot,
  onToggleFull,
  clipping,
  setClipping,
  tone,
  setTone,
}: {
  onScreenshot: () => void;
  onToggleFull: () => void;
  clipping: boolean;
  setClipping: (v: boolean) => void;
  tone: "aces" | "linear";
  setTone: (t: "aces" | "linear") => void;
}) {
  return (
    <div className="absolute right-3 top-3 flex gap-2">
      <button className="rounded bg-white/90 px-3 py-1 text-sm shadow" onClick={onScreenshot}>📸 Screenshot</button>
      <button className="rounded bg-white/90 px-3 py-1 text-sm shadow" onClick={onToggleFull}>⛶ Fullscreen</button>
      <button className="rounded bg-white/90 px-3 py-1 text-sm shadow" onClick={() => setClipping(!clipping)}>
        {clipping ? "✂️ Clipping ON" : "✂️ Clipping OFF"}
      </button>
      <button className="rounded bg-white/90 px-3 py-1 text-sm shadow" onClick={() => setTone(tone === "aces" ? "linear" : "aces")}>
        Tone: {tone}
      </button>
    </div>
  );
}

function Scene({ stlUrl }: { stlUrl: string | null }) {
  const [clipping, setClipping] = useState(false);
  const [tone, setTone] = useState<"aces" | "linear">("aces");
  const [plane, setPlane] = useState<THREE.Plane | null>(null);
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.localClippingEnabled = clipping;
    if (clipping) setPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
    else setPlane(null);
  }, [clipping, gl]);

  useEffect(() => {
    gl.toneMapping = tone === "aces" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  }, [tone, gl]);

  // simple grid helper
  useEffect(() => {
    const grid = new THREE.GridHelper(200, 40, 0x888888, 0xcccccc);
    scene.add(grid);
    return () => { scene.remove(grid); };
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 8]} castShadow intensity={0.8} />
      <Environment preset="city" />
      {stlUrl ? (
        <Model url={stlUrl} clipPlane={plane} />
      ) : (
        <Html center>
          <div className="rounded bg-white/90 px-3 py-2 text-sm shadow">Carga un STL desde el configurador</div>
        </Html>
      )}
      <ContactShadows opacity={0.45} scale={80} blur={1.8} far={50} />
      <OrbitControls makeDefault />
    </>
  );
}

export default function ProForgePage() {
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escucha el evento del configurador
  useEffect(() => {
    const onStl = (e: any) => setStlUrl(e?.detail?.url || null);
    window.addEventListener("forge:stl-url", onStl as any);
    return () => window.removeEventListener("forge:stl-url", onStl as any);
  }, []);

  const takeScreenshot = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "preview.png";
    link.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
    link.click();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  return (
    <div className="relative h-[calc(100vh-60px)] w-full" ref={containerRef}>
      <Toolbar
        onScreenshot={takeScreenshot}
        onToggleFull={toggleFullscreen}
        clipping={false}
        setClipping={() => {}}
        tone={"aces"}
        setTone={() => {}}
      />
      {/* Nota: los toggles reales de clipping y tone viven dentro de Scene.
          Si quieres controlarlos desde la toolbar, puedes levantar el estado. */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3, 3, 6], fov: 45 }}
      >
        <Scene stlUrl={stlUrl} />
      </Canvas>
      <HUD text={stlUrl ? "STL cargado desde el configurador" : "Esperando STL…"} />
    </div>
  );
}
