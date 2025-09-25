"use client";

/**
 * Visor 3D “Pro” sin dependencias raras: usa three.js por import dinámico
 * para evitar errores de tipos en Vercel. Dibuja:
 * - Grid + ejes
 * - Caja del modelo en alambre (siempre visible) => así se ve dónde poner agujeros
 * - Esferas/puas para cada agujero
 * UI:
 * - Bloqueo de cámara: Libre / X / Y / Z
 * - Clipping con slider (plano horizontal)
 * - Lista editable de agujeros (x/y/z/Ø) con eliminar (panel flotante plegable)
 * - ALT+clic para añadir agujero, con snap en mm
 */

import {useEffect, useMemo, useRef, useState, useCallback} from "react";

export type Marker = {
  x_mm: number;
  y_mm?: number; // por compat y para taladros 3D futuros
  z_mm: number;
  d_mm?: number;
};

type Box = { length: number; width: number; height: number; thickness?: number };

type STLViewerProProps = {
  box: Box;
  markers: Marker[];
  onMarkersChange: (next: Marker[]) => void;

  // UX
  holesEnabled?: boolean;       // si no está, ALT+clic sigue funcionando
  holeDiameter?: number;        // Ø por defecto al crear
  snapMM?: number;              // paso de snap en mm

  className?: string;
};

