"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type RendererBundle = {
  THREE: any;
  renderer: any;
  STLLoader: any;
  mergeVertices: any;
  toCreasedNormals: any;
  environment: any;
};

let rendererBundlePromise: Promise<RendererBundle> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
const snapshotCache = new Map<string, Promise<string>>();

async function getRendererBundle(): Promise<RendererBundle> {
  if (!rendererBundlePromise) {
    rendererBundlePromise = (async () => {
      const THREE = await import("three");
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const { mergeVertices, toCreasedNormals } = await import(
        "three/examples/jsm/utils/BufferGeometryUtils.js"
      );
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });

      // One renderer for the whole page. Product cards receive static snapshots
      // so scrolling 72+ products never creates dozens of live WebGL contexts.
      renderer.setPixelRatio(1);
      renderer.setSize(960, 600, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      return {
        THREE,
        renderer,
        STLLoader,
        mergeVertices,
        toCreasedNormals,
        environment,
      };
    })();
  }
  return rendererBundlePromise;
}

async function renderSnapshot(slug: string): Promise<string> {
  const {
    THREE,
    renderer,
    STLLoader,
    mergeVertices,
    toCreasedNormals,
    environment,
  } = await getRendererBundle();

  const response = await fetch(
    "/api/catalog/mesh/" + encodeURIComponent(slug),
    { cache: "force-cache" }
  );
  if (!response.ok) throw new Error("mesh unavailable");

  const buffer = await response.arrayBuffer();
  const rawGeometry = new STLLoader().parse(buffer);
  const mergedGeometry = mergeVertices(rawGeometry, 1e-4);
  rawGeometry.dispose();

  const geometry = toCreasedNormals(mergedGeometry, Math.PI / 4);
  if (geometry !== mergedGeometry) mergedGeometry.dispose();
  geometry.center();

  const scene = new THREE.Scene();
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(32, 960 / 600, 0.1, 100);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x111a25,
    metalness: 0.68,
    roughness: 0.22,
    clearcoat: 0.48,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Canonical builders are Z-up. Convert to Y-up and then choose a stable
  // product-camera orientation from the real proportions of the geometry.
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = 0;
  scene.add(mesh);

  let box = new THREE.Box3().setFromObject(mesh);
  const preSize = new THREE.Vector3();
  box.getSize(preSize);

  const horizontalLong = Math.max(preSize.x, preSize.z);
  const horizontalShort = Math.max(0.001, Math.min(preSize.x, preSize.z));
  const longRatio = horizontalLong / horizontalShort;
  const isFlat = preSize.y < horizontalLong * 0.28;
  const isTall = preSize.y > horizontalLong * 0.9;

  // Long channels/plates need less yaw so the top surface stays visible.
  // Compact/tall products get the stronger three-quarter angle used by the
  // curated Studio renders.
  if (longRatio > 2.6) mesh.rotation.y = -0.30;
  else if (isTall) mesh.rotation.y = -0.68;
  else mesh.rotation.y = -0.52;

  if (isFlat && longRatio < 1.8) {
    mesh.rotation.z = 0.02;
  }

  mesh.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxExtent = Math.max(size.x, size.y, size.z) || 1;
  const fillFactor = longRatio > 3.2 ? 3.15 : 2.9;
  mesh.scale.setScalar(fillFactor / maxExtent);
  mesh.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.position.x -= center.x;
  mesh.position.z -= center.z;
  mesh.position.y -= box.min.y - 0.08;
  mesh.updateMatrixWorld(true);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshPhysicalMaterial({
      color: 0x8bb6d6,
      metalness: 0.12,
      roughness: 0.34,
      transparent: true,
      opacity: 0.42,
      envMapIntensity: 0.7,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x314b66, 3.1));

  const key = new THREE.DirectionalLight(0xffffff, 5.4);
  key.position.set(-4.8, 7.5, 6.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5bbcff, 4.2);
  rim.position.set(5.8, 4.8, 2.4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xb9dcff, 2.2);
  fill.position.set(-3.2, 2.2, -4.5);
  scene.add(fill);

  const front = new THREE.DirectionalLight(0xffffff, 1.25);
  front.position.set(0.5, 3.6, 6.5);
  scene.add(front);

  camera.position.set(4.15, 3.05, 5.55);
  camera.lookAt(0, 0.68, 0);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  // Compose the transparent WebGL render onto an explicit light Studio
  // background before exporting. This avoids browsers encoding transparent
  // WebP pixels against black and guarantees visual parity across themes.
  const studioCanvas = document.createElement("canvas");
  studioCanvas.width = 960;
  studioCanvas.height = 600;
  const ctx = studioCanvas.getContext("2d");
  if (!ctx) throw new Error("studio canvas unavailable");

  // Studio background intentionally mirrors the visual language of the
  // curated Production renders: icy blue light, blueprint details and a glossy
  // technical floor.
  const gradient = ctx.createLinearGradient(0, 0, 960, 600);
  gradient.addColorStop(0, "#e8f6ff");
  gradient.addColorStop(0.40, "#c7e7fb");
  gradient.addColorStop(0.72, "#88b7db");
  gradient.addColorStop(1, "#4d789d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 600);

  const glow = ctx.createRadialGradient(235, 95, 18, 235, 95, 360);
  glow.addColorStop(0, "rgba(255,255,255,0.98)");
  glow.addColorStop(0.45, "rgba(255,255,255,0.52)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 960, 600);

  // Blueprint construction lines: subtle enough to stay commercial.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 1;
  for (let x = 44; x < 960; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 360);
    ctx.stroke();
  }
  for (let y = 34; y < 360; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(120,190,235,0.28)";
  ctx.setLineDash([7, 7]);
  ctx.strokeRect(64, 56, 188, 92);
  ctx.strokeRect(708, 62, 178, 108);
  ctx.beginPath();
  ctx.arc(808, 144, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Glossy floor and perspective guides.
  const floor = ctx.createLinearGradient(0, 355, 0, 600);
  floor.addColorStop(0, "rgba(231,247,255,0.46)");
  floor.addColorStop(0.18, "rgba(109,158,196,0.42)");
  floor.addColorStop(1, "rgba(22,55,82,0.52)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 355, 960, 245);

  ctx.save();
  ctx.strokeStyle = "rgba(208,238,255,0.20)";
  ctx.lineWidth = 1;
  const horizonY = 378;
  for (let x = -240; x <= 1200; x += 90) {
    ctx.beginPath();
    ctx.moveTo(480, horizonY);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 410; y < 600; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.drawImage(renderer.domElement, 0, 0, 960, 600);
  const dataUrl = studioCanvas.toDataURL("image/webp", 0.92);

  geometry.dispose();
  material.dispose();
  ground.geometry.dispose();
  (ground.material as any).dispose?.();

  return dataUrl;
}

function snapshotFor(slug: string): Promise<string> {
  const existing = snapshotCache.get(slug);
  if (existing) return existing;

  // Serialize snapshot generation. This keeps exactly one WebGL context and one
  // render job active regardless of whether the catalogue has 18, 72 or 500
  // products.
  const task = renderQueue
    .catch(() => undefined)
    .then(() => renderSnapshot(slug));

  renderQueue = task.catch(() => undefined);
  snapshotCache.set(slug, task);

  task.catch(() => snapshotCache.delete(slug));
  return task;
}

export default function ProductStudioPreview({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      (entries) => setActive(Boolean(entries[0]?.isIntersecting)),
      { rootMargin: "420px 0px" }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active || snapshot) return;
    let cancelled = false;

    snapshotFor(slug)
      .then((src) => {
        if (!cancelled) {
          setSnapshot(src);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [active, slug, snapshot]);

  return (
    <div
      ref={hostRef}
      className={
        "relative h-full w-full overflow-hidden " +
        "bg-[radial-gradient(circle_at_28%_14%,rgba(255,255,255,.98),transparent_29%)," +
        "linear-gradient(145deg,#e9f7ff_0%,#b7d9f1_55%,#779fbe_100%)] " +
        className
      }
      aria-label={"Vista Studio 3D de " + slug}
    >
      {snapshot && (
        <Image
          src={snapshot}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition duration-700 group-hover:scale-[1.025]"
        />
      )}

      {active && !snapshot && !failed && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-500/20 border-t-slate-700/70" />
        </div>
      )}

      {active && failed && (
        <div className="absolute inset-0 grid place-items-center px-5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
          Vista Studio temporalmente no disponible
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#071321]/12 to-transparent" />
    </div>
  );
}
