// components/STLViewerPro.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Tipo unificado de marcador/agujero (mm) */
export type Marker = {
  x_mm: number;
  y_mm?: number;
  z_mm: number;
  d_mm: number;
  axis?: "auto" | "x" | "y" | "z";
  nx?: number;
  ny?: number;
  nz?: number;
};

/** Props del visor Pro */
type STLViewerProProps = {
  stlUrl?: string;                     // opcional: preview STL si existe
  background?: string;                 // color CSS/hex
  width?: number;
  height?: number;
  /** Dimensiones aproximadas del modelo para ruler/encuadre y snap */
  box?: { length: number; width: number; height: number; thickness?: number };
  /** Lista de agujeros visibles (auto + libres) */
  markers?: Marker[];
  /** “Modo agujeros”: permite añadir con ALT/SHIFT o botón */
  holesMode?: boolean;
  /** Ø por defecto al crear agujeros */
  addDiameter?: number;
  /** Paso de snap (mm) */
  snapStep?: number;
  /** Callback controlado: devuelve la lista completa (edición/altas/bajas) */
  onMarkersChange?(next: Marker[]): void;
};

function useStable<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

/** Dibuja un texto como Sprite (CanvasTexture), para ticks de la regla */
function makeTextSprite(text: string, size = 12) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${size}px Inter, system-ui, Arial`;
  ctx.font = font;
  const padding = 4;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + padding * 2);
  canvas.height = Math.ceil(size + padding * 2);
  // Reestablecer font tras cambiar height
  ctx.font = font;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.textBaseline = "top";
  ctx.fillText(text, padding, padding);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  // Escalar para que no sea gigante
  const scale = 0.25;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

export default function STLViewerPro({
  stlUrl,
  background = "#ffffff",
  width = 900,
  height = 560,
  box = { length: 200, width: 120, height: 60 },
  markers = [],
  holesMode = false,
  addDiameter = 5,
  snapStep = 1,
  onMarkersChange,
}: STLViewerProProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Estado cámara/escena (tipos -> any para evitar problemas en Vercel)
  const state = useMemo(
    () => ({
      renderer: null as any,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(40, width / height, 0.1, 8000),
      model: null as any,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      markerGroup: new THREE.Group(),
      grid: null as any,
      axes: null as any,
      rulers: new THREE.Group(),
      clipPlane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // normal hacia +Y (corta “por altura”)
      clipHelper: null as any,
    }),
    [width, height]
  );

  // UI local
  const [distanceMM, setDistanceMM] = useState<number | null>(null);
  const [placeHole, setPlaceHole] = useState(false); // botón “Poner agujero”
  const [lockRotX, setLockRotX] = useState(false);
  const [lockRotY, setLockRotY] = useState(false);
  const [lockPan, setLockPan] = useState(false);
  const [clipY, setClipY] = useState(0); // mm desde Y=0 hacia +Y

  // Marcadores editables locales; sincroniza con props.markers
  const [localMarkers, setLocalMarkers] = useState<Marker[]>(markers || []);
  const markersRef = useStable(localMarkers);
  useEffect(() => {
    setLocalMarkers(markers || []);
  }, [markers]);

  // Notificar arriba cuando cambian
  const emitMarkers = useCallback(
    (next: Marker[]) => {
      setLocalMarkers(next);
      onMarkersChange?.(next);
    },
    [onMarkersChange]
  );

  // Helpers snap y límites caja
  const snap = useCallback(
    (v: number) => Math.round(v / (snapStep || 1)) * (snapStep || 1),
    [snapStep]
  );
  const clampToBox = useCallback(
    (x: number, y: number, z: number) => ({
      x: Math.max(0, Math.min(box.length, x)),
      y: Math.max(0, Math.min(box.height, y)),
      z: Math.max(0, Math.min(box.width, z)),
    }),
    [box.length, box.height, box.width]
  );

  // Inicialización de escena
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(new THREE.Color(background), 1);
    // Clipping global
    renderer.localClippingEnabled = true;
    (renderer as any).clippingPlanes = [state.clipPlane];
    el.appendChild(renderer.domElement);
    state.renderer = renderer;

    // Scene
    state.scene.background = null;

    // Camera
    state.camera.position.set(240, 160, 260);
    state.camera.lookAt(0, 0, 0);

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 200, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(120, 180, 80);
    state.scene.add(hemi, dir);

    // Plano base (grid) en Y=0
    state.grid = new THREE.GridHelper(1000, 100);
    (state.grid.material as any).opacity = 0.35;
    (state.grid.material as any).transparent = true;
    state.grid.rotation.x = Math.PI / 2;
    state.scene.add(state.grid);

    // Ejes
    state.axes = new THREE.AxesHelper(120);
    state.scene.add(state.axes);

    // Rulers
    state.rulers.name = "rulers";
    state.scene.add(state.rulers);

    // Grupo de marcadores
    state.markerGroup.name = "markers";
    state.scene.add(state.markerGroup);

    // Helper visual del clipping plane
    {
      const hgeo = new THREE.PlaneGeometry(1000, 1000);
      const hmat = new THREE.MeshBasicMaterial({
        color: 0x0077ff,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
      });
      const helper = new THREE.Mesh(hgeo, hmat);
      helper.rotateX(-Math.PI / 2); // plano paralelo a XZ, moviéndose en +Y
      helper.position.y = 0;
      state.scene.add(helper);
      state.clipHelper = helper;
    }

    // Interacción básica (rotación/zoom/pan)
    let isDragging = false;
    let last = { x: 0, y: 0 };
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
      if (!lockRotY) state.scene.rotation.y += dx * rot;
      if (!lockRotX) state.scene.rotation.x += dy * rot;
    };
    const onUp = () => (isDragging = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = Math.sign(e.deltaY) > 0 ? 1.1 : 0.9;
      state.camera.position.multiplyScalar(s);
    };
    const onContext = (e: MouseEvent) => {
      // botón derecho -> pan si no está bloqueado
      e.preventDefault();
      if (lockPan) return;
      const movementX = (e as any).movementX ?? 0;
      const movementY = (e as any).movementY ?? 0;
      const factor = 0.5;
      state.scene.position.x += -movementX * factor;
      state.scene.position.y += movementY * factor;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("mousemove", onContext);

    // Click para medir o poner agujero
    const tempPts: any[] = [];
    const onClick = (e: MouseEvent) => {
      const isAltOrShift = e.altKey || e.shiftKey;
      const rect = dom.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);

      // Intersección con modelo si existe, si no con plano Y=0
      let hitPoint: THREE.Vector3 | null = null;
      const targets: any[] = [];
      if (state.model) targets.push(state.model);
      const hits = state.raycaster.intersectObjects(targets, true);
      if (hits.length) {
        hitPoint = hits[0].point.clone();
      } else {
        // plano Y=0
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const ray = state.raycaster.ray;
        hitPoint = new THREE.Vector3();
        ray.intersectPlane(plane, hitPoint);
      }
      if (!hitPoint) return;

      if (holesMode && (isAltOrShift || placeHole)) {
        // Añadir agujero
        const p = clampToBox(hitPoint.x, hitPoint.y, hitPoint.z);
        const nx = 0, ny = 1, nz = 0; // normal por defecto +Y
        const m: Marker = {
          x_mm: snap(p.x),
          y_mm: snap(p.y),
          z_mm: snap(p.z),
          d_mm: addDiameter,
          axis: "auto",
          nx, ny, nz,
        };
        emitMarkers([...(markersRef.current || []), m]);
        return;
      }

      // Medición (dos clics)
      tempPts.push(hitPoint.clone());
      if (tempPts.length === 2) {
        const [a, b] = tempPts;
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
        }, 1500);
        tempPts.length = 0;
      }
    };
    dom.addEventListener("click", onClick);

    // Bucle render
    let raf = 0;
    const tick = () => {
      state.renderer!.render(state.scene, state.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Limpieza
    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("mousemove", onContext);
      dom.removeEventListener("click", onClick);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [background, box.height, width, height, holesMode, placeHole, addDiameter, snap, clampToBox, markersRef]);

  // Cargar STL si llega URL
  useEffect(() => {
    if (!state.renderer || !stlUrl) return;
    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        if (state.model) {
          state.scene.remove(state.model);
          (state.model.geometry as any).dispose?.();
          (state.model.material as any).dispose?.();
        }

        const material = new THREE.MeshStandardMaterial({
          color: 0xdddddd,
          metalness: 0.1,
          roughness: 0.6,
          transparent: false,
          opacity: 1,
          clippingPlanes: [state.clipPlane],
          clipShadows: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.scene.add(mesh);
        state.model = mesh;

        // Center/fit
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
  }, [stlUrl, state.renderer, state.scene, state.camera, state.model]);

  // Pintar marcadores
  useEffect(() => {
    if (!state.renderer) return;
    state.markerGroup.clear();
    if (!localMarkers?.length) return;
    for (const m of localMarkers) {
      const r = Math.max(0.6, Math.min(2.8, (m.d_mm || addDiameter) / 6));
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ opacity: 0.95, transparent: true, color: 0xff5500 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      state.markerGroup.add(sphere);
    }
  }, [localMarkers, state.renderer, addDiameter]);

  // Reglas (ticks + texto) en X y Z según box.*
  const buildRulers = useCallback(() => {
    state.rulers.clear();
    const group = new THREE.Group();

    const tickLen = 4;
    const mmMajor = 50;  // etiqueta cada 50 mm
    const mmMinor = 10;  // tick cada 10 mm
    const gray = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5 });

    // Eje X (largo)
    {
      const g = new THREE.BufferGeometry();
      const verts: number[] = [];
      for (let x = 0; x <= box.length; x += mmMinor) {
        const isMajor = x % mmMajor === 0;
        const len = isMajor ? tickLen * 1.6 : tickLen;
        // línea vertical sobre XZ (a Y=0)
        verts.push(x, 0, 0, x, 0, len);
        if (isMajor) {
          const s = makeTextSprite(`${x}`, 24);
          s.position.set(x, 0, len + 5);
          group.add(s);
        }
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const line = new THREE.LineSegments(g, gray);
      group.add(line);
    }

    // Eje Z (ancho)
    {
      const g = new THREE.BufferGeometry();
      const verts: number[] = [];
      for (let z = 0; z <= box.width; z += mmMinor) {
        const isMajor = z % mmMajor === 0;
        const len = isMajor ? tickLen * 1.6 : tickLen;
        verts.push(0, 0, z, len, 0, z);
        if (isMajor) {
          const s = makeTextSprite(`${z}`, 24);
          s.position.set(len + 5, 0, z);
          group.add(s);
        }
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const line = new THREE.LineSegments(g, gray);
      group.add(line);
    }

    state.rulers.add(group);
  }, [box.length, box.width, state.rulers]);

  useEffect(() => {
    if (!state.renderer) return;
    buildRulers();
  }, [buildRulers, state.renderer]);

  // Actualizar clipping plane (y helper) al mover slider
  useEffect(() => {
    if (!state.renderer) return;
    // Plano paralelo a XZ moviéndose en +Y
    state.clipPlane.set(new THREE.Vector3(0, -1, 0), -clipY); // THREE usa n·x + c = 0
    if (state.clipHelper) {
      state.clipHelper.position.y = clipY;
    }
  }, [clipY, state.clipPlane, state.clipHelper, state.renderer]);

  // UI: eliminar un agujero
  const removeMarker = (idx: number) => {
    const next = [...(markersRef.current || [])];
    next.splice(idx, 1);
    emitMarkers(next);
  };

  // UI: editar agujero
  const editMarker = (idx: number, key: keyof Marker, val: number) => {
    const next = [...(markersRef.current || [])];
    const m = { ...next[idx] };
    if (key === "x_mm" || key === "y_mm" || key === "z_mm" || key === "d_mm") {
      (m as any)[key] = snap(val);
      // clamp posición
      const p = clampToBox(m.x_mm, m.y_mm ?? 0, m.z_mm);
      m.x_mm = p.x; m.y_mm = p.y; m.z_mm = p.z;
    }
    next[idx] = m;
    emitMarkers(next);
  };

  return (
    <div className="relative rounded-2xl border bg-white shadow-sm" style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />

      {/* HUD superior izquierdo: medición */}
      <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-white/85 rounded shadow-sm">
        {distanceMM ? `Medida: ${distanceMM.toFixed(1)} mm` : "Click x2 para medir"}
      </div>

      {/* Toolbar superior derecha */}
      <div className="absolute top-2 right-2 flex gap-2 bg-white/85 p-2 rounded shadow-sm text-xs">
        <button
          onClick={() => setPlaceHole((v) => !v)}
          className={`px-2 py-1 rounded border ${placeHole ? "bg-orange-100 border-orange-300" : "bg-white hover:bg-gray-50"}`}
          title="Modo colocar agujero (también Alt/Shift al clicar)"
        >
          ➕ Agujero
        </button>
        <button
          onClick={() => setLockRotX((v) => !v)}
          className={`px-2 py-1 rounded border ${lockRotX ? "bg-gray-200" : "bg-white hover:bg-gray-50"}`}
          title="Bloquear rotación X"
        >
          Bloq Rot X
        </button>
        <button
          onClick={() => setLockRotY((v) => !v)}
          className={`px-2 py-1 rounded border ${lockRotY ? "bg-gray-200" : "bg-white hover:bg-gray-50"}`}
          title="Bloquear rotación Y"
        >
          Bloq Rot Y
        </button>
        <button
          onClick={() => setLockPan((v) => !v)}
          className={`px-2 py-1 rounded border ${lockPan ? "bg-gray-200" : "bg-white hover:bg-gray-50"}`}
          title="Bloquear paneo (botón derecho)"
        >
          Bloq Pan
        </button>
        <button
          onClick={() => {
            state.scene.rotation.set(0, 0, 0);
            state.scene.position.set(0, 0, 0);
            state.camera.position.set(240, 160, 260);
            state.camera.lookAt(0, 0, 0);
          }}
          className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
          title="Reset cámara"
        >
          Reset
        </button>
      </div>

      {/* Panel inferior: clipping y lista de agujeros */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 border-t p-2">
        <div className="flex flex-col gap-2">
          {/* Clipping */}
          <div className="flex items-center gap-3 text-xs">
            <div className="shrink-0 text-gray-600">Plano corte Y:</div>
            <input
              type="range"
              min={0}
              max={Math.max(0, Math.ceil(box.height))}
              step={snapStep || 1}
              value={clipY}
              onChange={(e) => setClipY(parseFloat(e.target.value))}
              className="w-64"
            />
            <div className="w-16 text-right tabular-nums">{clipY} mm</div>
            <div className="ml-4 text-gray-600">Snap: {snapStep || 1} mm</div>
          </div>

          {/* Lista editable de agujeros */}
          <div className="max-h-44 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium">#</th>
                  <th className="text-left font-medium">X (mm)</th>
                  <th className="text-left font-medium">Y (mm)</th>
                  <th className="text-left font-medium">Z (mm)</th>
                  <th className="text-left font-medium">Ø (mm)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {localMarkers.map((m, i) => (
                  <tr key={`${i}-${m.x_mm}-${m.z_mm}`} className="odd:bg-gray-50/60">
                    <td className="pr-2 text-gray-500">{i + 1}</td>
                    <td className="pr-1">
                      <input
                        type="number"
                        step={snapStep || 1}
                        value={m.x_mm}
                        onChange={(e) => editMarker(i, "x_mm", parseFloat(e.target.value))}
                        className="w-20 border rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="pr-1">
                      <input
                        type="number"
                        step={snapStep || 1}
                        value={m.y_mm ?? 0}
                        onChange={(e) => editMarker(i, "y_mm", parseFloat(e.target.value))}
                        className="w-20 border rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="pr-1">
                      <input
                        type="number"
                        step={snapStep || 1}
                        value={m.z_mm}
                        onChange={(e) => editMarker(i, "z_mm", parseFloat(e.target.value))}
                        className="w-20 border rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="pr-1">
                      <input
                        type="number"
                        step={0.1}
                        value={m.d_mm}
                        onChange={(e) => editMarker(i, "d_mm", parseFloat(e.target.value))}
                        className="w-20 border rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="pl-1">
                      <button
                        onClick={() => removeMarker(i)}
                        className="px-2 py-0.5 rounded border text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        borrar
                      </button>
                    </td>
                  </tr>
                ))}
                {localMarkers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-1 text-gray-500">
                      Sin agujeros. Activa “➕ Agujero” o pulsa Alt/Shift al clicar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
