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
  stlUrl?: string; // URL firmada o blob
  box?: Box;

  width?: number;
  height?: number;

  markers?: Marker[];

  onMeasure?(mm: number): void;

  /** === Opcionales UX === */
  background?: string | null;
  holesMode?: boolean; // Alt + click añade agujero
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
  width = 800,
  height = 520,
  markers = [],
  onMeasure,

  background = null,
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

  // Estado interno (sin tipos THREE.* para no romper el build en Vercel)
  const state = useMemo(
    () => ({
      renderer: null as any,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 8000),
      model: null as any, // Mesh | null

      // Placeholder (cuando no hay STL)
      boxMesh: null as any, // Mesh | null

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
      dragLocked: false, // bloqueo de drag con Alt
      last: { x: 0, y: 0 },
      needsRender: true,

      // offset usado para centrar la pieza; IMPORTANTÍSIMO para coords locales
      sceneOffset: new THREE.Vector3(0, 0, 0),
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
    const fontSize = 32;
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
    const s = 0.8;
    sprite.scale.set((canvas.width / canvas.height) * s, s, 1);
    return sprite;
  }, []);

  /** Reglas 3D con ticks y texto */
  const buildRulers = useCallback(
    (range: number) => {
      state.labelsGroup.clear();

      const tickMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 });
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

          if (mm % 20 === 0) {
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

  /** Centra cámara en pieza/caja y guarda offset */
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

    // guardamos el offset con el que “centramos” todo
    state.scene.position.set(-center.x, -center.y, -center.z);
    state.sceneOffset.copy(state.scene.position); // <- es negativo

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = Math.max(100, maxDim * 2.2);
    state.camera.near = Math.max(0.1, maxDim / 500);
    state.camera.far = Math.max(2000, maxDim * 10);

    const setFromAxis = (m: "free" | "x" | "y" | "z") => {
      if (m === "x") state.camera.position.set(dist, 0, 0);
      else if (m === "y") state.camera.position.set(0, dist, 0);
      else if (m === "z") state.camera.position.set(0, 0, dist);
      else state.camera.position.set(dist, dist * 0.6, dist);
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

    state.lightHemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    state.lightHemi.position.set(0, 200, 0);
    state.lightDir = new THREE.DirectionalLight(0xffffff, 0.95);
    state.lightDir.position.set(160, 200, 120);
    state.scene.add(state.lightHemi, state.lightDir);

    state.grid = new THREE.GridHelper(2000, 200);
    (state.grid.material as any).opacity = 0.35;
    (state.grid.material as any).transparent = true;
    state.scene.add(state.grid);

    state.axes = new THREE.AxesHelper(160);
    state.scene.add(state.axes);

    state.markerGroup.name = "markers";
    state.scene.add(state.markerGroup);

    // Controles de cámara (drag/zoom)
    const el = renderer.domElement;
    const rotSpeed = 0.005;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.1 : 0.9;
      state.camera.position.multiplyScalar(s);
      needRender();
    };
    const onDown = (e: MouseEvent) => {
      // Si mantienes Alt, bloqueamos el drag para permitir añadir agujero sin “tirón”
      state.dragLocked = e.altKey && holesMode;
      state.isDragging = !state.dragLocked;
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
    const onUp = () => {
      state.isDragging = false;
      state.dragLocked = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // Clicks: medir (2 clicks) y añadir agujeros con **Alt**
    const tempPts: any[] = [];
    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);

      // 1) Intentamos intersectar con el modelo
      let hitPoint: any = null;

      if (state.model) {
        const hits = state.raycaster.intersectObject(state.model, true);
        if (hits.length) hitPoint = hits[0].point.clone();
      }

      // 2) Si no hay modelo, tomamos plano superior de la caja; si tampoco, suelo (Y=0)
      if (!hitPoint) {
        const yPlane =
          box ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -(box.height / 2)) : new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const p = new THREE.Vector3();
        const ok = state.raycaster.ray.intersectPlane(yPlane, p);
        if (ok && Number.isFinite(p.x)) hitPoint = p.clone();
      }
      if (!hitPoint) return;

      // === Añadir agujero: SOLO Alt+click ===
      if (holesMode && e.altKey) {
        // Convertimos mundo -> local del modelo sumando el offset con el que centramos la escena
        const local = hitPoint.clone().sub(state.sceneOffset);
        const snap = Math.max(0, snapStep || 0);
        const sx = snap ? Math.round(local.x / snap) * snap : local.x;
        const sz = snap ? Math.round(local.z / snap) * snap : local.z;

        const marker: Marker = {
          x_mm: sx,
          y_mm: 0,
          z_mm: sz,
          d_mm: addDiameter || 5,
        };

        // Visual: esfera opaca donde clicas (en mundo, con el offset aplicado)
        const r = Math.max(0.8, Math.min(2.5, marker.d_mm / 5.5));
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x1f77ff,
          metalness: 0.1,
          roughness: 0.35,
          transparent: false,
        });
        const sphere = new THREE.Mesh(geo, mat);
        const worldPos = new THREE.Vector3(marker.x_mm, marker.y_mm ?? 0, marker.z_mm).add(state.sceneOffset);
        sphere.position.copy(worldPos);
        state.markerGroup.add(sphere);

        onAddMarker?.(marker);
        needRender();
        return;
      }

      // Medición (dos clicks normales) si no estamos añadiendo agujeros
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

    // Render loop (solo si hay cambios)
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

      // limpiar escena para evitar “fantasmas”
      state.scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) obj.material.dispose?.();
      });

      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [background, height, holesMode, addDiameter, onAddMarker, onMeasure, snapStep, width, axisMode, state, box]);

  /** Placeholder sólido cuando no hay STL */
  useEffect(() => {
    if (!state.renderer) return;

    if (state.boxMesh) {
      state.scene.remove(state.boxMesh);
      (state.boxMesh.geometry as any)?.dispose?.();
      (state.boxMesh.material as any)?.dispose?.();
      state.boxMesh = null;
    }
    if (box && !stlUrl) {
      const geo = new THREE.BoxGeometry(box.length, box.height, box.width);
      const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.05, roughness: 0.8, transparent: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(box.length / 2, box.height / 2, box.width / 2);
      state.scene.add(mesh);
      state.boxMesh = mesh;
    }
    fitToTarget();
  }, [box, stlUrl, fitToTarget, state]);

  /** Carga/recarga STL */
  useEffect(() => {
    if (!state.renderer) return;

    if (!stlUrl) {
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
          color: 0xf5f5f5,
          metalness: 0.1,
          roughness: 0.55,
          transparent: false, // OPACO
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

        // quita placeholder si sigue por ahí
        if (state.boxMesh) {
          state.scene.remove(state.boxMesh);
          (state.boxMesh.geometry as any)?.dispose?.();
          (state.boxMesh.material as any)?.dispose?.();
          state.boxMesh = null;
        }

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
      const r = Math.max(0.8, Math.min(2.5, (m.d_mm ?? addDiameter) / 5.5));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1f77ff, metalness: 0.1, roughness: 0.35, transparent: false });
      const worldPos = new THREE.Vector3(m.x_mm, m.y_mm ?? 0, m.z_mm).add(state.sceneOffset);
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(worldPos);
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

  /** Cuando cambia el modo de cámara, reencuadra */
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
    <div className="relative rounded-2xl border bg-white/60 shadow-sm" style={{ width, height }}>
      <div ref={mountRef} className="h-full w-full select-none" />

      {/* HUD superior-izquierda: modo/ayudas */}
      <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/85 px-2 py-1 text-xs">
        {distanceMM ? `Medida: ${distanceMM.toFixed(1)} mm` : "Alt + clic = agujero"}
      </div>

      {/* Controles de cámara */}
      <div className="absolute left-2 top-10 z-10 flex items-center gap-2 rounded bg-white/85 p-1 text-xs">
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
      <div className="absolute left-2 top-20 z-10 flex items-center gap-2 rounded bg-white/85 p-2 text-xs">
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
