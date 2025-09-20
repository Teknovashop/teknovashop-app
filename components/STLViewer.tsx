"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useEffect, useRef } from "react";

// ✅ importa SOLO tipos desde three (soluciona errores en Vercel)
import type {
  Mesh,
  Group,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Raycaster as ThreeRaycaster,
  Vector2 as ThreeVector2,
} from "three";

/** Marcador de agujero que viaja al backend */
export type Marker = {
  x_mm: number;
  y_mm?: number; // altura exacta del pick
  z_mm: number;
  d_mm: number;
  // normal de la cara para orientar el taladro
  nx?: number;
  ny?: number;
  nz?: number;
  // opcional (por si más adelante añadimos selector manual)
  axis?: "auto" | "x" | "y" | "z";
};

type Box = {
  length: number; // L (X)
  height: number; // H (Y)
  width: number;  // W (Z)
  thickness?: number;
};

type Props = {
  background?: string;
  box: Box;
  markers: Marker[];
  holesMode: boolean;
  addDiameter: number;
  snapStep: number;
  onAddMarker: (m: Marker) => void;
};

export default function STLViewer({
  background = "#ffffff",
  box,
  markers,
  holesMode,
  addDiameter,
  snapStep,
  onAddMarker,
}: Props) {
  // refs tipadas (sin usar THREE.<Tipo> en las anotaciones)
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<Mesh | Group | null>(null);
  const markersGroupRef = useRef<Group | null>(null);
  const raycaster = useRef<ThreeRaycaster>(new THREE.Raycaster());
  const mouse = useRef<ThreeVector2>(new THREE.Vector2());

  // ---------- init ----------
  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      10000
    );
    camera.position.set(300, 200, 300);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // grid/axes
    const grid = new THREE.GridHelper(2000, 40, 0xcccccc, 0xeaeaea);
    (grid.material as THREE.Material).opacity = 0.9;
    (grid.material as THREE.Material as any).transparent = true;
    scene.add(grid);

    const axes = new THREE.AxesHelper(120);
    scene.add(axes);

    // luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(200, 300, 150);
    scene.add(dir);

    // contenedor de marcadores
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [background]);

  // ---------- (re)crear modelo "proxy" para picking y preview ----------
  useEffect(() => {
    const scene = sceneRef.current!;
    // limpia anterior
    if (modelRef.current) {
      scene.remove(modelRef.current);
      (modelRef.current as any).geometry?.dispose?.();
    }

    // Caja proxy cerrada (L x H x W), centrada en origen (Y = altura/2)
    const geom = new THREE.BoxGeometry(box.length, box.height, box.width);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, box.height / 2, 0);
    scene.add(mesh);
    modelRef.current = mesh;
  }, [box.length, box.height, box.width]);

  // ---------- dibujar marcadores ----------
  useEffect(() => {
    const group = markersGroupRef.current!;
    // cleanup
    while (group.children.length) {
      const c = group.children.pop()!;
      (c as any).geometry?.dispose?.();
      (c as any).material?.dispose?.();
    }
    // esferas negras en cada marker (en coordenadas de escena = mm)
    for (const m of markers) {
      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(
          Math.max(1.2, Math.min(3, (m.d_mm ?? addDiameter) * 0.18)),
          16,
          16
        ),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      sph.position.set(m.x_mm, m.y_mm ?? 0, m.z_mm);
      group.add(sph);
    }
  }, [markers, addDiameter]);

  // ---------- picking por cara ----------
  useEffect(() => {
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;
    const scene = sceneRef.current!;

    const handlePointerDown = (ev: PointerEvent) => {
      if (!holesMode) return;
      // Solo con Shift o Alt (mantén control de cámara si no los pulsas)
      if (!(ev.shiftKey || ev.altKey)) return;

      const rect = (renderer.domElement as HTMLCanvasElement).getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // 1) intentar intersectar con el modelo (cara real)
      let pickedPoint: THREE.Vector3 | null = null;
      let pickedNormal: THREE.Vector3 | null = null;

      if (modelRef.current) {
        const hits = raycaster.current.intersectObject(modelRef.current, true);
        if (hits.length) {
          const h = hits[0];
          pickedPoint = h.point.clone();

          // normal de la cara, transformada a espacio mundial
          const normal = h.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
          const nMat = new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld);
          normal.applyMatrix3(nMat).normalize();
          pickedNormal = normal;
        }
      }

      // 2) fallback: plano base (Y=0) si no hay intersección con el modelo
      if (!pickedPoint) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(plane, point);
        pickedPoint = point;
        pickedNormal = new THREE.Vector3(0, 1, 0);
      }

      // snap
      const snap = Math.max(0.1, snapStep);
      const sx = Math.round(pickedPoint.x / snap) * snap;
      const sy = Math.round(pickedPoint.y / snap) * snap;
      const sz = Math.round(pickedPoint.z / snap) * snap;

      onAddMarker({
        x_mm: sx,
        y_mm: sy,
        z_mm: sz,
        d_mm: addDiameter,
        nx: pickedNormal!.x,
        ny: pickedNormal!.y,
        nz: pickedNormal!.z,
        axis: "auto",
      });
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    return () => {
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [holesMode, addDiameter, snapStep, onAddMarker]);

  return (
    <div
      ref={mountRef}
      className="h-full w-full rounded-xl border border-gray-200 bg-white"
    />
  );
}
