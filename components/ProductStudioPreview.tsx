"use client";

import { useEffect, useRef, useState } from "react";

type RendererBundle = {
  THREE: any;
  renderer: any;
  STLLoader: any;
  mergeVertices: any;
  toCreasedNormals: any;
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

      return { THREE, renderer, STLLoader, mergeVertices, toCreasedNormals };
    })();
  }
  return rendererBundlePromise;
}

async function renderSnapshot(slug: string): Promise<string> {
  const { THREE, renderer, STLLoader, mergeVertices, toCreasedNormals } =
    await getRendererBundle();

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
  const camera = new THREE.PerspectiveCamera(30, 960 / 600, 0.1, 100);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x202a36,
    metalness: 0.34,
    roughness: 0.28,
    clearcoat: 0.32,
    clearcoatRoughness: 0.22,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Canonical builders are Z-up. Rotate once into Three.js Y-up, then give all
  // catalogue products the same premium three-quarter presentation.
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.y = -0.58;
  mesh.rotation.z = -0.06;
  scene.add(mesh);

  let box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxExtent = Math.max(size.x, size.y, size.z) || 1;
  mesh.scale.setScalar(2.75 / maxExtent);
  mesh.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.position.x -= center.x;
  mesh.position.z -= center.z;
  mesh.position.y -= box.min.y - 0.10;
  mesh.updateMatrixWorld(true);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({
      color: 0x071321,
      opacity: 0.24,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xf3f9ff, 0x203246, 3.4));

  const key = new THREE.DirectionalLight(0xffffff, 5.6);
  key.position.set(-4.5, 7.2, 6.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x77cfff, 3.0);
  rim.position.set(5.5, 4.0, 3.0);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xd6e9ff, 2.0);
  fill.position.set(-3.0, 2.5, -4.0);
  scene.add(fill);

  camera.position.set(4.1, 3.25, 5.25);
  camera.lookAt(0, 0.78, 0);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/webp", 0.9);

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
        <img
          src={snapshot}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
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
