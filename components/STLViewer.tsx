// components/STLViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type Marker = {
  x_mm: number;
  /** OPCIONAL para compat con models/registry */
  y_mm?: number;
  z_mm: number;
  d_mm: number;
  side?: "left" | "right" | "top" | "bottom";
};

type STLViewerProps = {
  stlUrl?: string;
  width?: number;
  height?: number;
  holesMode?: boolean;
  onAddMarker?: (m: Marker) => void;
  markers?: Marker[];
};

export default function STLViewer({
  stlUrl,
  width = 880,
  height = 520,
  holesMode = false,
  onAddMarker,
  markers = [],
}: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [distanceMM, setDistanceMM] = useState<number | null>(null);

  const state = useMemo(() => {
    return {
      renderer: null as THREE.WebGLRenderer | null,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(40, width / height, 0.1, 5000),
      model: null as THREE.Mesh | null,
      markerGroup: new THREE.Group(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as THREE.GridHelper | null,
      axes: null as THREE.AxesHelper | null,
      dragging: false,
      last: { x: 0, y: 0 },
    };
  }, [width, height]);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    state.camera.position.set(260, 180, 260);
    state.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 200, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(120, 150, 80);
    state.scene.add(hemi, dir);

    const grid = new THREE.GridHelper(1200, 120, 0x888888, 0xcccccc);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    state.grid = grid;
    state.scene.add(grid);

    const axes = new THREE.AxesHelper(120);
    state.axes = axes;
    state.scene.add(axes);

    state.markerGroup.name = "markers";
    state.scene.add(state.markerGroup);

    const el = renderer.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.12 : 0.9;
      state.camera.position.multiplyScalar(s);
    };
    const onDown = (e: MouseEvent) => {
      if (holesMode && (e.shiftKey || e.altKey)) return;
      state.dragging = true;
      state.last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.last.x;
      const dy = e.clientY - state.last.y;
      state.last = { x: e.clientX, y: e.clientY };
      const rot = 0.005;
      state.scene.rotation.y += dx * rot;
      state.scene.rotation.x = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, state.scene.rotation.x + dy * rot)
      );
    };
    const onUp = () => {
      state.dragging = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    const tmpPts: THREE.Vector3[] = [];
    const onClick = (e: MouseEvent) => {
      if (!state.model) return;
      const wantHole = holesMode && (e.shiftKey || e.altKey);

      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hits = state.raycaster.intersectObject(state.model, true);
      if (!hits.length) return;

      const p = hits[0].point.clone();

      if (wantHole) {
        onAddMarker?.({
          x_mm: p.x,
          y_mm: p.y, // existe, pero el tipo lo permite opcional
          z_mm: p.z,
          d_mm: 5,
        });
        return;
      }

      tmpPts.push(p);
      if (tmpPts.length === 2) {
        const [a, b] = tmpPts;
        const mm = a.distanceTo(b);
        setDistanceMM(mm);
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        const mat = new THREE.LineBasicMaterial({ transparent: true });
        const line = new THREE.Line(geo, mat);
        state.scene.add(line);
        setTimeout(() => {
          state.scene.remove(line);
          geo.dispose();
          mat.dispose();
        }, 1400);
        tmpPts.length = 0;
      }
    };
    el.addEventListener("click", onClick);

    let raf = 0;
    const tick = () => {
      state.renderer!.render(state.scene, state.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

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
  }, [height, width, holesMode]);

  // Carga STL
  useEffect(() => {
    if (!state.renderer || !stlUrl) return;

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: 0xb8b8b8,
          metalness: 0.15,
          roughness: 0.6,
          transparent: false,
          opacity: 1,
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

        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        state.scene.position.set(-center.x, -bb.min.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(240, maxDim * 2.2);
        state.camera.position.set(dist, dist * 0.62, dist);
        state.camera.lookAt(0, 0, 0);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl, state.renderer]);

  // Pintar marcadores (tolera y_mm indefinido)
  useEffect(() => {
    if (!state.renderer) return;
    state.markerGroup.clear();
    if (!markers?.length) return;

    for (const m of markers) {
      const r = Math.max(0.7, Math.min(2.8, (m.d_mm || 5) / 6));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff9900,
        opacity: 0.95,
        transparent: true,
      });
      const sp = new THREE.Mesh(geo, mat);
      sp.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      state.markerGroup.add(sp);
    }
  }, [JSON.stringify(markers), state.renderer]);

  return (
    <div className="relative rounded-2xl shadow-sm border bg-white/60" style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-white/80 rounded">
        {holesMode
          ? "Shift/Alt + clic: añadir marcador"
          : distanceMM
          ? `Medida: ${distanceMM.toFixed(1)} mm`
          : "Click x2 para medir"}
      </div>
      <button
        onClick={() => {
          state.camera.position.set(260, 180, 260);
          state.camera.lookAt(0, 0, 0);
        }}
        className="absolute top-2 right-2 text-xs px-2 py-1 bg-white/80 rounded hover:bg-white"
      >
        Reset
      </button>
    </div>
  );
}
