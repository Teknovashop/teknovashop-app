// components/STLViewer.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Retro-compatible: acepta ambas variantes de marcador + normales y eje */
export type Marker = {
  // Variante antigua (p.ej., models/registry)
  x?: number; y?: number; z?: number; d?: number;
  // Variante nueva con mm explícitos
  x_mm?: number; y_mm?: number; z_mm?: number; d_mm?: number;
  // Normales (opcionales) y eje sugerido
  nx?: number; ny?: number; nz?: number;
  axis?: "auto" | "x" | "y" | "z";
  // Cara opcional
  side?: "left" | "right" | "top" | "bottom";
};

type STLViewerProps = {
  stlUrl?: string;                  // URL firmada o blob
  width?: number;
  height?: number;
  markers?: Marker[];               // opcional
  onMeasure?(mm: number): void;     // callback distancia medida
};

export default function STLViewer({
  stlUrl,
  width = 800,
  height = 520,
  markers = [],
  onMeasure,
}: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [distanceMM, setDistanceMM] = useState<number | null>(null);

  const state = useMemo(
    () => ({
      renderer: null as THREE.WebGLRenderer | null,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 5000),
      model: null as THREE.Mesh | null,
      markerGroup: new THREE.Group(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as THREE.GridHelper | null,
      axes: null as THREE.AxesHelper | null,
    }),
    [width, height]
  );

  useEffect(() => {
    if (!mountRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    // Scene
    state.scene.background = null;

    // Camera
    state.camera.position.set(220, 140, 220);
    state.camera.lookAt(0, 0, 0);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 200, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(100, 100, 50);
    state.scene.add(hemi, dir);

    // Grid en mm (plano Y=0)
    state.grid = new THREE.GridHelper(1000, 100); // 1000mm, divisiones cada 10mm
    (state.grid.material as THREE.Material).opacity = 0.35;
    (state.grid.material as THREE.Material).transparent = true;
    state.grid.rotation.x = Math.PI / 2;
    state.scene.add(state.grid);

    // Ejes
    state.axes = new THREE.AxesHelper(120);
    state.scene.add(state.axes);

    // Grupo para marcadores
    state.markerGroup.name = "markers";
    state.scene.add(state.markerGroup);

    // Controles ligeros (drag/zoom)
    let isDragging = false;
    let last = { x: 0, y: 0 };
    const el = renderer.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.1 : 0.9;
      state.camera.position.multiplyScalar(s);
    };
    const onDown = (e: MouseEvent) => {
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
      state.scene.rotation.x += dy * rot;
    };
    const onUp = () => (isDragging = false);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // Medición 2 puntos sobre el modelo
    const tempPts: THREE.Vector3[] = [];
    const onClick = (e: MouseEvent) => {
      if (!state.model) return;
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hits = state.raycaster.intersectObject(state.model, true);
      if (hits.length) {
        tempPts.push(hits[0].point.clone());
        if (tempPts.length === 2) {
          const [a, b] = tempPts;
          const mm = a.distanceTo(b); // unidades = mm
          setDistanceMM(mm);
          onMeasure?.(mm);
          // línea temporal
          const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
          const mat = new THREE.LineBasicMaterial({ transparent: true });
          const line = new THREE.Line(geo, mat);
          state.scene.add(line);
          setTimeout(() => {
            state.scene.remove(line);
            geo.dispose();
            mat.dispose();
          }, 1500);
          tempPts.length = 0;
        }
      }
    };
    el.addEventListener("click", onClick);

    // Loop
    let raf = 0;
    const tick = () => {
      state.renderer!.render(state.scene, state.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("click", onClick);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [height, width]); // no dependemos de stlUrl/markers aquí

  // Carga/recarga STL
  useEffect(() => {
    if (!state.renderer || !stlUrl) return;
    const loader = new STLLoader();

    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          metalness: 0.1,
          roughness: 0.6,
          opacity: 1,
          transparent: false,
        });

        if (state.model) {
          state.scene.remove(state.model);
          (state.model.geometry as THREE.BufferGeometry).dispose();
          (state.model.material as THREE.Material).dispose();
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.scene.add(mesh);
        state.model = mesh;

        // Centrado y encuadre
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        state.scene.position.set(-center.x, -bb.min.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 2.2;
        state.camera.position.set(dist, dist * 0.6, dist);
        state.camera.lookAt(0, 0, 0);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl]);

  // Pintar marcadores (si vienen) – tolerante a ambas variantes
  useEffect(() => {
    if (!state.renderer) return;
    // limpiar anteriores
    state.markerGroup.clear();
    if (!markers?.length) return;

    for (const m of markers) {
      const x = (m.x_mm ?? m.x ?? 0);
      const y = (m.y_mm ?? m.y ?? 0);
      const z = (m.z_mm ?? m.z ?? 0);
      const d = (m.d_mm ?? m.d ?? 4);
      const r = Math.max(0.6, Math.min(2.5, d / 6)); // radio visual

      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ opacity: 0.9, transparent: true });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(x, y, z);
      state.markerGroup.add(sphere);

      // Si trae normales, podemos (opcional) dibujar una pequeña "flecha"
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

  return (
    <div className="relative rounded-2xl shadow-sm border bg-white/60" style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-white/80 rounded">
        {distanceMM ? `Medida: ${distanceMM.toFixed(1)} mm` : "Click x2 para medir"}
      </div>
      <button
        onClick={() => {
          state.scene.rotation.set(0, 0, 0);
          state.camera.position.set(220, 140, 220);
          state.camera.lookAt(0, 0, 0);
        }}
        className="absolute top-2 right-2 text-xs px-2 py-1 bg-white/80 rounded hover:bg-white"
      >
        Reset
      </button>
    </div>
  );
}
