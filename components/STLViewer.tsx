// teknovashop-app/components/STLViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Qué quiere renderizar el visor */
type Mode = "auto" | "preview" | "stl";

type Preview =
  | { kind: "cable_tray"; params: { width_mm: number; height_mm: number; length_mm: number; thickness_mm: number; ventilated: boolean } }
  | { kind: "vesa_adapter"; params: { vesa_mm: number; thickness_mm: number; clearance_mm: number } }
  | { kind: "router_mount"; params: { router_width_mm: number; router_depth_mm: number; thickness_mm: number } };

type Props = {
  url?: string;
  preview?: Preview;
  mode?: Mode;
  height: number;
  background?: string;
  modelColor?: string;
  quality?: "low" | "high";
  showAxes?: boolean;
  showGrid?: boolean;

  /** Interacción agujeros (solo preview) */
  allowHolePlacement?: boolean;
  holeRadiusMm?: number;
  onAddHole?: (pt: { x: number; z: number }) => void;

  /** Texto discreto en esquina inferior */
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
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const objectRef = useRef<any>(null);   // mesh o grupo actual
  const controlsRef = useRef<any>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const [sizeLabel, setSizeLabel] = useState<string>("");

  // ---------- init ----------
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const w = container.clientWidth || 800;
    const camera = new THREE.PerspectiveCamera(45, w / height, 0.1, 20000);
    camera.position.set(420, 320, 420);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const DPR = quality === "high" ? Math.min(window.devicePixelRatio ?? 1, 2) : 1;
    renderer.setPixelRatio(DPR);
    renderer.shadowMap.enabled = quality === "high";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(w, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0xa3a3a3, 0.9);
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(500, 800, 600);
    dir.castShadow = quality === "high";
    scene.add(hemi, dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Auxiliares
    if (showAxes) {
      const axes = new THREE.AxesHelper(80);
      axes.position.y = 0.01;
      scene.add(axes);
    }
    if (showGrid) {
      const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
      (grid.material as any).transparent = true;
      (grid.material as any).opacity = 0.85;
      grid.position.y = -0.01;
      scene.add(grid);
    }

    // Grupo para marcadores (agujeros)
    const markers = new THREE.Group();
    scene.add(markers);
    markersRef.current = markers;

    // Resize
    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w2 = mountRef.current.clientWidth;
      cameraRef.current.aspect = w2 / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w2, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
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
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      } catch {}
      controlsRef.current = null;
      objectRef.current = null;
      markersRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [height, background, quality, showAxes, showGrid]);

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
    showSizeLabel(obj);
  }

  function fitCamera(obj: any) {
    const camera = cameraRef.current;
    if (!camera || !obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center); // centrado

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.2;
    camera.position.set(dist, dist * 0.7, dist);
    camera.near = 0.1;
    camera.far = dist * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function showSizeLabel(obj: any) {
    const box = new THREE.Box3().setFromObject(obj);
    const s = box.getSize(new THREE.Vector3());
    setSizeLabel(`${s.x.toFixed(0)} × ${s.y.toFixed(0)} × ${s.z.toFixed(0)} mm`);
  }

  function addMarkerAt(point: THREE.Vector3) {
    if (!markersRef.current) return;
    const col = new THREE.Color("#10b981"); // verde
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(1.2, holeRadiusMm * 0.15), 16, 12),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.4 })
    );
    sphere.position.copy(point);
    markersRef.current.add(sphere);
  }

  // ---------- PREVIEW ----------
  useEffect(() => {
    const shouldShowPreview = mode === "preview" || (mode === "auto" && !url);
    if (!shouldShowPreview || !preview || !sceneRef.current) return;

    const col = new THREE.Color(modelColor);
    const group = new THREE.Group();

    if (preview.kind === "cable_tray") {
      const { width_mm: W, height_mm: H, length_mm: L, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.55 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), mat);
      base.receiveShadow = true; base.castShadow = true;
      base.position.set(0, -H / 2 + T / 2, 0);

      const side1 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side1.receiveShadow = true; side1.castShadow = true;
      side1.position.set(0, 0, -W / 2 + T / 2);

      const side2 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side2.receiveShadow = true; side2.castShadow = true;
      side2.position.set(0, 0, W / 2 - T / 2);

      group.add(base, side1, side2);
    }

    if (preview.kind === "vesa_adapter") {
      const { vesa_mm: V, thickness_mm: T, clearance_mm: C } = preview.params;
      const size = V + 2 * C + 20;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.55 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(size, T, size), mat);
      plate.castShadow = true; plate.receiveShadow = true;
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
      ].map((p) => { const m = new THREE.Mesh(hGeo, mh); m.position.copy(p); return m; });
      group.add(...holes);
    }

    if (preview.kind === "router_mount") {
      const { router_width_mm: W, router_depth_mm: D, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.55 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), mat);
      base.castShadow = true; base.receiveShadow = true;
      base.position.set(0, -D * 0.3, 0);

      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, D * 0.6, T), mat);
      wall.castShadow = true; wall.receiveShadow = true;
      wall.position.set(0, 0, -D / 2 + T / 2);

      group.add(base, wall);
    }

    addObject(group);
  }, [preview, mode, url, modelColor]);

  // ---------- STL ----------
  useEffect(() => {
    const shouldShowStl = mode === "stl" || (mode === "auto" && !!url);
    if (!shouldShowStl || !url || !sceneRef.current) return;

    const loader = new STLLoader();
    const col = new THREE.Color(modelColor);
    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.55 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
        addObject(mesh);
      },
      undefined,
      (err) => console.error("STL load error", err)
    );
  }, [url, mode, modelColor]);

  // ---------- interacción: click para “agujeros” ----------
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const onClick = (ev: MouseEvent) => {
      if (!allowHolePlacement || !objectRef.current || !onAddHole) return;

      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const hits = raycaster.current.intersectObject(objectRef.current, true);
      if (hits && hits.length > 0) {
        const p = hits[0].point.clone();
        addMarkerAt(p);
        onAddHole({ x: p.x, z: p.z });
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [allowHolePlacement, onAddHole, holeRadiusMm]);

  return (
    <div ref={mountRef} style={{ height }} className="relative w-full overflow-hidden rounded-xl">
      {/* HUD inferior izquierda */}
      {sizeLabel && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/80 px-2 py-1 text-[11px] text-gray-700 shadow-sm">
          {sizeLabel} · grid 50 mm
        </div>
      )}
      {watermark && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-white/80 px-2 py-1 text-[11px] text-gray-600 shadow-sm">
          {watermark}
        </div>
      )}
    </div>
  );
}
