"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** marcador de agujero dibujado en el visor */
export type Marker = { x_mm: number; z_mm: number; d_mm: number };

type Props = {
  height?: number;
  background?: string;
  /** bounding box del preview para pintar la caja (L x H x W) en mm */
  box?: { length: number; height: number; width: number };
  /** marcadores (se dibujan como esferas) */
  markers?: Marker[];
  /** si true y el usuario mantiene Shift o Alt al hacer click → añade marcador */
  holesMode?: boolean;
  addDiameter?: number;
  /** cuantiza X/Z al colocar (mm) */
  snapStep?: number;
  onAddMarker?: (m: Marker) => void;
};

export default function STLViewer({
  height = 520,
  background = "#ffffff",
  box,
  markers = [],
  holesMode = false,
  addDiameter = 5,
  snapStep = 1,
  onAddMarker,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // mantener “any” para evitar errores de tipos en Vercel (three typings varían por versión)
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const pickingPlaneRef = useRef<any>(null); // THREE.Plane

  // ---------- init ----------
  useEffect(() => {
    const root = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, root.clientWidth / height, 0.1, 20000);
    camera.position.set(500, 360, 520);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(root.clientWidth, height);
    root.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // marco
    root.style.border = "1px solid #e5e7eb";
    root.style.borderRadius = "12px";
    root.style.overflow = "hidden";
    root.style.background = "#fff";

    // luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb0b4b9, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(600, 800, 300);
    scene.add(hemi, dir);

    // grid + ejes
    const grid = new THREE.GridHelper(3000, 60, 0xE5E7EB, 0xEFF2F6);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.9;
    grid.position.y = 0;
    scene.add(grid);
    const axes = new THREE.AxesHelper(200);
    axes.position.y = 0.1;
    scene.add(axes);

    // controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // resize
    const onResize = () => {
      const w = root.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    // animación
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    // grupo para marcadores
    const g = new THREE.Group();
    scene.add(g);
    markersGroupRef.current = g;

    // plano y=0 para picking
    pickingPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // click: sólo si holesMode y (shift o alt) ↓
    const clickHandler = (ev: MouseEvent) => {
      if (!holesMode || !onAddMarker) return;
      if (!(ev.shiftKey || ev.altKey)) return; // <- evita conflicto con orbitar/pan

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);

      const point = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(pickingPlaneRef.current, point);

      // snap en X/Z
      const snap = (v: number) => (snapStep > 0 ? Math.round(v / snapStep) * snapStep : v);

      onAddMarker({ x_mm: snap(point.x), z_mm: snap(point.z), d_mm: addDiameter });
    };
    renderer.domElement.addEventListener("click", clickHandler);

    return () => {
      renderer.domElement.removeEventListener("click", clickHandler);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [height, background, holesMode, addDiameter, snapStep, onAddMarker]);

  // ---------- preview paramétrico: caja alámbrica ----------
  useEffect(() => {
    const scene = sceneRef.current as any;
    if (!scene || !box) return;

    // limpiar anterior
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse?.((o: any) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => m?.dispose?.());
      });
      modelRef.current = null;
    }

    const { length: L, height: H, width: W } = box;
    const g = new THREE.BoxGeometry(L, H, W);
    const m = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.y = H / 2;
    scene.add(mesh);
    modelRef.current = mesh;
  }, [box]);

  // ---------- dibujar marcadores ----------
  useEffect(() => {
    const group = markersGroupRef.current as any;
    if (!group) return;
    // limpiar
    for (let i = group.children.length - 1; i >= 0; i--) {
      const ch = group.children[i];
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
      group.remove(ch);
    }
    // añadir
    const mat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    markers.forEach((mk) => {
      const r = Math.max(0.8, mk.d_mm / 2);
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat);
      s.position.set(mk.x_mm, 0.1, mk.z_mm);
      group.add(s);
    });
  }, [markers]);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Barra superior del visor */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur px-3 py-1 border-b border-gray-200">
        <div className="text-xs text-gray-600">Visor 3D · rueda: zoom · arrastra: rotar/pan · <b>Shift/Alt + clic</b>: agujero</div>
        <div className="flex gap-6 text-[10px] text-gray-500"><span>L</span><span>H</span><span>W</span></div>
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
