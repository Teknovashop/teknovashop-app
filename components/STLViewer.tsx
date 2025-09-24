// components/STLViewer.tsx
// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type Marker = {
  x?: number; y?: number; z?: number; d?: number;
  x_mm?: number; y_mm?: number; z_mm?: number; d_mm?: number;
  nx?: number; ny?: number; nz?: number;
  axis?: "auto" | "x" | "y" | "z";
  side?: "left" | "right" | "top" | "bottom";
};

type STLViewerProps = {
  stlUrl?: string;
  width?: number;
  height?: number;
  background?: string;
  box?: { length: number; height: number; width: number; thickness?: number };
  holesMode?: boolean;               // si true, habilita “modo agujeros”
  addDiameter?: number;              // diámetro por defecto al añadir
  snapStep?: number;                 // rejilla de snap (mm). 0/undefined = libre
  onAddMarker?(m: Marker): void;     // callback al añadir agujero
  markers?: Marker[];
  onMeasure?(mm: number): void;
};

export default function STLViewer({
  stlUrl,
  width = 800,
  height = 520,
  background,
  box,
  holesMode = false,
  addDiameter = 6,
  snapStep,
  onAddMarker,
  markers = [],
  onMeasure,
}: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [distanceMM, setDistanceMM] = useState<number | null>(null);

  const state = useMemo(
    () => ({
      renderer: null as any,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 5000),
      model: null as any,
      hitTarget: null as any,
      markerGroup: new THREE.Group(),
      helpersGroup: new THREE.Group(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as any,
      axes: null as any,
    }),
    [width, height]
  );

  const snap = (v: number) => (!snapStep || snapStep <= 0 ? v : Math.round(v / snapStep) * snapStep);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(typeof window !== "undefined" ? window.devicePixelRatio : 1);
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    state.scene.background = background ? new THREE.Color(background) : new THREE.Color(0xf6f7fb);

    // Y arriba
    state.camera.position.set(220, 140, 220);
    state.camera.up.set(0, 1, 0);
    state.camera.lookAt(0, 0, 0);
    state.scene.rotation.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.9);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    hemi.position.set(0, 200, 0);
    dir.position.set(200, 220, 160);
    state.scene.add(hemi, dir);

    // Grid en XZ (suelo)
    state.grid = new THREE.GridHelper(1000, 100);
    (state.grid.material as any).opacity = 0.45;
    (state.grid.material as any).transparent = true;
    state.scene.add(state.grid);

    state.axes = new THREE.AxesHelper(120); // X rojo, Y verde (vertical), Z azul
    state.scene.add(state.axes);

    state.markerGroup.name = "markers";
    state.helpersGroup.name = "helpers";
    state.scene.add(state.markerGroup, state.helpersGroup);

    // Controles ligeros
    let isDragging = false;
    let last = { x: 0, y: 0 };
    const el = renderer.domElement as HTMLElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.camera.position.multiplyScalar(Math.sign(e.deltaY) > 0 ? 1.1 : 0.9);
    };
    const onDown = (e: MouseEvent) => {
      // Si vamos a poner agujero con modificador, NO activamos drag
      const usingModifier = e.shiftKey || e.altKey;
      if (holesMode && usingModifier) return;
      isDragging = true;
      last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const rot = 0.005;
      state.scene.rotation.y += dx * rot;
      state.scene.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.scene.rotation.x + dy * rot));
    };
    const onUp = () => (isDragging = false);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }

    const tempPts: any[] = [];
    const onClick = (e: MouseEvent) => {
      const target = state.model || state.hitTarget;
      if (!target) return;

      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hits = state.raycaster.intersectObject(target, true);
      if (!hits.length) return;

      const usingModifier = e.shiftKey || e.altKey;

      // --- MODO AGUJEROS: SOLO con Shift/Alt ---
      if (holesMode) {
        if (!usingModifier) return; // ignorar clics sin modificador

        const hit = hits[0];
        const localPoint = (hit.object as any).worldToLocal(hit.point.clone());
        const normalWorld = hit.face?.normal
          ? hit.face.normal.clone().transformDirection((hit.object as any).normalMatrix).normalize()
          : new THREE.Vector3(0, 1, 0);

        const nx = normalWorld.x, ny = normalWorld.y, nz = normalWorld.z;
        const abs = { x: Math.abs(nx), y: Math.abs(ny), z: Math.abs(nz) };
        let axis: "x" | "y" | "z" = "x";
        if (abs.y >= abs.x && abs.y >= abs.z) axis = "y"; else if (abs.z >= abs.x && abs.z >= abs.y) axis = "z";

        const x_mm = snap(localPoint.x);
        const y_mm = snap(localPoint.y);
        const z_mm = snap(localPoint.z);

        onAddMarker?.({ x_mm, y_mm, z_mm, d_mm: addDiameter ?? 6, nx, ny, nz, axis });
        return;
      }

      // --- MEDICIÓN (dos clics) ---
      const hit = hits[0];
      tempPts.push(hit.point.clone());
      if (tempPts.length === 2) {
        const [a, b] = tempPts;
        const mm = a.distanceTo(b);
        setDistanceMM(mm);
        onMeasure?.(mm);
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        const mat = new THREE.LineBasicMaterial({ transparent: true });
        const line = new THREE.Line(geo, mat);
        state.scene.add(line);
        setTimeout(() => { state.scene.remove(line); geo.dispose(); mat.dispose(); }, 1500);
        tempPts.length = 0;
      }
    };
    el.addEventListener("click", onClick);

    let raf = 0;
    const tick = () => { state.renderer!.render(state.scene, state.camera); raf = requestAnimationFrame(tick); };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      if (typeof window !== "undefined") {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      el.removeEventListener("click", onClick);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [height, width, background, holesMode, addDiameter, snapStep, onAddMarker]);

  // Carga STL
  useEffect(() => {
    if (!state.renderer) return;

    if (state.model) {
      state.scene.remove(state.model);
      (state.model.geometry as THREE.BufferGeometry).dispose();
      (state.model.material as THREE.Material).dispose();
      state.model = null;
    }

    if (!stlUrl) return;

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
          metalness: 0.15,
          roughness: 0.5,
          opacity: 1,
          transparent: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.scene.add(mesh);
        state.model = mesh;

        const bb = geometry.boundingBox!;
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);

        // base a Y=0
        state.scene.position.set(-center.x, -bb.min.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(120, maxDim * 2.2);
        state.camera.position.set(dist, dist * 0.55, dist);
        state.camera.lookAt(0, 0, 0);
        state.scene.rotation.set(0, 0, 0);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl]);

  // Caja guía (clicable) en Y-up + wireframe
  useEffect(() => {
    state.helpersGroup.clear();
    if (state.hitTarget) {
      state.scene.remove(state.hitTarget);
      state.hitTarget = null;
    }
    if (!box) return;
    const { length, height: h, width: w } = box;

    const boxGeo = new THREE.BoxGeometry(length, h, w);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.28 });
    const solid = new THREE.Mesh(boxGeo, boxMat);
    solid.position.set(0, h / 2, 0);
    state.scene.add(solid);
    state.hitTarget = solid;

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(length, h, w));
    const edgesMat = new THREE.LineBasicMaterial({ opacity: 0.7, transparent: true });
    const wire = new THREE.LineSegments(edgesGeo, edgesMat);
    wire.position.set(0, h / 2, 0);
    state.helpersGroup.add(wire);

    return () => {
      state.helpersGroup.clear();
      if (state.hitTarget) {
        state.scene.remove(state.hitTarget);
        (solid.geometry as any)?.dispose?.();
        (solid.material as any)?.dispose?.();
        state.hitTarget = null;
      }
      edgesGeo.dispose();
      edgesMat.dispose();
    };
  }, [box]);

  // Marcadores
  useEffect(() => {
    if (!state.renderer) return;
    state.markerGroup.clear();
    if (!markers?.length) return;

    for (const m of markers) {
      const x = (m.x_mm ?? m.x ?? 0);
      const y = (m.y_mm ?? m.y ?? 0);
      const z = (m.z_mm ?? m.z ?? 0);
      const d = (m.d_mm ?? m.d ?? 4);
      const r = Math.max(0.6, Math.min(2.5, d / 6));

      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff5500, opacity: 0.95, transparent: true });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(x, y, z);
      state.markerGroup.add(sphere);

      if (typeof m.nx === "number" && typeof m.ny === "number" && typeof m.nz === "number") {
        const dir = new THREE.Vector3(m.nx, m.ny, m.nz).normalize().multiplyScalar(10);
        const arrGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, y, z),
          new THREE.Vector3(x, y, z).add(dir),
        ]);
        const arrMat = new THREE.LineBasicMaterial({ transparent: true });
        const line = new THREE.Line(arrGeo, arrMat);
        state.markerGroup.add(line);
      }
    }
  }, [markers]);

  const topLeftText = holesMode
    ? "Shift/Alt + clic: añadir marcador"
    : distanceMM
    ? `Medida: ${distanceMM.toFixed(1)} mm`
    : "Click x2 para medir";

  return (
    <div className="relative rounded-2xl shadow-sm border bg-white" style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-white/85 rounded">
        {topLeftText}
      </div>
      <button
        onClick={() => {
          state.scene.rotation.set(0, 0, 0);
          state.camera.position.set(220, 140, 220);
          state.camera.up.set(0, 1, 0);
          state.camera.lookAt(0, 0, 0);
        }}
        className="absolute top-2 right-2 text-xs px-2 py-1 bg-white/85 rounded hover:bg-white"
      >
        Reset
      </button>
    </div>
  );
}
