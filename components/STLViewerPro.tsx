// components/STLViewerPro.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

type Props = { url?: string | null; className?: string };
type Unit = "mm" | "cm";

function niceStep(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  if (f <= 1) return p;
  if (f <= 2) return 2 * p;
  if (f <= 5) return 5 * p;
  return 10 * p;
}

function fmt(valueMm: number, unit: Unit) {
  const v = unit === "cm" ? valueMm / 10 : valueMm;
  const a = Math.abs(v);
  if (a >= 100 || Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toFixed(a < 10 ? 1 : 0);
}

function fmtDim(valueMm: number, unit: Unit) {
  return unit === "cm"
    ? `${(valueMm / 10).toFixed(valueMm < 100 ? 1 : 0)} cm`
    : `${valueMm.toFixed(valueMm < 10 ? 1 : 0)} mm`;
}

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

  // Refs laxos para evitar choques con @types/three en Vercel
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // Objetos de escena
  const groupRef = useRef<any>(null); // mesh + edges
  const meshRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);
  const groundRef = useRef<any>(null);
  const dirLightRef = useRef<any>(null);

  const [bgLight, setBgLight] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [unit, setUnit] = useState<Unit>("mm");
  const [ruler, setRuler] = useState({ spanX: 400, spanY: 300, step: 50 });
  const [modelInfo, setModelInfo] = useState<{ x: number; y: number; z: number; triangles: number } | null>(null);

  const paywall = isPaywallOn();
  const entitled = useMemo(() => hasEntitlement(), []);

  async function startCheckout(price: "oneoff" | "maker" | "commercial" = "maker") {
    try {
      const email = window.prompt("Introduce tu email para la compra (Stripe)")?.trim() || "";
      if (!email) return;

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
    const mesh = meshRef.current;
    if (!mesh) return;

    const exporter = new STLExporter();
    const parsed = exporter.parse(mesh, { binary: true }) as ArrayBuffer | DataView | string;

    // Normalizar a ArrayBuffer real
    let bytes: Uint8Array;
    if (parsed instanceof ArrayBuffer) {
      bytes = new Uint8Array(parsed);
    } else if (parsed instanceof DataView) {
      const view = new Uint8Array(parsed.buffer as ArrayBufferLike, parsed.byteOffset, parsed.byteLength);
      bytes = new Uint8Array(parsed.byteLength);
      bytes.set(view);
    } else {
      bytes = new TextEncoder().encode(parsed as string);
    }
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);

    const blob = new Blob([ab], { type: "model/stl" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forge-output.stl";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function updateRuler() {
    const camera = cameraRef.current as any;
    const controls = controlsRef.current as any;
    const mount = mountRef.current;
    if (!camera || !controls || !mount) return;

    const distance = camera.position.distanceTo(controls.target);
    const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * Math.max(distance, 0.001);
    const visibleW = visibleH * Math.max(camera.aspect || 1, 0.001);
    setRuler({
      spanX: visibleW,
      spanY: visibleH,
      step: niceStep(visibleW / 8),
    });
  }

  function setView(mode: "iso" | "front" | "top" | "right") {
    const camera = cameraRef.current as any;
    const controls = controlsRef.current as any;
    const group = groupRef.current as any;
    if (!camera || !controls || !group || !meshRef.current) return;

    const box = new THREE.Box3().setFromObject(group);
    const s = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(s.x, s.y, s.z, 1);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.75;

    if (mode === "front") camera.position.set(center.x, center.y, center.z + distance);
    else if (mode === "top") camera.position.set(center.x, center.y + distance, center.z);
    else if (mode === "right") camera.position.set(center.x + distance, center.y, center.z);
    else camera.position.set(center.x + distance, center.y + distance, center.z + distance);

    camera.lookAt(center);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
    updateRuler();
  }

  // Init escena
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgLight ? 0xf7f7f8 : 0x0d0f12);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(220, 180, 220);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? "srgb";
    (renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping ?? 0;
    (renderer as any).toneMappingExposure = 0.8 + tone * 0.7;
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
    dirLightRef.current = dir;

    // Suelo receptor de sombras
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.ShadowMaterial({ opacity: showShadow ? 0.18 : 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Grupo para mesh + edges
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;
    (controls as any).addEventListener("change", updateRuler);

    mount.appendChild(renderer.domElement);

    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = Math.max(1e-6, clientWidth / Math.max(1, clientHeight));
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      setSize({ w: clientWidth, h: clientHeight });
      window.setTimeout(updateRuler, 0);
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
      (controls as any).removeEventListener("change", updateRuler);
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
      meshRef.current = null;
      edgesRef.current = null;
      groundRef.current = null;
      dirLightRef.current = null;
      groupRef.current = null;
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tone + Sombras
  useEffect(() => {
    const r = rendererRef.current as any;
    if (!r) return;
    r.toneMappingExposure = 0.8 + tone * 0.7;

    r.shadowMap.enabled = showShadow;
    if (dirLightRef.current) dirLightRef.current.castShadow = showShadow;
    if (groundRef.current) {
      const gm = (groundRef.current.material as any);
      gm.opacity = showShadow ? 0.18 : 0;
      gm.needsUpdate = true;
    }
    groupRef.current?.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = showShadow;
        o.receiveShadow = showShadow;
      }
    });
  }, [tone, showShadow]);

  // Fondo claro/oscuro
  useEffect(() => {
    const scene = sceneRef.current as any;
    if (!scene) return;
    scene.background = new THREE.Color(bgLight ? 0xf7f7f8 : 0x0d0f12);

    const mesh = meshRef.current as any;
    if (mesh?.material) (mesh.material as any).color.setHex(bgLight ? 0xdedede : 0xaaaaaa);

    const edges = edgesRef.current as any;
    if (edges?.material) (edges.material as any).color.setHex(bgLight ? 0x262626 : 0xffffff);
  }, [bgLight]);

  function fitCameraToObject(obj: any) {
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
    updateRuler();
  }

  // Cargar STL cuando cambie la URL
  useEffect(() => {
    const scene = sceneRef.current as any;
    const group = groupRef.current as any;
    if (!scene || !group) return;

    // Limpiar grupo anterior
    while (group.children.length) {
      const c = group.children.pop()!;
      (c as any).geometry?.dispose?.();
      const mat: any = (c as any).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
        else mat.dispose?.();
      }
      c.removeFromParent();
    }
    meshRef.current = null;
    edgesRef.current = null;
    setModelInfo(null);

    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();

        // Malla principal
        const mat = new THREE.MeshStandardMaterial({
          color: bgLight ? 0xdedede : 0xaaaaaa,
          metalness: 0.12,
          roughness: 0.86,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = showShadow;
        mesh.receiveShadow = showShadow;
        group.add(mesh);
        meshRef.current = mesh;

        // Contorno para resaltar grabados
        const edgesGeom = new THREE.EdgesGeometry(geometry, 15);
        const edgesMat = new THREE.LineBasicMaterial({ color: bgLight ? 0x262626 : 0xffffff });
        const edges = new THREE.LineSegments(edgesGeom, edgesMat);
        group.add(edges);
        edgesRef.current = edges;

        // Centrar grupo
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        const triangles = Math.round((geometry.getAttribute("position")?.count ?? 0) / 3);
        setModelInfo({ x: size.x, y: size.y, z: size.z, triangles });
        group.position.set(-center.x, -center.y, -center.z);

        // Suelo bajo la pieza
        if (groundRef.current) {
          groundRef.current.position.y = -size.y / 2 - 0.02;
        }

        fitCameraToObject(group);
      },
      undefined,
      () => {}
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 shadow-sm ${
        className ?? "h-[520px] bg-white"
      }`}
    >
      {/* Regla horizontal: escala real aproximada en el plano de la cámara */}
      <div className="pointer-events-none absolute left-10 right-0 top-0 z-10 h-8 border-b border-neutral-200 bg-white/95">
        <svg width={Math.max(1, size.w - 40)} height={32} className="block">
          {Array.from({ length: 51 }).map((_, i) => {
            const usable = Math.max(1, size.w - 40);
            const x = (i / 50) * usable;
            const major = i % 5 === 0;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={32}
                  x2={x}
                  y2={major ? 17 : 24}
                  stroke={major ? "#64748b" : "#cbd5e1"}
                  strokeWidth="1"
                />
                {major && (
                  <text x={x + 2} y={11} fontSize="9" fill="#475569">
                    {fmt(((i - 25) / 50) * ruler.spanX, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Regla vertical */}
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-10 border-r border-neutral-200 bg-white/95">
        <svg width={40} height={Math.max(1, size.h)} className="block">
          {Array.from({ length: 51 }).map((_, i) => {
            const y = (i / 50) * Math.max(1, size.h);
            const major = i % 5 === 0;
            return (
              <g key={i}>
                <line
                  x1={40}
                  y1={y}
                  x2={major ? 24 : 32}
                  y2={y}
                  stroke={major ? "#64748b" : "#cbd5e1"}
                  strokeWidth="1"
                />
                {major && i > 0 && (
                  <text x={2} y={y - 3} fontSize="9" fill="#475569">
                    {fmt(((25 - i) / 50) * ruler.spanY, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute left-1 top-1 z-20 rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-neutral-600">
        {unit}
      </div>

      {/* Toolbar */}
      <div className="pointer-events-auto absolute right-3 top-11 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/95 px-2.5 py-2 shadow-md backdrop-blur">
        <div className="flex overflow-hidden rounded-md border border-neutral-200">
          <button onClick={() => setView("iso")} className="px-2 py-1 text-xs hover:bg-neutral-100">Iso</button>
          <button onClick={() => setView("front")} className="border-l px-2 py-1 text-xs hover:bg-neutral-100">Frontal</button>
          <button onClick={() => setView("top")} className="border-l px-2 py-1 text-xs hover:bg-neutral-100">Superior</button>
          <button onClick={() => setView("right")} className="border-l px-2 py-1 text-xs hover:bg-neutral-100">Derecha</button>
        </div>

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs"
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
          Claro
        </label>

        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={showShadow} onChange={(e) => setShowShadow(e.target.checked)} />
          Sombras
        </label>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-600">Luz</span>
          <input
            className="w-20"
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
          className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white ${
            paywall && !entitled ? "bg-neutral-900 hover:bg-black" : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={paywall && !entitled ? "Necesitas comprar para descargar" : "Descargar STL"}
        >
          {paywall && !entitled ? "Comprar para descargar" : "Descargar STL"}
        </button>
      </div>

      {modelInfo && (
        <div className="pointer-events-none absolute bottom-3 left-12 z-20 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Dimensiones reales
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-neutral-800">
            X {fmtDim(modelInfo.x, unit)} · Y {fmtDim(modelInfo.y, unit)} · Z {fmtDim(modelInfo.z, unit)}
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-500">
            {modelInfo.triangles.toLocaleString("es-ES")} triángulos · paso recomendado {fmt(ruler.step, unit)} {unit}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-md bg-neutral-900/75 px-2.5 py-1.5 text-[10px] text-white">
        Arrastrar: rotar · Rueda: zoom · Botón derecho: desplazar
      </div>
    </div>
  );
}
