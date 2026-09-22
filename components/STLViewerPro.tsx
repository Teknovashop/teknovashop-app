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
type CameraView = "iso" | "front" | "top" | "right";

type RulerTick = {
  px: number;
  valueMm: number;
  major: boolean;
};

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

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / power;
  if (fraction <= 1) return power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;
  return 10 * power;
}

function makeRulerTicks(lengthPx: number, worldPerPx: number, majorMm: number): RulerTick[] {
  if (!lengthPx || !worldPerPx || !majorMm) return [];

  const minorMm = majorMm / 5;
  const halfWorld = (lengthPx * worldPerPx) / 2;
  const first = Math.ceil(-halfWorld / minorMm) * minorMm;
  const ticks: RulerTick[] = [];

  for (let value = first; value <= halfWorld + minorMm / 2; value += minorMm) {
    const px = lengthPx / 2 + value / worldPerPx;
    const quotient = value / majorMm;
    const major = Math.abs(quotient - Math.round(quotient)) < 1e-5;
    ticks.push({ px, valueMm: Math.abs(value) < 1e-7 ? 0 : value, major });
  }
  return ticks;
}

function formatRulerValue(valueMm: number, unit: Unit): string {
  const value = unit === "cm" ? valueMm / 10 : valueMm;
  const abs = Math.abs(value);
  if (abs >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return value.toFixed(abs < 10 ? 1 : 0);
}

function formatDimension(valueMm: number, unit: Unit): string {
  if (unit === "cm") return `${(valueMm / 10).toFixed(valueMm < 100 ? 1 : 0)} cm`;
  return `${valueMm.toFixed(valueMm < 10 ? 1 : 0)} mm`;
}

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const groupRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);
  const groundRef = useRef<any>(null);
  const dirLightRef = useRef<any>(null);

  const [bgLight, setBgLight] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);
  const [unit, setUnit] = useState<Unit>("mm");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [worldPerPixel, setWorldPerPixel] = useState(1);
  const [majorStepMm, setMajorStepMm] = useState(50);
  const [modelInfo, setModelInfo] = useState<{
    x: number;
    y: number;
    z: number;
    triangles: number;
  } | null>(null);

  const paywall = isPaywallOn();
  const entitled = useMemo(() => hasEntitlement(), []);

  const topTicks = useMemo(
    () => makeRulerTicks(size.w, worldPerPixel, majorStepMm),
    [size.w, worldPerPixel, majorStepMm]
  );
  const leftTicks = useMemo(
    () => makeRulerTicks(size.h, worldPerPixel, majorStepMm),
    [size.h, worldPerPixel, majorStepMm]
  );

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

  function updateViewScale() {
    const camera = cameraRef.current as THREE.PerspectiveCamera | null;
    const controls = controlsRef.current as OrbitControls | null;
    const mount = mountRef.current;
    if (!camera || !controls || !mount) return;

    const distance = camera.position.distanceTo(controls.target);
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.max(distance, 0.001);
    const wpp = visibleHeight / Math.max(1, mount.clientHeight);
    const major = niceStep(wpp * 85);

    setWorldPerPixel(wpp);
    setMajorStepMm(major);
  }

  function fitCameraToObject(obj: any, view: CameraView = "iso") {
    const camera = cameraRef.current as THREE.PerspectiveCamera | null;
    const controls = controlsRef.current as OrbitControls | null;
    if (!camera || !controls || !obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const objectSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(objectSize.x, objectSize.y, objectSize.z, 1);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.55;

    const dir = new THREE.Vector3();
    if (view === "front") dir.set(0, 0, 1);
    else if (view === "top") dir.set(0, 1, 0);
    else if (view === "right") dir.set(1, 0, 0);
    else dir.set(1, 0.82, 1).normalize();

    camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
    camera.near = Math.max(0.05, maxDim / 1000);
    camera.far = Math.max(distance * 20, maxDim * 100);
    camera.up.set(0, 1, 0);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
    updateViewScale();
  }

  function setCameraView(view: CameraView) {
    if (groupRef.current && meshRef.current) fitCameraToObject(groupRef.current, view);
  }

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

    // Rejilla métrica: 1000 mm con subdivisiones de 10 mm.
    const grid = new THREE.GridHelper(1000, 100, 0xbfc7d1, 0xe6e9ee);
    (grid.material as any).opacity = 0.72;
    (grid.material as any).transparent = true;
    scene.add(grid);

    const axes = new THREE.AxesHelper(70);
    scene.add(axes);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(300, 400, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);
    dirLightRef.current = dir;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.ShadowMaterial({ opacity: showShadow ? 0.16 : 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 4000;
    controlsRef.current = controls;

    mount.appendChild(renderer.domElement);

    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = Math.max(1e-6, clientWidth / Math.max(1, clientHeight));
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      setSize({ w: clientWidth, h: clientHeight });
      updateViewScale();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    controls.addEventListener("change", updateViewScale);
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
      controls.removeEventListener("change", updateViewScale);
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

  useEffect(() => {
    const r = rendererRef.current as any;
    if (!r) return;

    r.toneMappingExposure = 0.8 + tone * 0.7;
    r.shadowMap.enabled = showShadow;

    if (dirLightRef.current) dirLightRef.current.castShadow = showShadow;
    if (groundRef.current) {
      const gm = groundRef.current.material as any;
      gm.opacity = showShadow ? 0.16 : 0;
      gm.needsUpdate = true;
    }

    groupRef.current?.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = showShadow;
        o.receiveShadow = showShadow;
      }
    });
  }, [tone, showShadow]);

  useEffect(() => {
    const scene = sceneRef.current as any;
    if (!scene) return;

    scene.background = new THREE.Color(bgLight ? 0xf7f7f8 : 0x0d0f12);

    const mesh = meshRef.current as any;
    if (mesh?.material) mesh.material.color.setHex(bgLight ? 0xdedede : 0xaaaaaa);

    const edges = edgesRef.current as any;
    if (edges?.material) edges.material.color.setHex(bgLight ? 0x262626 : 0xffffff);
  }, [bgLight]);

  useEffect(() => {
    const group = groupRef.current as any;
    if (!group) return;

    while (group.children.length) {
      const child = group.children.pop()!;
      (child as any).geometry?.dispose?.();
      const mat: any = (child as any).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
        else mat.dispose?.();
      }
      child.removeFromParent();
    }

    meshRef.current = null;
    edgesRef.current = null;
    setModelInfo(null);

    if (!url) {
      updateViewScale();
      return;
    }

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        const bb = geometry.boundingBox!;
        const objectSize = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        const triangles = Math.round((geometry.getAttribute("position")?.count ?? 0) / 3);

        setModelInfo({
          x: objectSize.x,
          y: objectSize.y,
          z: objectSize.z,
          triangles,
        });

        const mat = new THREE.MeshStandardMaterial({
          color: bgLight ? 0xdedede : 0xaaaaaa,
          metalness: 0.08,
          roughness: 0.78,
        });

        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = showShadow;
        mesh.receiveShadow = showShadow;
        group.add(mesh);
        meshRef.current = mesh;

        const edgesGeom = new THREE.EdgesGeometry(geometry, 15);
        const edgesMat = new THREE.LineBasicMaterial({
          color: bgLight ? 0x262626 : 0xffffff,
          transparent: true,
          opacity: 0.92,
        });
        const edges = new THREE.LineSegments(edgesGeom, edgesMat);
        group.add(edges);
        edgesRef.current = edges;

        group.position.set(-center.x, -center.y, -center.z);

        if (groundRef.current) {
          groundRef.current.position.y = -objectSize.y / 2 - 0.02;
        }

        fitCameraToObject(group, "iso");
      },
      undefined,
      () => {}
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm ${
        className ?? "h-[560px]"
      }`}
    >
      {/* Regla horizontal dinámica */}
      <div className="pointer-events-none absolute left-11 right-0 top-0 z-20 h-8 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <svg className="h-full w-full" viewBox={`0 0 ${Math.max(1, size.w - 44)} 32`} preserveAspectRatio="none">
          {topTicks.map((tick, i) => {
            const x = tick.px - 44;
            if (x < 0 || x > size.w - 44) return null;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={32}
                  x2={x}
                  y2={tick.major ? 13 : 22}
                  stroke={tick.major ? "#64748b" : "#cbd5e1"}
                  strokeWidth="1"
                />
                {tick.major && (
                  <text
                    x={x + 3}
                    y={11}
                    fontSize="9"
                    fill="#475569"
                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  >
                    {formatRulerValue(tick.valueMm, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Regla vertical dinámica */}
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-11 border-r border-neutral-200 bg-white/95 backdrop-blur">
        <svg className="h-full w-full" viewBox={`0 0 44 ${Math.max(1, size.h)}`} preserveAspectRatio="none">
          {leftTicks.map((tick, i) => {
            const y = tick.px;
            if (y < 32 || y > size.h) return null;
            return (
              <g key={i}>
                <line
                  x1={44}
                  y1={y}
                  x2={tick.major ? 26 : 34}
                  y2={y}
                  stroke={tick.major ? "#64748b" : "#cbd5e1"}
                  strokeWidth="1"
                />
                {tick.major && (
                  <text
                    x={3}
                    y={y - 3}
                    fontSize="9"
                    fill="#475569"
                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  >
                    {formatRulerValue(-tick.valueMm, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Unidad / escala */}
      <div className="absolute left-2 top-2 z-30 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-600 shadow-sm">
        {unit} · paso {formatRulerValue(majorStepMm, unit)}
      </div>

      {/* Barra de herramientas CAD */}
      <div className="pointer-events-auto absolute right-3 top-11 z-30 flex max-w-[calc(100%-64px)] flex-wrap items-center justify-end gap-1.5 rounded-xl border border-neutral-200/80 bg-white/95 p-2 shadow-md backdrop-blur">
        <div className="mr-1 flex overflow-hidden rounded-lg border border-neutral-200">
          {(["iso", "front", "top", "right"] as CameraView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setCameraView(view)}
              className="border-r border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 last:border-r-0 hover:bg-neutral-100"
              title={`Vista ${view}`}
            >
              {view === "iso" ? "Iso" : view === "front" ? "Frontal" : view === "top" ? "Superior" : "Derecha"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCameraView("iso")}
          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          title="Ajustar pieza al visor"
        >
          Ajustar
        </button>

        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
          title="Unidad de las reglas"
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
        </select>

        <label className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700">
          <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
          Claro
        </label>

        <label className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700">
          <input type="checkbox" checked={showShadow} onChange={(e) => setShowShadow(e.target.checked)} />
          Sombras
        </label>

        <label className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-700">
          <span>Exposición</span>
          <input
            className="w-20"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.currentTarget.value))}
          />
        </label>

        <button
          onClick={downloadCurrentSTL}
          disabled={!meshRef.current}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            paywall && !entitled
              ? "bg-neutral-900 hover:bg-black"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={paywall && !entitled ? "Necesitas comprar para descargar" : "Descargar STL"}
        >
          {paywall && !entitled ? "Comprar para descargar" : "Descargar STL"}
        </button>
      </div>

      {/* Información dimensional */}
      {modelInfo && (
        <div className="pointer-events-none absolute bottom-3 left-14 z-30 rounded-xl border border-neutral-200/80 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Dimensiones reales</div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-neutral-800">
            X {formatDimension(modelInfo.x, unit)} · Y {formatDimension(modelInfo.y, unit)} · Z {formatDimension(modelInfo.z, unit)}
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-500">
            {modelInfo.triangles.toLocaleString("es-ES")} triángulos · rejilla base 10 mm
          </div>
        </div>
      )}

      {/* Ayuda de navegación */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-lg bg-neutral-900/75 px-2.5 py-1.5 text-[10px] text-white shadow-sm backdrop-blur">
        Arrastrar: rotar · Rueda: zoom · Botón derecho: desplazar
      </div>
    </div>
  );
}
