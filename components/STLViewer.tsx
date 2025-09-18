"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Props del visor */
type Props = {
  /** URL del STL ya generado (si hay) */
  url?: string;
  /** Alto del lienzo */
  height?: number;
  /** Fondo */
  background?: string;
  /** Color del modelo */
  modelColor?: string;

  /** Modo agujeros: si está activo, clic en el plano coloca marcador y se llama a onAddHole */
  holesMode?: boolean;
  /** Diámetro en mm para los nuevos agujeros */
  holeDiameter?: number;
  /** Lista de agujeros actuales para dibujar marcadores */
  holes?: { x_mm: number; z_mm: number; d_mm: number }[];
  /** Callback al pinchar en el modelo/plano */
  onAddHole?: (hole: { x_mm: number; z_mm: number; d_mm: number }) => void;

  /** Texto de estado (p.e. medidas) que se pinta en esquina */
  statusText?: string;
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
  modelColor = "#3f444c",
  holesMode = false,
  holeDiameter = 5,
  holes = [],
  onAddHole,
  statusText,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // ---------- INIT ----------
  useEffect(() => {
    const el = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / height, 0.1, 10000);
    camera.position.set(400, 300, 400);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, height);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3af, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(300, 500, 400);
    scene.add(dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Plano base (grid)
    const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.9;
    grid.position.y = 0;
    scene.add(grid);

    // Ejes mini
    const axes = new THREE.AxesHelper(80);
    axes.position.set(-550, 0.01, -550);
    scene.add(axes);

    // Grupo marcadores
    const g = new THREE.Group();
    markersRef.current = g;
    scene.add(g);

    // Resize
    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    // Loop
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controlsRef.current?.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      scene.traverse((o) => {
        if ((o as any).isMesh) {
          (o as any).geometry?.dispose?.();
          const mats = Array.isArray((o as any).material) ? (o as any).material : [(o as any).material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      renderer.dispose();
      try { el.removeChild(renderer.domElement); } catch {}
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      modelRef.current = null;
      markersRef.current = null;
    };
  }, [height, background]);

  // ---------- LOAD STL ----------
  useEffect(() => {
    if (!url || !sceneRef.current) return;

    // cargamos STL sin loader externo: usando fetch + STL ASCII/Binary parser minimal de three
    // Import dinámico del STLLoader para no romper el build si tree-shaking cambia rutas.
    let disposed = false;
    (async () => {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const loader = new STLLoader();
      loader.load(
        url,
        (geom) => {
          if (disposed || !sceneRef.current) return;
          const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(modelColor) });
          const mesh = new THREE.Mesh(geom, mat);
          geom.computeBoundingBox();
          const bb = geom.boundingBox!;
          const center = bb.getCenter(new THREE.Vector3());
          geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

          // Limpia anterior
          if (modelRef.current) sceneRef.current.remove(modelRef.current);
          modelRef.current = mesh;
          sceneRef.current.add(mesh);

          // Fit cámara
          const size = bb.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const dist = maxDim * 2.2;
          cameraRef.current?.position.set(dist, dist * 0.7, dist);
          cameraRef.current!.near = 0.1;
          cameraRef.current!.far = dist * 10;
          cameraRef.current!.updateProjectionMatrix();
        },
        undefined,
        (err) => console.error("STL load error", err)
      );
    })();

    return () => { disposed = true; };
  }, [url, modelColor]);

  // ---------- DRAW HOLE MARKERS ----------
  useEffect(() => {
    if (!markersRef.current) return;
    const group = markersRef.current;
    group.clear();
    const col = new THREE.Color(0x10b981); // verde
    holes.forEach((h) => {
      const r = Math.max(1.5, h.d_mm / 2);
      const c = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 1.5, 24),
        new THREE.MeshStandardMaterial({ color: col })
      );
      c.rotation.x = Math.PI / 2;
      c.position.set(h.x_mm, 0.8, h.z_mm);
      group.add(c);
    });
  }, [holes]);

  // ---------- CLICK TO ADD HOLES ----------
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const onClick = (evt: MouseEvent) => {
      if (!holesMode) return;
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
      const rect = (rendererRef.current.domElement as HTMLCanvasElement).getBoundingClientRect();
      mouse.current.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);

      // Intersecta plano XZ en y=0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, point);

      if (!isFinite(point.x) || !isFinite(point.z)) return;

      onAddHole?.({ x_mm: point.x, z_mm: point.z, d_mm: holeDiameter });
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [holesMode, holeDiameter, onAddHole]);

  // Etiqueta de estado (esquina)
  const overlay = useMemo(
    () => (
      <div className="pointer-events-none absolute bottom-2 right-3 rounded-md bg-white/80 px-2 py-1 text-[11px] text-gray-700 shadow-sm">
        {statusText || ""}
      </div>
    ),
    [statusText]
  );

  return (
    <div className="relative w-full rounded-xl border border-gray-200 bg-white">
      <div ref={mountRef} style={{ height }} className="w-full rounded-xl" />
      {overlay}
    </div>
  );
}
