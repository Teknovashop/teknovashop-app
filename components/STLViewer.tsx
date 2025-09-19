"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** marcador de agujero dibujado en el visor */
export type Marker = { x_mm: number; z_mm: number; d_mm: number };

type Props = {
  /** Alto del canvas: si no lo pasas, usa la altura del contenedor */
  height?: number;
  background?: string;
  /** url STL (no usada por ahora para el preview) */
  url?: string;
  /**
   * Bounding box en milímetros para el preview.
   * Si 'thickness' está presente se renderiza
   * una placa sólida (L x thickness x W) con sustracción de agujeros.
   */
  box?: { length: number; height: number; width: number; thickness?: number };
  /** marcadores (se dibujan y se sustraen si hay thickness) */
  markers?: Marker[];
  /** si true, click en plano XZ añade marcador */
  holesMode?: boolean;
  addDiameter?: number;
  onAddMarker?: (m: Marker) => void;
};

export default function STLViewer({
  height = 520,
  background = "#ffffff",
  url,
  box,
  markers = [],
  holesMode = false,
  addDiameter = 5,
  onAddMarker,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // ---------- init ----------
  useEffect(() => {
    const root = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, root.clientWidth / height, 0.1, 50000);
    camera.position.set(500, 360, 520);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(root.clientWidth, root.clientHeight || height);
    renderer.shadowMap.enabled = true;
    root.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // marco visual del contenedor
    Object.assign(root.style, {
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#fff",
    });

    // luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb0b4b9, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(600, 800, 300);
    dir.castShadow = true;
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const onResize = () => {
      const w = root.clientWidth;
      const h = root.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

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

    // click-to-add markers (intersección con plano XZ)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0
    const clickHandler = (ev: MouseEvent) => {
      if (!holesMode || !onAddMarker) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const point = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, point);
      onAddMarker({ x_mm: point.x, z_mm: point.z, d_mm: addDiameter });
    };
    renderer.domElement.style.cursor = holesMode ? "crosshair" : "grab";
    const enter = () => { renderer.domElement.style.cursor = holesMode ? "crosshair" : "grab"; };
    renderer.domElement.addEventListener("click", clickHandler);
    renderer.domElement.addEventListener("mouseenter", enter);

    return () => {
      renderer.domElement.removeEventListener("click", clickHandler);
      renderer.domElement.removeEventListener("mouseenter", enter);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [height, background, holesMode, addDiameter, onAddMarker]);

  // ---------- modelo sólido por extrusión + caja alámbrica ----------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !box) return;

    // limpiar modelo anterior
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse?.((o: any) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => m?.dispose?.());
      });
      modelRef.current = null;
    }

    const { length: L, height: H, width: W, thickness } = box;
    const group = new THREE.Group();

    // (1) Caja alámbrica (si H > 0)
    if (H > 0) {
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.BoxGeometry(L, H, W)),
        new THREE.LineBasicMaterial({ color: 0x94a3b8 })
      );
      wire.position.y = H / 2;
      group.add(wire);
    }

    // (2) Placa sólida con agujeros (sin CSG externo, usando Shape + Extrude)
    if (thickness && thickness > 0) {
      // Definimos el rectángulo en el plano X–Y (ancho=W en
