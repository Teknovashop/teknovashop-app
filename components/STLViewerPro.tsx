// components/STLViewerPro.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Igual que el Marker exportado por STLViewer; y_mm es opcional */
export type Marker = {
  x_mm: number;
  z_mm: number;
  d_mm: number;
  y_mm?: number;
  side?: "left" | "right" | "top" | "bottom";
};

type STLViewerProProps = {
  stlUrl?: string;
  width?: number;
  height?: number;
  markers?: Marker[];
  onMarkersChange?: (mk: Marker[]) => void;
  defaultHoleDiameter?: number;
  snapMM?: number;
};

/** util: sprite-text con canvas (sin dependencias externas) */
function makeTextSprite(text: string, font = "10px Inter, system-ui, Arial") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  const pad = 4;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = 16 + pad * 2;
  canvas.width = w;
  canvas.height = h;

  // re-pintar con tamaño real
  const ctx2 = canvas.getContext("2d")!;
  ctx2.font = font;
  ctx2.fillStyle = "rgba(255,255,255,0.9)";
  ctx2.fillRect(0, 0, w, h);
  ctx2.strokeStyle = "rgba(0,0,0,0.15)";
  ctx2.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx2.fillStyle = "#111";
  ctx2.fillText(text, pad, h - pad - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  // tamaño en “mm”: que sea legible
  const scale = 12;
  sprite.scale.set((w / h) * scale, scale, 1);
  return sprite;
}

