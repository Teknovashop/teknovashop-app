// components/STLViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Marcador visible en el visor y que puede viajar al backend */
export type Marker = {
  x_mm: number;
  y_mm?: number;
  z_mm: number;
  d_mm: number;
  side?: "left" | "right" | "top" | "bottom";
};

type Box = { length: number; width: number; height: number; thickness?: number };

type STLViewerProps = {
  stlUrl?: string;              // URL firmada o blob
  box?: Box;

  width?: number;
  height?: number;

  markers?: Marker[];

  onMeasure?(mm: number): void;

  /** === Opcionales UX === */
  background?: string | null;
  holesMode?: boolean;      // si true: sólo Alt+click añade agujero
  addDiameter?: number;
  snapStep?: number;
  onAddMarker?(m: Marker): void;

  defaultAxis?: "free" | "x" | "y" | "z";
  defaultClipping?: boolean;
  defaultClipMM?: number;
};

export default function STLViewer({
  stlUrl,
  box,
  width = 920,
  height = 560,
  markers = [],
  onMeasure,

  background = "#fafafa",
  holesMode = false,
  addDiameter = 5,
  snapStep = 1,
  onAddMarker,

  defaultAxis = "free",
  defaultClipping = false,
  defaultClipMM = 0,
}: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [distanceMM, setDistanceMM] = useState<number | null>(null);

  // UI local (cámara y clipping)
  const [axisMode, setAxisMode] = useState<"free" | "x" | "y" | "z">(defaultAxis);
  const [clipping, setClipping] = useState<boolean>(defaultClipping);
  const [clipMM, setClipMM] = useState<number>(defaultClipMM);

  // Estado interno (sin tipos de THREE en firmas para evitar errores de build)
  const state = useMemo(
    () => ({
      renderer: null as any,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 8000),
      model: null as any,          // Mesh
      boxMesh: null as any,        // LineSegments
      markerGroup: new THREE.Group(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as any,
      axes: null as any,
      labelsGroup: new THREE.Group(),
      clippingPlane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), // z+
      lightHemi: null as any,
      lightDir: null as any,
      isDragging: false,
      last: { x: 0, y: 0 },
      needsRender: true,
    }),
    [width, height]
  );

  const needRender = useCallback(() => {
    state.needsRender = true;
  }, [state]);

  /** Texto como Sprite (para reglas) */
  const makeTextSprite = useCallback((text: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = 28;
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
    const metrics = ctx.measureText(text);
    canvas.width = Math.ceil(metrics.width + 16);
    canvas.height = Math.ceil(fontSize + 12);
    const ctx2 = canvas.getContext("2d")!;
    ctx2.font = `${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx2.fillStyle = "#111";
    ctx2.textBaseline = "top";
    ctx2.fillText(text, 8, 6);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const s = 0.75;
    sprite.scale.set((canvas.width / canvas.height) * s, s, 1);
    return sprite;
  }, []);

  /** Reglas 3D con ticks y texto */
  const buildRulers = useCallback(
    (range: number) => {
      state.labelsGroup.clear();

      const tickMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4 });
      const tickGeo = new THREE.BufferGeometry();
      const verts: number[] = [];

      const addTick = (p1: any, p2: any) => {
        verts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      };

      const addAxisTicks = (axis: "x" | "y" | "z", color: number) => {
        const dir = new THREE.Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
        const orthoA = axis === "x" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const orthoB = axis === "z" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

        for (let mm = 10; mm <= range; mm += 10) {
          const base = dir.clone().multiplyScalar(mm);
          const len = mm % 50 === 0 ? 4 : 2;
          addTick(base.clone().addScaledVector(orthoA, -len), base.clone().addScaledVector(orthoA, len));
          addTick(base.clone().addScaledVector(orthoB, -len), base.clone().addScaledVector(orthoB, len));

          if (mm % 50 === 0) {
            const label = makeTextSprite(`${mm}mm`);
            label.position.copy(base.clone().addScaledVector(orthoA, 8));
            (label.material as any).color = new THREE.Color(color);
            state.labelsGroup.add(label);
          }
        }
      };

      addAxisTicks("x", 0x3b82f6);
      addAxisTicks("y", 0x10b981);
      addAxisTicks("z", 0xf59e0b);

      tickGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const ticks = new THREE.LineSegments(tickGeo, tickMat);
      ticks.renderOrder = 1;
      state.labelsGroup.add(ticks);
      state.scene.add(state.labelsGroup);
      needRender();
    },
    [makeTextSprite, needRender, state]
  );

  /** Centra cámara en pieza/caja (no toca rotación de escena) */
  const fitToTarget = useCallback(() => {
    let bb: any = null;

    if (state.model) {
      (state.model.geometry as any).computeBoundingBox?.();
      bb = (state.model.geometry as any).boundingBox?.clone?.() ?? null;
    } else if (box) {
      bb = new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(box.length, box.height, box.width)
      );
    }

    if (!bb) return;

    const size = new THREE.Vector3().subVectors(bb.max, bb.min);
    const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);

    // trasladamos la escena para centrar, pero mantenemos la rotación actual
    state.scene.position.set(-center.x, -center.y, -center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = Math.max(120, maxDim * 2.1);
    state.camera.near = Math.max(0.1, maxDim / 500);
    state.camera.far = Math.max(2000, maxDim * 10);

    const setFromAxis = (m: "free" | "x" | "y" | "z") => {
      if (m === "x") state.camera.position.set(dist, dist * 0.2, 0);
      else if (m === "y") state.camera.position.set(0, dist, dist * 0.2);
      else if (m === "z") state.camera.position.set(0, dist * 0.2, dist);
      else state.camera.position.set(dist, dist * 0.55, dist);
    };
    setFromAxis(axisMode);
    state.camera.lookAt(0, 0, 0);
    (state.camera as any).updateProjectionMatrix?.();

    const range = Math.ceil((maxDim * 0.7) / 10) * 10;
    buildRulers(Math.min(400, Math.max(100, range)));
    needRender();
  }, [axisMode, box, buildRulers, needRender, state]);

  /** Inicialización */
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.localClippingEnabled = true;
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    state.scene.background = background === null ? null : new THREE.Color(background);

    state.camera.aspect = width / height;
    (state.camera as any).updateProjectionMatrix?.();

    state.lightHemi = new THREE.HemisphereLight(0xffffff, 0xdddddd, 1.0);
    state.lightHemi.position.set(0, 200, 0);
    state.lightDir = new THREE.DirectionalLight(0xffffff, 0.65);
    state.lightDir.position.set(160, 200, 120);
    state.scene.add(state.lightHemi, state.lightDir);

    state.grid = new THREE.GridHelper(1600, 160);
    (state.grid.material as any).opacity = 0.25;
    (state.grid.material as any).transparent = true;
    state.scene.add(state.grid);

    state.axes = new THREE.AxesHelper(200);
    state.scene.add(state.axes);

    state.markerGroup.name = "markers";
    state.scene.add(state.markerGroup);

    // Controles de cámara (drag/zoom)
    const el = renderer.domElement;
    el.style.cursor = "grab";
    const rotSpeed = 0.005;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.1 : 0.9;
      state.camera.position.multiplyScalar(s);
      needRender();
    };
    const onDown = (e: MouseEvent) => {
      state.isDragging = true;
      el.style.cursor = "grabbing";
      state.last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!state.isDragging || axisMode !== "free") return;
      const dx = e.clientX - state.last.x;
      const dy = e.clientY - state.last.y;
      state.last = { x: e.clientX, y: e.clientY };
      state.scene.rotation.y += dx * rotSpeed;
      state.scene.rotation.x += dy * rotSpeed;
      needRender();
    };
    const onUp = () => { state.isDragging = false; el.style.cursor = "grab"; };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // Clicks: medir (2 clicks) y añadir agujeros con **Alt** únicamente
    const tempPts: any[] = [];
    const onClick = (e: MouseEvent) => {
      // Evita cualquier gesto raro del navegador con Alt
      if (e.altKey) e.preventDefault();

      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);

      const targets: any[] = [];
      if (state.model) targets.push(state.model);

      // Plano de trabajo SIEMPRE viaja con la escena (Y=0 del “mundo del modelo”)
      const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), -state.scene.position.y);

      let hitPoint: any = null;
      const hits = state.raycaster.intersectObjects(targets, true);
      if (hits.length) {
        hitPoint = hits[0].point.clone();
      } else {
        const ray = state.raycaster.ray;
        const p = new THREE.Vector3();
        ray.intersectPlane(planeY0, p);
        if (Number.isFinite(p.x)) hitPoint = p;
      }

      if (!hitPoint) return;

      // Añadir agujero: SOLO Alt+click
      if (holesMode && e.altKey) {
        const snap = Math.max(0, snapStep || 0);
        const sx = snap ? Math.round(hitPoint.x / snap) * snap : hitPoint.x;
        const sz = snap ? Math.round(hitPoint.z / snap) * snap : hitPoint.z;
        const marker: Marker = {
          x_mm: sx,
          y_mm: 0,
          z_mm: sz,
          d_mm: addDiameter || 5,
        };
        const r = Math.max(0.6, Math.min(2.5, marker.d_mm / 6));
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ opacity: 0.95, transparent: true });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.set(marker.x_mm, marker.y_mm ?? 0, marker.z_mm);
        state.markerGroup.add(sphere);
        onAddMarker?.(marker);
        needRender();
        return;
      }

      // Medición (dos clicks normales) si no estamos en modo agujeros
      if (!holesMode) {
        tempPts.push(hitPoint.clone());
        if (tempPts.length === 2) {
          const [a, b] = tempPts;
          const mm = a.distanceTo(b);
          setDistanceMM(mm);
          onMeasure?.(mm);
          const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
          const mat = new THREE.LineBasicMaterial({ transparent: true });
          const line = new THREE.Line(geo, mat);
          state.scene.add(line);
          needRender();
          setTimeout(() => {
            state.scene.remove(line);
            geo.dispose();
            (mat as any).dispose?.();
            needRender();
          }, 1400);
          tempPts.length = 0;
        }
      }
    };
    el.addEventListener("click", onClick);

    // Render loop (sólo si hay cambios)
    let raf = 0;
    const tick = () => {
      if (state.needsRender) {
        renderer.render(state.scene, state.camera);
        state.needsRender = false;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Limpieza
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
  }, [background, height, holesMode, addDiameter, onAddMarker, onMeasure, snapStep, width, axisMode, state]);

  /** Crea/actualiza caja guía si no hay STL */
  useEffect(() => {
    if (!state.renderer) return;

    if (state.boxMesh) {
      state.scene.remove(state.boxMesh);
      (state.boxMesh.geometry as any)?.dispose?.();
      (state.boxMesh.material as any)?.dispose?.();
      state.boxMesh = null;
    }
    if (box && !stlUrl) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(box.length, box.height, box.width));
      const mat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.9 });
      const edges = new THREE.LineSegments(geo, mat);
      edges.position.set(box.length / 2, box.height / 2, box.width / 2);
      state.scene.add(edges);
      state.boxMesh = edges;
    }
    fitToTarget();
  }, [box, stlUrl, fitToTarget, state]);

  /** Carga/recarga STL */
  useEffect(() => {
    if (!state.renderer || !stlUrl) {
      fitToTarget();
      return;
    }
    const loader = new STLLoader();

    loader.load(
      stlUrl,
      (geometry) => {
        (geometry as any).computeBoundingBox?.();
        (geometry as any).computeVertexNormals?.();

        const material = new THREE.MeshStandardMaterial({
          color: 0xdedede,
          metalness: 0.1,
          roughness: 0.6,
          transparent: false,
          opacity: 1,
        });

        if (state.model) {
          state.scene.remove(state.model);
          (state.model.geometry as any).dispose?.();
          (state.model.material as any).dispose?.();
          state.model = null;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.scene.add(mesh);
        state.model = mesh;

        // Importante: NO reseteamos rotaciones, solo encuadre/zoom
        fitToTarget();
        needRender();
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl, state, fitToTarget, needRender]);

  /** Pintar marcadores que vengan por props */
  useEffect(() => {
    if (!state.renderer) return;
    state.markerGroup.clear();
    if (!markers?.length) {
      needRender();
      return;
    }
    for (const m of markers) {
      const r = Math.max(0.6, Math.min(2.5, (m.d_mm ?? addDiameter) / 6));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ opacity: 0.95, transparent: true });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      state.markerGroup.add(sphere);
    }
    needRender();
  }, [markers, addDiameter, needRender, state]);

  /** Clipping plane */
  useEffect(() => {
    if (!state.renderer) return;
    if (!clipping) {
      state.renderer.clippingPlanes = [];
      needRender();
      return;
    }
    state.clippingPlane.normal.set(0, 0, -1);
    state.clippingPlane.constant = clipMM;
    state.renderer.clippingPlanes = [state.clippingPlane];
    needRender();
  }, [clipping, clipMM, needRender, state]);

  /** Cuando cambia el modo de cámara, reencuadra (sin tocar rotaciones) */
  useEffect(() => {
    if (!state.renderer) return;
    fitToTarget();
  }, [axisMode, fitToTarget, state]);

  /** Reset cámara (libre) */
  const resetView = () => {
    setAxisMode("free");
    fitToTarget();
  };

  return (
    <div className="relative rounded-2xl border bg-white shadow-sm" style={{ width, height }}>
      <div ref={mountRef} className="h-full w-full" />

      {/* HUD superior-izquierda: modo/ayudas */}
      <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
        {distanceMM ? `Medida: ${distanceMM.toFixed(1)} mm` : holesMode ? "Alt + clic = agujero" : "Doble clic = medir"}
      </div>

      {/* Controles de cámara */}
      <div className="absolute left-2 top-10 flex items-center gap-2 rounded bg-white/90 p-1 text-xs shadow">
        <span className="px-1">Cámara:</span>
        {(["free", "x", "y", "z"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setAxisMode(m)}
            className={`rounded px-2 py-1 ${axisMode === m ? "bg-black text-white" : "bg-white hover:bg-gray-100 border"}`}
            title={m === "free" ? "Libre" : m.toUpperCase()}
          >
            {m === "free" ? "Libre" : m.toUpperCase()}
          </button>
        ))}
        <button onClick={resetView} className="rounded border px-2 py-1 hover:bg-gray-100">Reset</button>
      </div>

      {/* Clipping */}
      <div className="absolute left-2 top-20 flex items-center gap-2 rounded bg-white/90 p-2 text-xs shadow">
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={clipping} onChange={(e) => setClipping(e.target.checked)} />
          Clipping
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(50, box ? box.width : 200)}
          step={1}
          value={clipMM}
          onChange={(e) => setClipMM(Number(e.target.value))}
          className="w-32"
          disabled={!clipping}
        />
      </div>
    </div>
  );
}
