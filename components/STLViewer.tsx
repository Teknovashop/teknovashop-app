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
  holesMode?: boolean;      // Alt + click añade agujero
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

  // Estado interno
  const state = useMemo(() => ({
    renderer: null as unknown as THREE.WebGLRenderer,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 8000),

    model: null as THREE.Mesh | null,         // STL cargado
    boxMesh: null as THREE.Mesh | null,       // placeholder cuando no hay STL
    get target(): THREE.Object3D | null {     // dónde colgar marcadores
      return this.model ?? this.boxMesh;
    },

    markerGroup: new THREE.Group(),           // se reparenta dentro del target
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    grid: null as unknown as THREE.GridHelper,
    axes: null as unknown as THREE.AxesHelper,
    labelsGroup: new THREE.Group(),
    clippingPlane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), // z+
    lightHemi: null as unknown as THREE.HemisphereLight,
    lightDir: null as unknown as THREE.DirectionalLight,
    isDragging: false,
    dragLocked: false, // bloqueo de drag con Alt
    last: { x: 0, y: 0 },
    needsRender: true,
  }), [width, height]);

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
  const buildRulers = useCallback((range: number) => {
    state.labelsGroup.clear();

    const tickMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 });
    const tickGeo = new THREE.BufferGeometry();
    const verts: number[] = [];

    const addTick = (p1: THREE.Vector3, p2: THREE.Vector3) => {
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
  }, [makeTextSprite, needRender, state]);

  /** Centrar cámara al target (STL o caja) */
  const fitToTarget = useCallback(() => {
    let bb: THREE.Box3 | null = null;

    const targetMesh = state.model ?? state.boxMesh;
    if (targetMesh) {
      const g = targetMesh.geometry as THREE.BufferGeometry;
      g.computeBoundingBox?.();
      bb = g.boundingBox?.clone() ?? null;
      if (bb) {
        // como nuestra box está posicionada (no centrada), la BB debe transformarse a mundo:
        bb.applyMatrix4(targetMesh.matrixWorld);
      }
    } else if (box) {
      // fallback si no hay nada
      bb = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(box.length, box.height, box.width));
    }

    if (!bb) return;

    const size = new THREE.Vector3().subVectors(bb.max, bb.min);
    const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);

    // colocamos la escena con el centro en el origen para rotar cómodo
    state.scene.position.set(-center.x, -center.y, -center.z);

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

  /** Reparentar el grupo de marcadores dentro del target actual */
  const reparentMarkers = useCallback(() => {
    const t = state.target;
    if (!t) {
      // si no hay target, cuelga de la escena (no ideal, pero evita perderlos)
      if (state.markerGroup.parent !== state.scene) state.scene.add(state.markerGroup);
      return;
    }
    if (state.markerGroup.parent !== t) {
      // mantener posiciones en mundo antes de reparentar
      const worldPositions: THREE.Vector3[] = [];
      state.markerGroup.children.forEach((c) => {
        const v = new THREE.Vector3();
        c.getWorldPosition(v);
        worldPositions.push(v);
      });
      t.add(state.markerGroup);
      // re-colocar en coords locales del nuevo padre
      state.markerGroup.children.forEach((c, i) => {
        const local = worldPositions[i].clone();
        t.worldToLocal(local);
        c.position.copy(local);
      });
      needRender();
    }
  }, [needRender, state]);

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
      state.dragLocked = e.altKey && holesMode; // si Alt en modo agujeros, no rotamos
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
    const tempPts: THREE.Vector3[] = [];
    const onClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);

      const target = state.target;
      let hitPointWorld: THREE.Vector3 | null = null;

      if (target) {
        const hits = state.raycaster.intersectObject(target, true);
        if (hits.length) hitPointWorld = hits[0].point.clone();
      }
      // Si no hay target o no hay intersección, usa plano Y=0 (suelo)
      if (!hitPointWorld) {
        const p = new THREE.Vector3();
        const ok = state.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
        if (ok) hitPointWorld = p.clone();
      }
      if (!hitPointWorld) return;

      // === Añadir agujero: SOLO Alt+click ===
      if (holesMode && e.altKey) {
        // Pasamos el punto a coordenadas locales del target (esto arregla todo)
        const local = hitPointWorld.clone();
        if (target) target.worldToLocal(local);

        const snap = Math.max(0, snapStep || 0);
        const sx = snap ? Math.round(local.x / snap) * snap : local.x;
        const sy = local.y; // por si lo necesitas más adelante
        const sz = snap ? Math.round(local.z / snap) * snap : local.z;

        const marker: Marker = {
          x_mm: sx,
          y_mm: sy,
          z_mm: sz,
          d_mm: addDiameter || 5,
        };

        // Visual: esfera opaca, hija del target, en coords locales (no se desalineará jamás)
        const r = Math.max(0.8, Math.min(2.5, marker.d_mm / 5.5));
        const geo = new THREE.SphereGeometry(r, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x1f77ff, metalness: 0.1, roughness: 0.35 });
        const sphere = new THREE.Mesh(geo, mat);

        if (target) {
          target.add(state.markerGroup); // asegúrate de que el grupo está bajo el target
          sphere.position.set(marker.x_mm, marker.y_mm ?? 0, marker.z_mm);
          state.markerGroup.add(sphere);
        } else {
          // caso rarísimo sin target
          sphere.position.copy(hitPointWorld);
          state.scene.add(sphere);
        }

        onAddMarker?.(marker); // <-- aquí envías coords locales al backend
        needRender();
        return;
      }

      // Medición (dos clicks normales) si no estamos añadiendo agujeros
      if (!holesMode) {
        tempPts.push(hitPointWorld.clone());
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

      state.scene.traverse(obj => {
        // @ts-ignore
        if (obj.geometry) (obj as any).geometry.dispose?.();
        // @ts-ignore
        if (obj.material) (obj as any).material.dispose?.();
      });

      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [background, height, holesMode, addDiameter, onAddMarker, onMeasure, snapStep, width, axisMode, state, needRender]);

  /** Placeholder sólido cuando no hay STL */
  useEffect(() => {
    if (!state.renderer) return;

    // quita placeholder anterior
    if (state.boxMesh) {
      state.scene.remove(state.boxMesh);
      (state.boxMesh.geometry as any)?.dispose?.();
      (state.boxMesh.material as any)?.dispose?.();
      state.boxMesh = null;
    }

    if (box && !stlUrl) {
      const geo = new THREE.BoxGeometry(box.length, box.height, box.width);
      const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.05, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      // posicionado con su “esquina” en (0,0,0) para que coincida con tu backend
      mesh.position.set(box.length / 2, box.height / 2, box.width / 2);
      state.scene.add(mesh);
      state.boxMesh = mesh;
      reparentMarkers();
    }
    fitToTarget();
  }, [box, stlUrl, fitToTarget, reparentMarkers, state]);

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

        // limpia modelo previo
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

        // si había placeholder, quítalo
        if (state.boxMesh) {
          state.scene.remove(state.boxMesh);
          (state.boxMesh.geometry as any)?.dispose?.();
          (state.boxMesh.material as any)?.dispose?.();
          state.boxMesh = null;
        }

        reparentMarkers();
        fitToTarget();
        needRender();
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl, state, fitToTarget, needRender, reparentMarkers]);

  /** Pintar marcadores que vengan por props (como hijos del target) */
  useEffect(() => {
    if (!state.renderer) return;

    const t = state.target ?? state.scene;
    // limpiar
    state.markerGroup.clear();
    if (!markers?.length) {
      needRender();
      return;
    }
    // asegúrate de colgar el grupo en el target actual
    if (state.markerGroup.parent !== t) t.add(state.markerGroup);

    for (const m of markers) {
      const r = Math.max(0.8, Math.min(2.5, (m.d_mm ?? addDiameter) / 5.5));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1f77ff, metalness: 0.1, roughness: 0.35 });
      const sphere = new THREE.Mesh(geo, mat);
      // ¡COORDENADAS LOCALES DEL TARGET!
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