export default function STLViewerPro({
  stlUrl,
  width = 960,
  height = 560,
  markers: markersIn = [],
  onMarkersChange,
  defaultHoleDiameter = 5,
  snapMM = 1,
}: STLViewerProProps) {
  // ======== estado UI ========
  const [snap, setSnap] = useState<number>(snapMM);
  const [holeDia, setHoleDia] = useState<number>(defaultHoleDiameter);
  const [mode, setMode] = useState<"nav" | "holes" | "measure">("nav");
  const [axisLock, setAxisLock] = useState<"free" | "yaw" | "pitch">("free");
  const [clipping, setClipping] = useState<boolean>(false);
  const [clipOffset, setClipOffset] = useState<number>(0); // mm desde el plano Y

  // ======== estado escena ========
  const mountRef = useRef<HTMLDivElement | null>(null);
  const state = useMemo(() => {
    return {
      renderer: null as THREE.WebGLRenderer | null,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(40, width / height, 0.1, 8000),
      model: null as THREE.Mesh | null,
      modelGroup: new THREE.Group(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as THREE.GridHelper | null,
      axes: null as THREE.AxesHelper | null,
      rulers: new THREE.Group(),
      markers: new THREE.Group(),
      clippingPlane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // por encima reduce Y visible
      dragging: false,
      last: { x: 0, y: 0 },
      yaw: 0,
      pitch: 0,
    };
  }, [width, height]);

  // ======== control del array de marcadores ========
  const [localMarkers, setLocalMarkers] = useState<Marker[]>(markersIn);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setLocalMarkers(markersIn);
      return;
    }
    // si vienen de fuera y son distintos, sincroniza
    if (JSON.stringify(markersIn) !== JSON.stringify(localMarkers)) {
      setLocalMarkers(markersIn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markersIn)]);

  const sn = useCallback(
    (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v),
    [snap]
  );

  const pushMarker = useCallback(
    (m: Marker) => {
      const hole: Marker = {
        x_mm: sn(m.x_mm),
        y_mm: sn(m.y_mm ?? 0),
        z_mm: sn(m.z_mm),
        d_mm: m.d_mm ?? holeDia,
      };
      const next = [...localMarkers, hole];
      setLocalMarkers(next);
      onMarkersChange?.(next);
    },
    [localMarkers, onMarkersChange, holeDia, sn]
  );

  const updateMarker = useCallback(
    (idx: number, patch: Partial<Marker>) => {
      const next = localMarkers.map((m, i) =>
        i === idx ? { ...m, ...patch } : m
      );
      setLocalMarkers(next);
      onMarkersChange?.(next);
    },
    [localMarkers, onMarkersChange]
  );

  const deleteMarker = useCallback(
    (idx: number) => {
      const next = localMarkers.filter((_, i) => i !== idx);
      setLocalMarkers(next);
      onMarkersChange?.(next);
    },
    [localMarkers, onMarkersChange]
  );

  const clearMarkers = useCallback(() => {
    setLocalMarkers([]);
    onMarkersChange?.([]);
  }, [onMarkersChange]);

  // ======== setup three ========
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.localClippingEnabled = true;
    mountRef.current.appendChild(renderer.domElement);
    state.renderer = renderer;

    // fondo
    state.scene.background = null;

    // cámara
    state.camera.position.set(280, 180, 280);
    state.camera.lookAt(0, 0, 0);

    // luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemi.position.set(0, 200, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(150, 180, 100);
    dir.castShadow = false;
    state.scene.add(hemi, dir);

    // grid + axes
    const grid = new THREE.GridHelper(1200, 120, 0x888888, 0xcccccc);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.rotation.x = Math.PI / 2;
    state.grid = grid;
    state.scene.add(grid);

    const axes = new THREE.AxesHelper(140);
    state.axes = axes;
    state.scene.add(axes);

    // grupo modelo + marcadores + reglas
    state.scene.add(state.modelGroup);
    state.scene.add(state.markers);
    state.scene.add(state.rulers);

    // reglas 3D con ticks y texto (X y Z en plano Y=0)
    const buildRulers = () => {
      state.rulers.clear();
      const ticks = new THREE.Group();
      const labels = new THREE.Group();

      const span = 500; // +-500 mm
      const step = 50; // cada 50mm
      for (let i = -span; i <= span; i += step) {
        // X ticks en Z=0
        const geoX = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(i, 0.1, -3),
          new THREE.Vector3(i, 0.1, +3),
        ]);
        const geoZ = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-3, 0.1, i),
          new THREE.Vector3(+3, 0.1, i),
        ]);
        const mat = new THREE.LineBasicMaterial({ color: 0x666666 });
        ticks.add(new THREE.Line(geoX, mat));
        ticks.add(new THREE.Line(geoZ, mat));

        // etiquetas cada 100 mm
        if (i % 100 === 0) {
          const sx = makeTextSprite(`${i}`, "11px Inter, Arial");
          sx.position.set(i, 0.1, 8);
          labels.add(sx);
          const sz = makeTextSprite(`${i}`, "11px Inter, Arial");
          sz.position.set(-8, 0.1, i);
          labels.add(sz);
        }
      }
      state.rulers.add(ticks);
      state.rulers.add(labels);
    };
    buildRulers();

    // interacción (rotación con bloqueo por ejes)
    const el = renderer.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.12 : 0.9;
      state.camera.position.multiplyScalar(s);
    };
    const onDown = (e: MouseEvent) => {
      if (mode === "holes" || mode === "measure") return;
      state.dragging = true;
      state.last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.last.x;
      const dy = e.clientY - state.last.y;
      state.last = { x: e.clientX, y: e.clientY };

      const rot = 0.005;
      if (axisLock === "free" || axisLock === "yaw") {
        state.yaw += dx * rot;
      }
      if (axisLock === "free" || axisLock === "pitch") {
        state.pitch += dy * rot;
        state.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.pitch));
      }

      // aplica rotación al grupo de la escena (no al modelo directamente)
      state.scene.rotation.set(state.pitch, state.yaw, 0);
    };
    const onUp = () => (state.dragging = false);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // picking para agujeros / medir
    const tmpPts: THREE.Vector3[] = [];
    const onClick = (e: MouseEvent) => {
      // en nav no hacemos picking
      if (mode === "nav") return;
      if (!state.model) return;

      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hits = state.raycaster.intersectObject(state.model, true);
      if (!hits.length) return;

      const p = hits[0].point.clone();

      if (mode === "holes") {
        pushMarker({ x_mm: p.x, y_mm: p.y, z_mm: p.z, d_mm: holeDia });
        return;
      }

      if (mode === "measure") {
        tmpPts.push(p);
        if (tmpPts.length === 2) {
          // línea temporal
          const [a, b] = tmpPts;
          const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
          const mat = new THREE.LineDashedMaterial({ dashSize: 5, gapSize: 3 });
          const line = new THREE.Line(geo, mat);
          (line.material as THREE.LineDashedMaterial).computeLineDistances();
          state.scene.add(line);

          // etiqueta con la distancia
          const mm = a.distanceTo(b).toFixed(1) + " mm";
          const label = makeTextSprite(mm, "12px Inter, Arial");
          label.position.copy(a.clone().add(b).multiplyScalar(0.5));
          label.position.y += 8;
          state.scene.add(label);

          setTimeout(() => {
            state.scene.remove(line);
            state.scene.remove(label);
            geo.dispose();
            mat.dispose();
          }, 1500);
          tmpPts.length = 0;
        }
      }
    };
    el.addEventListener("click", onClick);

    // render loop
    let raf = 0;
    const tick = () => {
      // clipping plane (global)
      if (state.model) {
        const planes = clipping ? [state.clippingPlane] : [];
        state.model.traverse((obj: any) => {
          if (obj.isMesh && obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: THREE.Material & { clippingPlanes?: any }) => {
                (m as any).clippingPlanes = planes;
              });
            } else {
              (obj.material as any).clippingPlanes = planes;
            }
          }
        });
        // mover la distancia del plano
        state.clippingPlane.set(state.clippingPlane.normal, -clipOffset);
      }

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
  }, [height, width, axisLock, mode, clipping, clipOffset, pushMarker, holeDia, state]);

  // ======== carga STL ========
  useEffect(() => {
    if (!state.renderer || !stlUrl) return;
    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        // limpiar modelo previo
        state.modelGroup.clear();

        const mat = new THREE.MeshStandardMaterial({
          color: 0xb8b8b8,
          metalness: 0.15,
          roughness: 0.6,
          transparent: false,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.modelGroup.add(mesh);
        state.model = mesh;

        // encuadre
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        // centro modelo sobre (0,0,0) y elevar sobre Y=0
        state.modelGroup.position.set(-center.x, -bb.min.y, -center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(260, maxDim * 2.2);
        state.camera.position.set(dist, dist * 0.62, dist);
        state.camera.lookAt(0, 0, 0);
      },
      undefined,
      (err) => console.error("STL load error:", err)
    );
  }, [stlUrl, state.renderer]);

  // ======== pintar marcadores ========
  useEffect(() => {
    if (!state.renderer) return;
    state.markers.clear();
    if (!localMarkers.length) return;

    for (const m of localMarkers) {
      const r = Math.max(0.7, Math.min(2.8, (m.d_mm || 5) / 6));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff9900,
        opacity: 0.95,
        transparent: true,
      });
      const sp = new THREE.Mesh(geo, mat);
      sp.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      state.markers.add(sp);
    }
  }, [JSON.stringify(localMarkers), state.renderer]);

  // ======== UI utils ========
  const takeScreenshot = useCallback(() => {
    const canvas = mountRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-preview.png";
    a.click();
  }, []);

  const resetView = useCallback(() => {
    state.scene.rotation.set(0, 0, 0);
    state.yaw = 0;
    state.pitch = 0;
    state.camera.position.set(280, 180, 280);
    state.camera.lookAt(0, 0, 0);
  }, [state]);

  // ======== render ========
  return (
    <div
      className="relative rounded-2xl border shadow-sm bg-white"
      style={{ width, height }}
    >
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2">
        <button
          onClick={() => setMode((m) => (m === "holes" ? "nav" : "holes"))}
          data-active={mode === "holes"}
          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 shadow-sm data-[active=true]:ring-2 data-[active=true]:ring-blue-500"
          title="Modo agujeros (clic sobre el modelo)"
        >
          🔩 Agujeros
        </button>
        <button
          onClick={() => setMode((m) => (m === "measure" ? "nav" : "measure"))}
          data-active={mode === "measure"}
          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 shadow-sm data-[active=true]:ring-2 data-[active=true]:ring-blue-500"
          title="Medición en escena (dos clics)"
        >
          📏 Medir
        </button>
        <div className="px-2 py-1 text-xs rounded border bg-white shadow-sm flex items-center gap-1">
          Snap
          <input
            type="number"
            min={0}
            step={0.5}
            value={snap}
            onChange={(e) => setSnap(Number(e.target.value || 0))}
            className="w-14 border rounded px-1 py-0.5"
            title="Snap en mm"
          />
          mm
        </div>

        <div className="px-2 py-1 text-xs rounded border bg-white shadow-sm flex items-center gap-1">
          Ø
          <input
            type="number"
            min={1}
            step={0.5}
            value={holeDia}
            onChange={(e) => setHoleDia(Number(e.target.value || 5))}
            className="w-14 border rounded px-1 py-0.5"
            title="Diámetro por defecto de agujero"
          />
          mm
        </div>

        <div className="px-2 py-1 text-xs rounded border bg-white shadow-sm flex items-center gap-1">
          Bloqueo:
          <select
            value={axisLock}
            onChange={(e) => setAxisLock(e.target.value as any)}
            className="border rounded px-1 py-0.5"
            title="Bloqueo por ejes para la cámara"
          >
            <option value="free">Libre</option>
            <option value="yaw">Solo Yaw</option>
            <option value="pitch">Solo Pitch</option>
          </select>
        </div>

        <div className="px-2 py-1 text-xs rounded border bg-white shadow-sm flex items-center gap-2">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={clipping}
              onChange={(e) => setClipping(e.target.checked)}
            />
            Corte (clip)
          </label>
          <input
            type="range"
            min={-200}
            max={200}
            value={clipOffset}
            onChange={(e) => setClipOffset(Number(e.target.value))}
            className="w-40"
            title="Plano de corte vertical (Y)"
          />
        </div>

        <button
          onClick={takeScreenshot}
          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 shadow-sm"
          title="Capturar PNG"
        >
          📸 Captura
        </button>
        <button
          onClick={resetView}
          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 shadow-sm"
          title="Reset cámara"
        >
          ⟳ Reset
        </button>
      </div>

      {/* Lista editable de agujeros */}
      <div className="absolute right-2 top-2 z-10 w-[280px] max-h-[70%] overflow-auto rounded-xl border bg-white/95 shadow-sm p-2">
        <div className="text-xs font-semibold mb-1">Agujeros ({localMarkers.length})</div>
        {localMarkers.length === 0 && (
          <div className="text-xs text-gray-500 mb-2">No hay agujeros. Activa “Agujeros” y haz clic en el modelo.</div>
        )}
        {localMarkers.map((m, i) => (
          <div key={i} className="grid grid-cols-5 gap-1 items-center mb-1">
            <input
              type="number"
              step={snap || 0.5}
              value={m.x_mm}
              onChange={(e) => updateMarker(i, { x_mm: Number(e.target.value) })}
              className="border rounded px-1 py-0.5 text-xs"
              title="X (mm)"
            />
            <input
              type="number"
              step={snap || 0.5}
              value={m.y_mm ?? 0}
              onChange={(e) => updateMarker(i, { y_mm: Number(e.target.value) })}
              className="border rounded px-1 py-0.5 text-xs"
              title="Y (mm)"
            />
            <input
              type="number"
              step={snap || 0.5}
              value={m.z_mm}
              onChange={(e) => updateMarker(i, { z_mm: Number(e.target.value) })}
              className="border rounded px-1 py-0.5 text-xs"
              title="Z (mm)"
            />
            <input
              type="number"
              step={0.5}
              min={0.5}
              value={m.d_mm}
              onChange={(e) => updateMarker(i, { d_mm: Number(e.target.value) })}
              className="border rounded px-1 py-0.5 text-xs"
              title="Ø (mm)"
            />
            <button
              onClick={() => deleteMarker(i)}
              className="text-xs px-1 py-0.5 border rounded bg-white hover:bg-gray-50"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        ))}
        {localMarkers.length > 0 && (
          <button
            onClick={clearMarkers}
            className="mt-1 w-full text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
            title="Borrar todos"
          >
            Borrar todos
          </button>
        )}
      </div>

      {/* canvas */}
      <div ref={mountRef} className="absolute inset-0" />
    </div>
  );
}
