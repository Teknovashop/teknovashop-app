"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
// ✅ Importa los TIPOS nominalmente (no desde el namespace)
import type {
  Mesh,
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Object3D,
  BufferGeometry,
} from "three";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

type Props = { url?: string | null; className?: string };

function isPaywallOn(): boolean {
  const v = (process.env.NEXT_PUBLIC_PAYWALL_PREVIEW ?? "0") as string;
  return v === "1";
}

function hasEntitlement(): boolean {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  if (sp.get("status") === "success") {
    localStorage.setItem("entitled", "1");
    sp.delete("status");
    const clean = `${window.location.pathname}${sp.toString() ? "?" + sp.toString() : ""}`;
    window.history.replaceState({}, "", clean);
  }
  return localStorage.getItem("entitled") === "1";
}

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // ✅ Usa los tipos importados nominalmente
  const currentMeshRef = useRef<Mesh | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [bgLight, setBgLight] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const paywall = isPaywallOn();
  const entitled = useMemo(() => hasEntitlement(), []);

  async function startCheckout(price: "oneoff" | "maker" | "commercial" = "maker") {
    try {
      const email = window.prompt("Introduce tu email para la compra (Stripe)")?.trim() || "";
      if (!email) return;

      // Preferido: /api/stripe/checkout; si falla, fallback a create-session
      const primary = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, price, model_kind: "stl_download" }),
      });

      let res = primary;
      if (!primary.ok) {
        res = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, price, model_kind: "stl_download", params: {}, object_key: "" }),
        });
      }

      const { url } = await res.json();
      if (res.ok && url) window.location.href = url as string;
      else alert("No se pudo iniciar el checkout.");
    } catch {
      alert("Error iniciando el checkout.");
    }
  }

  const downloadCurrentSTL = () => {
    if (paywall && !entitled) {
      startCheckout("maker");
      return;
    }
    const mesh = currentMeshRef.current;
    if (!mesh) return;

    const exporter = new STLExporter();
    const parsed = exporter.parse(mesh, { binary: true }) as ArrayBuffer | DataView | string;
    const bytes =
      parsed instanceof ArrayBuffer
        ? new Uint8Array(parsed)
        : parsed instanceof DataView
        ? new Uint8Array(parsed.buffer)
        : new TextEncoder().encode(parsed as string);

    const blob = new Blob([bytes], { type: "model/stl" });
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

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(220, 180, 220);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    // Algunas props cambian de nombre según la versión -> coerción segura
    (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? "srgb";
    (renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping ?? 0;
    (renderer as any).toneMappingExposure = 0.8 + tone * 0.7;
    // En r164+ está deprecado, pero no rompe si existe:
    (renderer as any).physicallyCorrectLights = true;
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
      const { clientWidth, clientHeight } = mount;
      camera.aspect = Math.max(1e-6, clientWidth / Math.max(1, clientHeight));
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
      currentMeshRef.current = null;
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reaplicar ajustes cuando cambian toggles
  useEffect(() => {
    const r = rendererRef.current as any;
    if (!r) return;
    r.toneMappingExposure = 0.8 + tone * 0.7;
    if (r.shadowMap) r.shadowMap.enabled = showShadow;
  }, [tone, showShadow]);

  // helper: encuadrar cámara al mesh cargado
  function fitCameraToObject(obj: Object3D) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.65;

    camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    camera.near = Math.max(0.1, maxDim / 500);
    camera.far = distance * 10;
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
  }

  // Cargar STL cuando cambie la URL
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Limpia mesh anterior
    if (currentMeshRef.current) {
      const prev = currentMeshRef.current;
      scene.remove(prev);
      (prev.geometry as BufferGeometry | undefined)?.dispose?.();
      (prev.material as any)?.dispose?.();
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
        fitCameraToObject(mesh);
      },
      undefined,
      () => {}
    );
  }, [url]);

  return (
    <div ref={mountRef} className={`relative w-full rounded-xl ${className ?? "h-[520px] bg-white"}`}>
      {/* Reglas */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-6 w-full bg-white/90">
        <svg className="h-full w-full">
          {[...Array(50)].map((_, i) => {
            const x = (i / 50) * size.w;
            const h = i % 5 === 0 ? 12 : 6;
            return <line key={i} x1={x} y1={24} x2={x} y2={24 - h} stroke="#9ca3af" strokeWidth="1" />;
          })}
        </svg>
      </div>
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
          onClick={downloadCurrentSTL}
          className={`rounded-md px-2 py-1 text-sm text-white ${
            paywall && !entitled ? "bg-[#111827] hover:bg-black/90" : "bg-[#2663EB] hover:bg-[#1f55c8]"
          }`}
          title={paywall && !entitled ? "Necesitas comprar para descargar" : "Descargar STL"}
        >
          {paywall && !entitled ? "Comprar para descargar" : "Descargar STL"}
        </button>
      </div>
    </div>
  );
}
