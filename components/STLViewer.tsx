"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Hole = { x_mm: number; z_mm: number; d_mm: number };

type Props = {
  url?: string;
  height?: number;
  background?: string;
  modelColor?: string;
  /** Mostrar marcadores de agujeros ya definidos */
  holes?: Hole[];
  /** Si true, permite click para añadir agujeros y llama a onPick */
  holeMode?: boolean;
  onPick?: (x_mm: number, z_mm: number) => void;
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
  modelColor = "#374151",
  holes = [],
  holeMode = false,
  onPick,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const planeY0 = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // ---------- init ----------
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / height, 0.1, 100000);
    camera.position.set(400, 300, 420);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // marco
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(frame);

    // luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3af, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(500, 800, 500);
    scene.add(hemi, dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // grid y ejes
    const grid = new THREE.GridHelper(3000, 60, 0xd1d5db, 0xe5e7eb);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.95;
    grid.position.y = 0;
    scene.add(grid);

    const axes = new THREE.AxesHelper(80);
    axes.position.set(0, 0, 0);
    scene.add(axes);

    // contenedor de marcadores
    const markers = new THREE.Group();
    scene.add(markers);
    markersRef.current = markers;

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      rendererRef.current?.render(sceneRef.current, cameraRef.current);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose?.();
      rendererRef.current?.dispose?.();
      try { container.removeChild(renderer.domElement); } catch {}
      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      meshRef.current = null;
      markersRef.current = null;
    };
  }, [height, background]);

  // ---------- cargar STL ----------
  useEffect(() => {
    if (!url || !sceneRef.current) return;
    const loader = new STLLoader();
    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(modelColor), metalness: 0, roughness: 0.65 });
        const mesh = new THREE.Mesh(geom, mat);

        // centrar
        geom.computeBoundingBox();
        const box = geom.boundingBox!;
        const center = box.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

        // guardar y añadir
        if (meshRef.current) sceneRef.current.remove(meshRef.current);
        meshRef.current = mesh;
        sceneRef.current.add(mesh);

        // colocar cámara
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const dist = maxDim * 2.2;
        const cam = cameraRef.current;
        cam.position.set(dist, dist * 0.7, dist);
        cam.near = 0.1;
        cam.far = dist * 20;
        cam.updateProjectionMatrix();
      },
      undefined,
      (err) => console.error("STL load error", err)
    );
  }, [url, modelColor]);

  // ---------- dibujar marcadores ----------
  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;
    markers.clear();

    for (const h of holes) {
      const r = Math.max(1, h.d_mm / 2);
      const g = new THREE.CylinderGeometry(r, r, 2, 24);
      const m = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const cyl = new THREE.Mesh(g, m);
      // En el plano XZ (y=0). Eje del cilindro en Y.
      cyl.rotation.x = Math.PI / 2;
      cyl.position.set(h.x_mm, 0, h.z_mm);
      markers.add(cyl);
    }
  }, [holes]);

  // ---------- picking para agujeros ----------
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;

    const onClick = (ev: MouseEvent) => {
      if (!holeMode || !onPick) return;
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      pointer.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(pointer.current, cameraRef.current);
      const hit = new THREE.Vector3();
      // intersección con plano Y=0
      raycaster.current.ray.intersectPlane(planeY0, hit);
      if (!Number.isFinite(hit.x) || !Number.isFinite(hit.z)) return;

      // mm directos (modelo centrado)
      onPick(hit.x, hit.z);
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [holeMode, onPick, planeY0]);

  // marco visual alrededor del canvas (solo CSS)
  return (
    <div className="rounded-2xl border border-gray-300 bg-[linear-gradient(180deg,#fff,#f8fafc)] shadow-sm">
      <div
        ref={mountRef}
        style={{ height }}
        className="w-full rounded-2xl overflow-hidden"
      />
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-600 border-t border-gray-200 bg-white/70">
        <span>Ejes: X rojo · Y verde · Z azul — Grid: 50 mm</span>
        <span>{holeMode ? "Modo agujeros activo (click para añadir)" : "Vista 3D interactiva"}</span>
      </div>
    </div>
  );
}
