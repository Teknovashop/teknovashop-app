"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export type Marker = {
  x_mm: number;
  y_mm?: number;
  z_mm: number;
  d_mm: number;
  nx?: number; ny?: number; nz?: number;
  axis?: "auto" | "x" | "y" | "z";
};

type STLViewerProProps = {
  stlUrl?: string;
  background?: string;
  box: { length: number; width: number; height: number; thickness?: number };
  markers: Marker[];
  onMarkersChange(next: Marker[]): void;

  holesMode?: boolean;
  addDiameter?: number;
  snapStep?: number;

  width?: number;
  height?: number;
};

export default function STLViewerPro({
  stlUrl,
  background = "#ffffff",
  box,
  markers,
  onMarkersChange,
  holesMode = true,
  addDiameter = 5,
  snapStep = 1,
  width = 980,
  height = 560,
}: STLViewerProProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [cameraLock, setCameraLock] = useState<"free" | "x" | "y" | "z">("free");
  const [clipEnabled, setClipEnabled] = useState<boolean>(false);
  const [clipHeight, setClipHeight] = useState<number>(0);

  const state = useMemo(() => ({
    renderer: null as any,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(40, width / height, 0.1, 8000),
    model: null as any,          // THREE.Mesh
    placeholder: null as any,    // THREE.LineSegments (caja alámbrica)
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    grid: null as any,           // THREE.GridHelper
    axes: null as any,           // THREE.AxesHelper
    guides: new THREE.Group(),   // ticks + etiquetas
    markersGroup: new THREE.Group(),
    clipPlane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    controls: { dragging: false, lastX: 0, lastY: 0 },
    lights: [] as any[],
  }), [width, height]);

  // ===== init =====
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(typeof window !== "undefined" ? window.devicePixelRatio : 1);
    renderer.setSize(width, height);
    renderer.localClippingEnabled = true;
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    state.scene.background = new THREE.Color(background);

    state.camera.position.set(220, 140, 220);
    state.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 1.0);
    hemi.position.set(0, 300, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(200, 250, 120);
    state.scene.add(hemi, dir);
    state.lights.push(hemi, dir);

    // Grid XZ en y=0 (NO rotado)
    state.grid = new THREE.GridHelper(1000, 100);
    // @ts-ignore
    state.grid.material.opacity = 0.35;
    // @ts-ignore
    state.grid.material.transparent = true;
    state.grid.position.y = 0.01; // evita z-fighting
    state.scene.add(state.grid);

    state.axes = new THREE.AxesHelper(160);
    state.scene.add(state.axes);

    state.markersGroup.name = "markers";
    state.guides.name = "guides";
    state.scene.add(state.markersGroup, state.guides);

    const el = renderer.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.1 : 0.9;
      state.camera.position.multiplyScalar(s);
    };
    const onDown = (e: MouseEvent) => {
      state.controls.dragging = true;
      state.controls.lastX = e.clientX;
      state.controls.lastY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!state.controls.dragging) return;
      const dx = e.clientX - state.controls.lastX;
      const dy = e.clientY - state.controls.lastY;
      state.controls.lastX = e.clientX;
      state.controls.lastY = e.clientY;

      const rot = 0.005;
      if (cameraLock === "free") {
        state.scene.rotation.y += dx * rot;
        state.scene.rotation.x += dy * rot;
      } else if (cameraLock === "x") {
        state.scene.rotation.x += dy * rot;
      } else if (cameraLock === "y") {
        state.scene.rotation.y += dx * rot;
      } else if (cameraLock === "z") {
        state.scene.rotation.z += dx * rot * 0.5;
      }
    };
    const onUp = () => { state.controls.dragging = false; };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // ALT+click = agujero
    const onClick = (e: MouseEvent) => {
      if (!holesMode) return;
      if (!e.altKey) return;
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);

      // intersecta modelo si existe o plano Y=0
      let hitPoint: any = null;
      const targets: any[] = [];
      if (state.model) targets.push(state.model);
      const hits = state.raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        hitPoint = hits[0].point;
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const _hit = new THREE.Vector3();
        const ok = state.raycaster.ray.intersectPlane(plane, _hit);
        if (ok) hitPoint = _hit.clone();
      }
      if (!hitPoint) return;

      const snap = (v: number) => Math.round(v / snapStep) * snapStep;
      const m: Marker = {
        x_mm: snap(hitPoint.x),
        y_mm: snap(hitPoint.y),
        z_mm: snap(hitPoint.z),
        d_mm: addDiameter,
      };
      onMarkersChange([...(markers || []), m]);
    };
    el.addEventListener("click", onClick);

    let raf = 0;
    const tick = () => {
      if (clipEnabled) {
        state.clipPlane.set(new THREE.Vector3(0, -1, 0), -clipHeight);
        state.renderer.clippingPlanes = [state.clipPlane];
      } else {
        state.renderer.clippingPlanes = [];
      }
      state.renderer.render(state.scene, state.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel as any);
      el.removeEventListener("mousedown", onDown as any);
      window.removeEventListener("mousemove", onMove as any);
      window.removeEventListener("mouseup", onUp as any);
      el.removeEventListener("click", onClick as any);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [background, width, height, holesMode, addDiameter, snapStep, cameraLock, clipEnabled, clipHeight, markers, onMarkersChange, state]);

  // ===== placeholder (caja alámbrica) cuando no hay STL =====
  useEffect(() => {
    if (!state.renderer) return;

    // limpia anterior
    if (state.placeholder) {
      state.scene.remove(state.placeholder);
      (state.placeholder.geometry as any)?.dispose?.();
      (state.placeholder.material as any)?.dispose?.();
      state.placeholder = null;
    }

    if (stlUrl) return; // habrá modelo real

    const g = new THREE.BoxGeometry(box.length, box.height, box.width);
    const edges = new THREE.EdgesGeometry(g);
    const mat = new THREE.LineBasicMaterial({ color: 0x3b82f6 });
    const lines = new THREE.LineSegments(edges, mat);
    lines.position.set(0, box.height / 2, 0); // base en Y=0
    lines.renderOrder = 1;
    state.scene.add(lines);
    state.placeholder = lines;

    return () => {
      if (state.placeholder) {
        state.scene.remove(state.placeholder);
        (state.placeholder.geometry as any)?.dispose?.();
        (state.placeholder.material as any)?.dispose?.();
        state.placeholder = null;
      }
    };
  }, [stlUrl, box, state]);

  // ===== cargar STL =====
  useEffect(() => {
    if (!state.renderer) return;

    // quita placeholder si existía
    if (state.placeholder) {
      state.scene.remove(state.placeholder);
      (state.placeholder.geometry as any)?.dispose?.();
      (state.placeholder.material as any)?.dispose?.();
      state.placeholder = null;
    }

    if (!stlUrl) {
      // sin STL, no hacer nada más
      if (state.model) {
        state.scene.remove(state.model);
        (state.model.geometry as any)?.dispose?.();
        (state.model.material as any)?.dispose?.();
        state.model = null;
      }
      return;
    }

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.1,
          roughness: 0.6,
          opacity: 1,
          transparent: false,
        });

        if (state.model) {
          state.scene.remove(state.model);
          (state.model.geometry as any)?.dispose?.();
          (state.model.material as any)?.dispose?.();
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.renderOrder = 1;
        state.scene.add(mesh);
        state.model = mesh;

        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);

        state.scene.position.set(-center.x, -bb.min.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(200, maxDim * 2.2);
        state.camera.position.set(dist, dist * 0.6, dist);
        state.camera.lookAt(0, 0, 0);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl, state]);

  // ===== markers visibles =====
  useEffect(() => {
    if (!state.renderer) return;
    state.markersGroup.clear();
    if (!markers?.length) return;
    for (const m of markers) {
      const r = Math.max(0.8, Math.min(3, (m.d_mm ?? addDiameter) / 4));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a6df4 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      sphere.renderOrder = 2;
      state.markersGroup.add(sphere);
    }
  }, [markers, addDiameter, state]);

  // ===== guías (ticks + etiquetas) =====
  useEffect(() => {
    if (!state.renderer) return;
    state.guides.clear();

    const L = Math.max(box.length, box.width, box.height, 100);
    const step = 10;
    const tickLen = 2.5;

    const makeTicks = (axis: "x" | "z", max: number) => {
      for (let i = 0; i <= max; i += step) {
        const group = new THREE.Group();
        let a = new THREE.Vector3(), b = new THREE.Vector3();
        if (axis === "x") { a.set(i, 0.01, -tickLen); b.set(i, 0.01, +tickLen); }
        else { a.set(-tickLen, 0.01, i); b.set(+tickLen, 0.01, i); }
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        const mat = new THREE.LineBasicMaterial();
        const line = new THREE.Line(geo, mat);
        group.add(line);

        const label = makeTextSprite(`${i}mm`);
        if (axis === "x") label.position.set(i, 0.01, tickLen + 4);
        else label.position.set(tickLen + 4, 0.01, i);
        group.add(label);

        state.guides.add(group);
      }
    };

    makeTicks("x", Math.max(box.length, 100));
    makeTicks("z", Math.max(box.width, 100));
  }, [box, state]);

  const makeTextSprite = (text: string) => {
    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.font = "28px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(14, 14, 1);
    sprite.renderOrder = 3;
    return sprite;
  };

  const handleHoleField = useCallback((idx: number, key: keyof Marker, val: number) => {
    const next = [...markers];
    const m = { ...next[idx] };
    (m as any)[key] = val;
    if (key === "d_mm" && (!m.d_mm || m.d_mm <= 0)) m.d_mm = addDiameter;
    next[idx] = m;
    onMarkersChange(next);
  }, [markers, addDiameter, onMarkersChange]);

  const removeHole = useCallback((idx: number) => {
    const next = markers.slice(0, idx).concat(markers.slice(idx + 1));
    onMarkersChange(next);
  }, [markers, onMarkersChange]);

  return (
    <div className="relative rounded-2xl shadow-sm border bg-white" style={{ width, height }}>
      {/* Toolbar */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded bg-white/90 p-2 text-xs shadow">
        <span className="font-medium">Cámara:</span>
        <button className={`px-2 py-1 rounded border ${cameraLock === "free" ? "bg-black text-white" : "bg-white"}`} onClick={() => setCameraLock("free")}>Libre</button>
        <button className={`px-2 py-1 rounded border ${cameraLock === "x" ? "bg-black text-white" : "bg-white"}`} onClick={() => setCameraLock("x")}>X</button>
        <button className={`px-2 py-1 rounded border ${cameraLock === "y" ? "bg-black text-white" : "bg-white"}`} onClick={() => setCameraLock("y")}>Y</button>
        <button className={`px-2 py-1 rounded border ${cameraLock === "z" ? "bg-black text-white" : "bg-white"}`} onClick={() => setCameraLock("z")}>Z</button>

        <div className="mx-2 h-5 w-px bg-gray-200" />

        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={clipEnabled} onChange={(e) => setClipEnabled(e.target.checked)} />
          Clipping
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(10, box.height + 50)}
          value={clipHeight}
          onChange={(e) => setClipHeight(Number(e.target.value))}
          className="w-36"
          title="Altura de corte (mm)"
        />

        <div className="mx-2 h-5 w-px bg-gray-200" />

        <span>ALT+clic = agujero</span>
        <span className="ml-2">Ø def: {addDiameter} mm</span>
        <span className="ml-2">Snap: {snapStep} mm</span>
      </div>

      {/* Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Lista editable */}
      {holesMode && (
        <div className="absolute right-2 top-2 z-10 max-h-[80%] w-[300px] overflow-auto rounded border bg-white/95 p-2 text-xs shadow">
          <div className="mb-1 font-semibold">Agujeros ({markers.length})</div>
          {markers.length === 0 && <div className="text-gray-500">No hay agujeros.</div>}
          {markers.map((m, i) => (
            <div key={`${i}-${m.x_mm}-${m.z_mm}-${m.d_mm}`} className="mb-2 rounded border p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium">#{i + 1}</div>
                <button className="rounded border px-2 py-0.5 hover:bg-red-50" onClick={() => removeHole(i)}>Eliminar</button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <label className="flex flex-col">
                  <span className="text-[10px] text-gray-500">X (mm)</span>
                  <input type="number" step={snapStep} value={m.x_mm}
                         onChange={(e) => handleHoleField(i, "x_mm", Number(e.target.value))}
                         className="rounded border px-1 py-0.5"/>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Y (mm)</span>
                  <input type="number" step={snapStep} value={m.y_mm ?? 0}
                         onChange={(e) => handleHoleField(i, "y_mm", Number(e.target.value))}
                         className="rounded border px-1 py-0.5"/>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Z (mm)</span>
                  <input type="number" step={snapStep} value={m.z_mm}
                         onChange={(e) => handleHoleField(i, "z_mm", Number(e.target.value))}
                         className="rounded border px-1 py-0.5"/>
                </label>
                <label className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Ø (mm)</span>
                  <input type="number" step={0.5} value={m.d_mm}
                         onChange={(e) => handleHoleField(i, "d_mm", Number(e.target.value))}
                         className="rounded border px-1 py-0.5"/>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