export default function STLViewerPro({
  box, markers, onMarkersChange,
  holesEnabled = true,
  holeDiameter = 5,
  snapMM = 1,
  className
}: STLViewerProProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  // three y OrbitControls se cargan dinámicamente (evita errores de tipos en build)
  const threeRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const gridRef = useRef<any>(null);
  const axesRef = useRef<any>(null);
  const boxEdgesRef = useRef<any>(null);
  const dotsGroupRef = useRef<any>(null);
  const clipPlaneRef = useRef<any>(null);

  // UI local
  const [axisLock, setAxisLock] = useState<"free"|"x"|"y"|"z">("free");
  const [clipping, setClipping] = useState(false);
  const [clipValue, setClipValue] = useState(0); // 0..1 (0=sin corte, 1=corte máximo)
  const [holesOpen, setHolesOpen] = useState(true);

  // util: snap
  const snap = useCallback((v: number) => {
    if (!snapMM || snapMM <= 0) return v;
    return Math.round(v / snapMM) * snapMM;
  }, [snapMM]);

  // inicializa three
  useEffect(() => {
    let mounted = true;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (!mounted) return;
      threeRef.current = THREE;

      const el = containerRef.current!;
      const width = el.clientWidth;
      const height = el.clientHeight;

      // renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.innerHTML = "";
      el.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // escena
      const scene = new THREE.Scene();
      scene.background = null;
      sceneRef.current = scene;

      // cámara
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 8000);
      camera.position.set(300, 220, 320);
      cameraRef.current = camera;

      // controles
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controlsRef.current = controls;

      // grid + ejes
      const grid = new THREE.GridHelper(2000, 200, 0x999999, 0xdddddd);
      (grid.material as any).opacity = 0.35;
      (grid.material as any).transparent = true;
      grid.rotation.x = Math.PI / 2; // plano XY (Z hacia arriba)
      scene.add(grid);
      gridRef.current = grid;

      const axes = new THREE.AxesHelper(120);
      scene.add(axes);
      axesRef.current = axes;

      // grupo de marcadores
      const dotsGroup = new THREE.Group();
      scene.add(dotsGroup);
      dotsGroupRef.current = dotsGroup;

      // clipping plane
      clipPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); // corta por Z
      renderer.localClippingEnabled = true;

      // caja alambre (siempre visible)
      rebuildBoxEdges();

      // encuadre inicial
      fitCameraToBox();

      // listeners
      const onResize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      const onPointerDown = (ev: PointerEvent) => {
        // ALT+clic o agujeros habilitados forza creación
        const mustCreate = ev.altKey || holesEnabled;
        if (!mustCreate) return;
        // no crear si click en el panel de agujeros
        if ((ev.target as HTMLElement).closest?.("[data-holes-panel]")) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const xN = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const yN = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

        const ray = new THREE.Raycaster();
        ray.setFromCamera({ x: xN, y: yN }, camera);

        // intersecta caja (si existiese mesh real usaríamos el mesh)
        const plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0); // plano Z=0
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(plane, hit);

        const x = snap(hit.x);
        const y = snap(hit.y);
        const z = snap(hit.z);

        const next = [...markers, { x_mm: x, y_mm: y, z_mm: z, d_mm: holeDiameter }];
        onMarkersChange(next);
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);

      // render loop
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        controls.update();

        // aplica clipping si procede
        if (clipping && renderer.clippingPlanes?.length !== 1) {
          renderer.clippingPlanes = [clipPlaneRef.current];
        } else if (!clipping && renderer.clippingPlanes?.length) {
          renderer.clippingPlanes = [];
        }

        renderer.render(scene, camera);
      };
      loop();

      return () => {
        mounted = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        controls.dispose();
        renderer.dispose();
      };
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo una vez

  // redibuja caja alambre cuando cambie box
  const rebuildBoxEdges = useCallback(() => {
    const THREE = threeRef.current;
    if (!THREE || !sceneRef.current) return;
    if (boxEdgesRef.current) {
      sceneRef.current.remove(boxEdgesRef.current);
      boxEdgesRef.current.geometry.dispose();
    }

    const { length: L, width: W, height: H } = box; // ejes: X=length, Y=width, Z=height
    const geom = new THREE.BoxGeometry(L, W, H);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x1976d2 });
    const wire = new THREE.LineSegments(edges, mat);
    // centramos la caja en el origen
    wire.position.set(0, 0, H / 2);
    boxEdgesRef.current = wire;
    sceneRef.current.add(wire);
  }, [box]);

  useEffect(() => { rebuildBoxEdges(); }, [rebuildBoxEdges]);

  // ajusta cámara a caja
  const fitCameraToBox = useCallback(() => {
    const THREE = threeRef.current;
    if (!THREE || !cameraRef.current || !controlsRef.current) return;
    const { length: L, width: W, height: H } = box;
    const maxDim = Math.max(L, W, H);
    const dist = maxDim * 1.8;

    const cam = cameraRef.current;
    cam.position.set(dist, dist, dist);
    cam.near = 0.1;
    cam.far = dist * 10;
    cam.updateProjectionMatrix();

    controlsRef.current.target.set(0, 0, H / 2);
    controlsRef.current.update();
  }, [box]);

  // ejes / bloqueo
  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;
    c.enableRotate = true;
    c.enablePan = true;

    if (axisLock === "x") {
      c.minPolarAngle = Math.PI / 2; // vista plana
      c.maxPolarAngle = Math.PI / 2;
      c.enableRotate = false;
      cameraRef.current.position.set(500, 0, box.height/2);
    } else if (axisLock === "y") {
      c.minPolarAngle = Math.PI / 2;
      c.maxPolarAngle = Math.PI / 2;
      c.enableRotate = false;
      cameraRef.current.position.set(0, 500, box.height/2);
    } else if (axisLock === "z") {
      c.minPolarAngle = 0.0001;
      c.maxPolarAngle = 0.0001;
      c.enableRotate = false;
      cameraRef.current.position.set(0, 0, box.height * 2);
    } else {
      // libre
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI;
    }
    c.update();
  }, [axisLock, box.height]);

  // clipping plane (mapea 0..1 a 0..H)
  useEffect(() => {
    const THREE = threeRef.current;
    if (!THREE || !clipPlaneRef.current) return;
    const z = box.height * clipValue;
    // ecuación: n·p + d = 0. Con normal (0,0,-1) para “cortar desde arriba”
    clipPlaneRef.current.set(new THREE.Vector3(0,0,-1), z);
  }, [box.height, clipValue]);

  // redibuja marcadores
  useEffect(() => {
    const THREE = threeRef.current;
    if (!THREE || !dotsGroupRef.current) return;
    const group = dotsGroupRef.current as any;

    // limpia
    while (group.children.length) {
      const c = group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    const mat = new THREE.MeshBasicMaterial({ color: 0x1e88e5 });
    const geo = new THREE.SphereGeometry(1.6, 12, 12);

    for (const m of markers) {
      const dot = new THREE.Mesh(geo, mat);
      dot.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      group.add(dot);
    }
  }, [markers]);

  // panel agujeros (edición)
  const updateHole = (i: number, patch: Partial<Marker>) => {
    const next = markers.map((m, idx) => idx === i ? { ...m, ...patch } : m);
    onMarkersChange(next);
  };
  const removeHole = (i: number) => {
    const next = markers.filter((_, idx) => idx !== i);
    onMarkersChange(next);
  };

  return (
    <div className={`relative h-[calc(100svh-160px)] w-full rounded-2xl border border-gray-200 bg-white shadow-sm ${className || ""}`}>
      {/* Barra superior */}
      <div className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl bg-white/90 p-2 shadow">
        <span className="text-sm text-gray-600">Cámara:</span>
        <div className="flex gap-1">
          {(["free","x","y","z"] as const).map(k => (
            <button
              key={k}
              onClick={() => setAxisLock(k)}
              className={`rounded-md border px-2 py-1 text-xs ${axisLock===k ? "bg-black text-white" : "hover:bg-gray-50"}`}
              title={k==="free" ? "Libre" : k.toUpperCase()}
            >
              {k==="free"?"Libre":k.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mx-3 h-5 w-px bg-gray-200" />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={clipping} onChange={(e)=>setClipping(e.target.checked)} />
          Clipping
        </label>
        <input
          type="range" min={0} max={1} step={0.01}
          className="w-36"
          value={clipValue}
          onChange={e=>setClipValue(Number(e.target.value))}
          disabled={!clipping}
        />

        <div className="mx-3 h-5 w-px bg-gray-200" />

        <div className="text-sm text-gray-600">
          <b>ALT</b>+clic = agujero · Ø def: {holeDiameter} mm · Snap: {snapMM} mm
        </div>

        <div className="mx-3 h-5 w-px bg-gray-200" />
        <button onClick={fitCameraToBox} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" title="Encajar a pieza">
          Centrar
        </button>

        <button
          onClick={()=>setHolesOpen(v=>!v)}
          className="ml-2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          title="Mostrar/ocultar lista de agujeros"
        >
          {holesOpen ? "Ocultar agujeros" : "Agujeros (lista)"}
        </button>
      </div>

      {/* lienzo three */}
      <div ref={containerRef} className="absolute inset-0 rounded-2xl" />

      {/* Panel agujeros (flotante, plegable) */}
      {holesOpen && (
        <div
          data-holes-panel
          className="pointer-events-auto absolute right-3 top-3 z-30 max-h-[80%] w-[360px] overflow-auto rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between">
            <b className="text-sm">Agujeros ({markers.length})</b>
            <button onClick={()=>setHolesOpen(false)} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">Cerrar</button>
          </div>

          {markers.length===0 && <p className="text-sm text-gray-600">No hay agujeros.</p>}

          <div className="grid gap-2">
            {markers.map((m, i) => (
              <div key={i} className="rounded-lg border p-2">
                <div className="mb-1 text-xs text-gray-500">#{i+1}</div>
                <div className="grid grid-cols-4 items-end gap-2">
                  <label className="text-xs">
                    X (mm)
                    <input
                      type="number" step={snapMM||1} value={m.x_mm}
                      onChange={e=>updateHole(i, { x_mm: Number(e.target.value) })}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Y (mm)
                    <input
                      type="number" step={snapMM||1} value={m.y_mm ?? 0}
                      onChange={e=>updateHole(i, { y_mm: Number(e.target.value) })}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Z (mm)
                    <input
                      type="number" step={snapMM||1} value={m.z_mm}
                      onChange={e=>updateHole(i, { z_mm: Number(e.target.value) })}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Ø (mm)
                    <input
                      type="number" step={0.5} min={1} value={m.d_mm ?? holeDiameter}
                      onChange={e=>updateHole(i, { d_mm: Number(e.target.value) })}
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 text-right">
                  <button onClick={()=>removeHole(i)} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
