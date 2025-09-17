// teknovashop-app/components/STLViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Modo de renderizado */
type Mode = "auto" | "preview" | "stl";

/** Preview paramétrico (ligero) */
type Preview =
  | {
      kind: "cable_tray";
      params: { width_mm: number; height_mm: number; length_mm: number; thickness_mm: number; ventilated: boolean };
    }
  | { kind: "vesa_adapter"; params: { vesa_mm: number; thickness_mm: number; clearance_mm: number } }
  | { kind: "router_mount"; params: { router_width_mm: number; router_depth_mm: number; thickness_mm: number } };

/** Props del visor */
type Props = {
  url?: string;
  preview?: Preview;
  mode?: Mode;
  height: number;
  background?: string;
  modelColor?: string;

  // “Pro” options
  quality?: "low" | "high";
  showAxes?: boolean;
  showGrid?: boolean;

  // UI de agujeros
  allowHolePlacement?: boolean; // si está activo, click en el modelo genera marcador
  holeRadiusMm?: number;
  onAddHole?: (p: { x: number; z: number }) => void;

  // Watermark
  watermark?: string;
};

export default function STLViewer({
  url,
  preview,
  mode = "auto",
  height,
  background = "#ffffff",
  modelColor = "#3f444c",
  quality = "high",
  showAxes = true,
  showGrid = true,
  allowHolePlacement = false,
  holeRadiusMm = 5,
  onAddHole,
  watermark,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // IMPORTANTE: evitamos tipos de THREE en generics; usamos `any` para no romper el build en Vercel
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const objectRef = useRef<any>(null); // mesh o grupo actual (modelo)
  const controlsRef = useRef<any>(null);
  const markersRef = useRef<any>(null); // grupo de marcadores
  const gridRef = useRef<any>(null);
  const axesRef = useRef<any>(null);

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const [sizeLabel, setSizeLabel] = useState<string>("");

  // ---------- init ----------
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / height, 0.1, 10000);
    camera.position.set(420, 320, 420);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    if (quality === "high") {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3af, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(300, 500, 400);
    dir.castShadow = quality === "high";
    scene.add(hemi, dir);

    // Grid
    if (showGrid) {
      const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
      (grid.material as any).transparent = true;
      (grid.material as any).opacity = 0.9;
      grid.position.y = -0.01;
      scene.add(grid);
      gridRef.current = grid;
    }

    // Axes
    if (showAxes) {
      const axes = new THREE.AxesHelper(120);
      axesRef.current = axes;
      scene.add(axes);
    }

    // Markers group
    const markers = new THREE.Group();
    scene.add(markers);
    markersRef.current = markers;

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    const onClick = (event: MouseEvent) => {
      if (!allowHolePlacement || !objectRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, cameraRef.current);
      const intersects = raycaster.current.intersectObject(objectRef.current, true);
      if (intersects.length === 0) return;

      const p = intersects[0].point.clone(); // coordenadas en mundo
      // Como centramos el modelo en el origen, p ya está en torno (0,0,0), tomamos X/Z
      const marker = makeMarker(holeRadiusMm, modelColor);
      marker.position.copy(p);
      markersRef.current.add(marker);

      onAddHole?.({ x: p.x, z: p.z });
    };

    renderer.domElement.addEventListener("click", onClick);

    // Loop
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);

      controls.dispose();
      renderer.dispose();

      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });

      try {
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      } catch {}

      controlsRef.current = null;
      objectRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      markersRef.current = null;
      gridRef.current = null;
      axesRef.current = null;
    };
  }, [height, background, quality, showAxes, showGrid, allowHolePlacement, holeRadiusMm, modelColor, onAddHole]);

  // ---------- helpers ----------
  function addObject(obj: any) {
    const scene = sceneRef.current;
    if (!scene) return;

    if (objectRef.current) {
      scene.remove(objectRef.current);
      objectRef.current.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      objectRef.current = null;
    }
    scene.add(obj);
    objectRef.current = obj;

    fitCamera(obj);
    updateSizeLabel(obj);
  }

  function fitCamera(obj: any) {
    const camera = cameraRef.current;
    if (!camera || !obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center); // centramos el objeto

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.2;
    camera.position.set(dist, dist * 0.7, dist);
    camera.near = 0.1;
    camera.far = dist * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function updateSizeLabel(obj: any) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const gridStep = 50; // mm aprox en nuestro world
    setSizeLabel(`${size.x.toFixed(0)} × ${size.y.toFixed(0)} × ${size.z.toFixed(0)} mm · grid ${gridStep} mm`);
  }

  function makeMarker(r_mm: number, color: string) {
    const geo = new THREE.SphereGeometry(Math.max(1, r_mm * 0.5), 18, 18);
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.35 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = quality === "high";
    return m;
  }

  // ---------- PREVIEW paramétrico ----------
  useEffect(() => {
    const shouldShowPreview = mode === "preview" || (mode === "auto" && !url);
    if (!shouldShowPreview || !preview) return;

    const col = new THREE.Color(modelColor);
    const group = new THREE.Group();

    if (preview.kind === "cable_tray") {
      const { width_mm: W, height_mm: H, length_mm: L, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), mat);
      base.position.set(0, -H / 2 + T / 2, 0);

      const side1 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side1.position.set(0, 0, -W / 2 + T / 2);

      const side2 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side2.position.set(0, 0, W / 2 - T / 2);

      group.add(base, side1, side2);
    }

    if (preview.kind === "vesa_adapter") {
      const { vesa_mm: V, thickness_mm: T, clearance_mm: C } = preview.params;
      const size = V + 2 * C + 20;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(size, T, size), mat);
      group.add(plate);

      const r = 3;
      const hGeo = new THREE.CylinderGeometry(r, r, T * 1.6, 20);
      const mh = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0, roughness: 0.45 });
      const off = V / 2;
      const holes = [
        new THREE.Vector3(+off, 0, +off),
        new THREE.Vector3(-off, 0, +off),
        new THREE.Vector3(+off, 0, -off),
        new THREE.Vector3(-off, 0, -off),
      ].map((p) => {
        const m = new THREE.Mesh(hGeo, mh);
        m.position.copy(p);
        return m;
      });
      group.add(...holes);
    }

    if (preview.kind === "router_mount") {
      const { router_width_mm: W, router_depth_mm: D, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), mat);
      base.position.set(0, -D * 0.3, 0);

      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, D * 0.6, T), mat);
      wall.position.set(0, 0, -D / 2 + T / 2);

      group.add(base, wall);
    }

    addObject(group);
  }, [preview, mode, url, modelColor]);

  // ---------- STL ----------
  useEffect(() => {
    const shouldShowStl = mode === "stl" || (mode === "auto" && !!url);
    if (!shouldShowStl || !url) return;

    const loader = new STLLoader();
    const col = new THREE.Color(modelColor);

    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = quality === "high";

        // centrar en origen
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

        addObject(mesh);
      },
      undefined,
      (err) => console.error("STL load error", err)
    );
  }, [url, mode, modelColor, quality]);

  return (
    <div className="relative">
      <div ref={mountRef} style={{ height }} className="w-full rounded-xl overflow-hidden" />
      {/* HUD inferior izquierda (medidas) */}
      <div className="pointer-events-none absolute left-3 bottom-3 rounded-md bg-white/80 px-2 py-1 text-[11px] text-gray-700 shadow-sm">
        {sizeLabel}
      </div>
      {/* Watermark */}
      {watermark && (
        <div className="pointer-events-none absolute right-3 bottom-3 select-none rounded-md bg-white/70 px-2 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
          {watermark}
        </div>
      )}
    </div>
  );
}
