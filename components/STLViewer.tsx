// teknovashop-app/components/STLViewer.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type HoleSpec = { x_mm: number; z_mm: number; d_mm: number };

type Props = {
  url?: string;
  height: number;
  background?: string;
  modelColor?: string;

  holesMode?: boolean;
  holeDiameter?: number;
  holes?: HoleSpec[];
  onAddHole?: (h: HoleSpec) => void;

  statusText?: string;
};

export default function STLViewer({
  url,
  height,
  background = "#ffffff",
  modelColor = "#3f444c",

  holesMode = false,
  holeDiameter = 5,
  holes = [],
  onAddHole,

  statusText,
}: Props) {
  // Refs con tipos relajados para evitar conflictos de definiciones en CI
  const mountRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const raycaster = useRef<any>(new THREE.Raycaster());
  const mouse = useRef<any>(new THREE.Vector2());

  // ---------- init ----------
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(45, container.clientWidth / height, 0.1, 20000);
    cam.position.set(420, 320, 420);
    cameraRef.current = cam;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3af, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(300, 500, 400);
    scene.add(hemi, dir);

    // Grid + ejes
    const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.9;
    grid.position.y = -0.01;
    const axes = new THREE.AxesHelper(140);
    scene.add(grid, axes);

    // Grupo de marcadores
    const markers = new THREE.Group();
    markersRef.current = markers;
    scene.add(markers);

    // Controles
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Resize
    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      rendererRef.current?.render?.(sceneRef.current, cameraRef.current);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose?.();
      rendererRef.current?.dispose?.();
      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      try {
        if (renderer.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      } catch {}
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      controlsRef.current = null;
      modelRef.current = null;
      markersRef.current = null;
    };
  }, [height, background]);

  // ---------- helpers ----------
  function fitCamera(obj: any) {
    const camera = cameraRef.current;
    if (!camera || !obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center); // centro al origen
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.2;
    camera.position.set(dist, dist * 0.7, dist);
    camera.near = 0.1;
    camera.far = dist * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function clearModel() {
    const scene = sceneRef.current;
    if (!scene) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      modelRef.current = null;
    }
  }

  function addMarkerXZ(x: number, z: number, d: number) {
    const r = Math.max(0.5, d / 2);
    const geo = new THREE.CircleGeometry(r, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.1, z);
    mesh.rotation.x = -Math.PI / 2;
    markersRef.current?.add(mesh);
  }

  // ---------- carga STL ----------
  useEffect(() => {
    if (!sceneRef.current) return;

    clearModel();
    markersRef.current?.clear?.();

    if (!url) return;

    const loader = new STLLoader();
    const col = new THREE.Color(modelColor);
    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.55 });
        const mesh = new THREE.Mesh(geom, mat);
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

        modelRef.current = mesh;
        sceneRef.current.add(mesh);
        fitCamera(mesh);

        holes.forEach((h) => addMarkerXZ(h.x_mm, h.z_mm, h.d_mm));
      },
      undefined,
      (err) => console.error("STL load error", err)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, modelColor]);

  // ---------- repintar marcadores si cambian ----------
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clear?.();
    holes.forEach((h) => addMarkerXZ(h.x_mm, h.z_mm, h.d_mm));
  }, [holes]);

  // ---------- picking para “agujeros” ----------
  useEffect(() => {
    const el = rendererRef.current?.domElement as HTMLCanvasElement | undefined;
    if (!el) return;

    const onClick = (ev: MouseEvent) => {
      if (!holesMode) return;
      if (!sceneRef.current || !cameraRef.current) return;

      const rect = el.getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);

      const target = modelRef.current ? [modelRef.current] : [];
      let pointWorld: any | null = null; // ← ¡CAMBIO CLAVE! (antes THREE.Vector3 | null)

      if (target.length) {
        const hits = raycaster.current.intersectObjects(target, true);
        if (hits.length > 0) {
          pointWorld = hits[0].point.clone();
        }
      }
      if (!pointWorld) return;

      const local = modelRef.current.worldToLocal(pointWorld.clone());
      const x_mm = local.x;
      const z_mm = local.z;

      addMarkerXZ(x_mm, z_mm, holeDiameter);
      onAddHole?.({ x_mm, z_mm, d_mm: holeDiameter });
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [holesMode, holeDiameter, onAddHole]);

  // ---------- HUD ----------
  const hud = useMemo(() => {
    if (!statusText) return null;
    return (
      <div className="pointer-events-none absolute left-3 top-2 z-10 rounded bg-white/80 px-2 py-1 text-[11px] text-gray-700 shadow">
        {statusText}
      </div>
    );
  }, [statusText]);

  // ---------- botones de vista ----------
  const viewBtns = (
    <div className="absolute bottom-3 left-3 z-10 flex gap-2">
      {[
        { k: "Iso", fn: () => cameraRef.current?.position.set(420, 320, 420) },
        { k: "Top", fn: () => cameraRef.current?.position.set(0, 600, 0) },
        { k: "Front", fn: () => cameraRef.current?.position.set(600, 100, 0) },
        { k: "Right", fn: () => cameraRef.current?.position.set(0, 100, 600) },
        { k: "Reset", fn: () => fitCamera(modelRef.current) },
      ].map((b) => (
        <button
          key={b.k}
          onClick={b.fn}
          className="rounded border border-gray-300 bg-white/90 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
          type="button"
        >
          {b.k}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative w-full">
      {hud}
      {viewBtns}
      <div
        ref={mountRef}
        className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm"
        style={{ height }}
      />
    </div>
  );
}
