// components/STLViewerPro.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { createCheckout } from "@/lib/payments";

type Props = {
  url?: string | null;
  className?: string;
  paywallPreview?: boolean;
};

function isEntitled(): boolean {
  // Simple: marca local tras success=1 (puedes sustituir por tu verificación real con Supabase)
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("success") === "1") {
    localStorage.setItem("entitled", "1");
    // limpia la query para no dejar el success
    params.delete("success");
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url.endsWith("?") ? url.slice(0, -1) : url);
  }
  return localStorage.getItem("entitled") === "1";
}

export default function STLViewerPro({ url, className, paywallPreview }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const currentMeshRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const [bgLight, setBgLight] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const entitled = useMemo(() => isEntitled(), []);

  const handleDownload = () => {
    if (paywallPreview && !entitled) {
      // bloquear descarga → abrir Stripe
      createCheckout("maker");
      return;
    }
    const mesh = currentMeshRef.current;
    if (!mesh) return;
    const exporter = new STLExporter();
    const parsed = exporter.parse(mesh, { binary: true }) as unknown;
    const bytes =
      parsed instanceof ArrayBuffer ? new Uint8Array(parsed) : new Uint8Array((parsed as DataView).buffer);
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const blob = new Blob([ab], { type: "model/stl" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forge-output.stl";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgLight ? 0xffffff : 0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(220, 180, 220);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8 + tone * 0.7;
    renderer.shadowMap.enabled = showShadow;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rendererRef.current = renderer;

    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env).texture;

    const grid = new THREE.GridHelper(600, 60, 0xcccccc, 0xeeeeee);
    (grid.material as any).opacity = 0.6;
    (grid.material as any).transparent = true;
    scene.add(grid);

    scene.add(new THREE.AxesHelper(60));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(300, 400, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    mount.appendChild(renderer.domElement);

    const onResize = () => {
      if (!mount) return;
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      setSize({ w: clientWidth, h: clientHeight });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    onResize();

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      pmrem.dispose();
      scene.clear();
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      currentMeshRef.current = null;
    };
  }, []); // init

  // Carga STL via URL
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // limpia malla previa
    const prev = currentMeshRef.current;
    if (prev) {
      scene.remove(prev);
      prev.geometry?.dispose?.();
      prev.material?.dispose?.();
      currentMeshRef.current = null;
    }
    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.center();
        geometry.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf0f0f0,
          metalness: 0.12,
          roughness: 0.86,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        currentMeshRef.current = mesh;
      },
      undefined,
      () => {}
    );
  }, [url]);

  return (
    <div ref={mountRef} className={`relative w-full rounded-xl ${className ?? "h-[520px] bg-white"}`}>
      {/* Regla superior */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-6 w-full bg-white/90">
        <svg className="h-full w-full">
          {[...Array(50)].map((_, i) => {
            const x = (i / 50) * size.w;
            const h = i % 5 === 0 ? 12 : 6;
            return <line key={i} x1={x} y1={24} x2={x} y2={24 - h} stroke="#9ca3af" strokeWidth="1" />;
          })}
        </svg>
      </div>
      {/* Regla lateral */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-white/90">
        <svg className="h-full w-full">
          {[...Array(50)].map((_, i) => {
            const y = (i / 50) * size.h;
            const w = i % 5 === 0 ? 12 : 6;
            return <line key={i} x1={24} y1={y} x2={24 - w} y2={y} stroke="#9ca3af" strokeWidth="1" />;
          })}
        </svg>
      </div>

      {/* Toolbar */}
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
          Fondo claro
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showShadow} onChange={(e) => setShowShadow(e.target.checked)} />
          Sombras
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600">Tone</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.currentTarget.value))}
          />
        </div>

        <button
          onClick={handleDownload}
          className={`rounded-md px-2 py-1 text-sm text-white ${
            paywallPreview && !entitled ? "bg-[#111827]" : "bg-[#2663EB]"
          }`}
          title={paywallPreview && !entitled ? "Necesitas comprar para descargar" : "Descargar STL"}
        >
          {paywallPreview && !entitled ? "Comprar para descargar" : "Descargar STL"}
        </button>
      </div>
    </div>
  );
}
