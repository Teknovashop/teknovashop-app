// teknovashop-app/components/STLViewer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type PreviewKind = "cable_tray" | "vesa_adapter" | "router_mount";

type Preview =
  | { kind: "cable_tray"; params: { width_mm: number; height_mm: number; length_mm: number; thickness_mm: number; ventilated: boolean } }
  | { kind: "vesa_adapter"; params: { vesa_mm: number; thickness_mm: number; clearance_mm: number } }
  | { kind: "router_mount"; params: { router_width_mm: number; router_depth_mm: number; thickness_mm: number } };

type Props = {
  /** URL firmada del STL (si existe, tiene prioridad sobre el preview) */
  url?: string;
  /** Vista previa procedimental (se usa cuando no hay STL) */
  preview?: Preview;
  height: number;
  background?: string;
  modelColor?: string;
};

export default function STLViewer({
  url,
  preview,
  height,
  background = "#ffffff",
  modelColor = "#3f444c",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const objectRef = useRef<any>(null);   // mesh/grupo actual
  const controlsRef = useRef<any>(null);

  // -------- init (una vez) --------
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / height, 0.1, 10000);
    camera.position.set(400, 300, 400);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(300, 500, 400);
    scene.add(hemi);
    scene.add(dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Grid
    const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.85;
    grid.position.y = -0.01;
    scene.add(grid);

    // Resize
    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    // Loop
    let raf = 0;
    const renderLoop = () => {
      raf = requestAnimationFrame(renderLoop);
      controlsRef.current?.update?.();
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose?.();
      rendererRef.current?.dispose?.();
      // liberar geometrías
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
    };
  }, [height, background]);

  // -------- helpers --------
  function fitCameraToObject(obj: any) {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer || !obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Centrar en origen
    obj.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fitDist = maxDim * 2.2;
    camera.position.set(fitDist, fitDist * 0.7, fitDist);
    camera.near = 0.1;
    camera.far = fitDist * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function addObjectToScene(obj: any) {
    const scene = sceneRef.current;
    if (!scene) return;
    if (objectRef.current) {
      scene.remove(objectRef.current);
      // limpiar viejo
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
    fitCameraToObject(obj);
  }

  // -------- preview paramétrico (cuando no hay STL) --------
  useEffect(() => {
    if (!preview || url) return; // si hay STL, no pintamos preview
    const col = new THREE.Color(modelColor);

    const group = new THREE.Group();

    if (preview.kind === "cable_tray") {
      const { width_mm: W, height_mm: H, length_mm: L, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });

      // base + dos laterales (U-channel simplificado)
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
      // placa cuadrada con margen
      const size = V + 2 * C + 20;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(size, T, size), mat);
      group.add(plate);

      // "marcadores" de agujeros (cilindros)
      const r = 3;
      const hole = new THREE.CylinderGeometry(r, r, T * 1.5, 24);
      const mhole = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0, roughness: 0.5 });
      const h1 = new THREE.Mesh(hole, mhole);
      const h2 = new THREE.Mesh(hole, mhole);
      const h3 = new THREE.Mesh(hole, mhole);
      const h4 = new THREE.Mesh(hole, mhole);
      // esquinas a distancia V/2
      const off = V / 2;
      h1.position.set(off, 0, off);
      h2.position.set(-off, 0, off);
      h3.position.set(off, 0, -off);
      h4.position.set(-off, 0, -off);
      group.add(h1, h2, h3, h4);
    }

    if (preview.kind === "router_mount") {
      const { router_width_mm: W, router_depth_mm: D, thickness_mm: T } = preview.params;
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });

      // Escuadra en L: base + pared
      const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), mat);
      base.position.set(0, -D * 0.3, 0);

      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, D * 0.6, T), mat);
      wall.position.set(0, 0, -D / 2 + T / 2);

      group.add(base, wall);
    }

    addObjectToScene(group);
  }, [preview, url, modelColor]);

  // -------- carga de STL (tiene prioridad) --------
  useEffect(() => {
    if (!url) return;
    const scene = sceneRef.current;
    const loader = new STLLoader();
    const col = new THREE.Color(modelColor);

    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6 });
        const mesh = new THREE.Mesh(geom, mat);
        // recienteado y ajuste de cámara
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
        addObjectToScene(mesh);
      },
      undefined,
      (err) => {
        console.error("STL load error", err);
      }
    );
  }, [url, modelColor]);

  return <div ref={mountRef} style={{ height }} className="w-full rounded-xl overflow-hidden" />;
}
