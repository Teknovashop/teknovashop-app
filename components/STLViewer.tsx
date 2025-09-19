"use client";

/**
 * Visor 3D con previews específicos por modelo (no rompe compatibilidad):
 * - Si recibe `shape`, pinta la geometría del modelo.
 * - Si NO recibe `shape`, mantiene el placeholder (caja alámbrica).
 * - Click para agujeros requiere Shift o Alt. `snapStep` opcional (redondeo).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** marcador de agujero dibujado en el visor */
export type Marker = { x_mm: number; z_mm: number; d_mm: number };

type Shape =
  | { kind: "plate"; L: number; W: number; T: number }
  | { kind: "plate_chamfer"; L: number; W: number; T: number }
  | { kind: "u_channel"; L: number; W: number; H: number; wall: number }
  | { kind: "l_bracket"; W: number; D: number; flange: number; T: number }
  | { kind: "phone_stand"; W: number; D: number; angleDeg: number; T: number }
  | { kind: "box_hollow"; L: number; W: number; H: number; wall: number }
  | { kind: "clip_c"; diameter: number; width: number; T: number }
  | { kind: "unknown" };

type Props = {
  height?: number;
  background?: string;
  /** url STL (opcional; no la usamos aún) */
  url?: string;
  /** bounding box fallback (L x H x W) en mm */
  box?: { length: number; height: number; width: number; thickness?: number };
  /** forma a renderizar (si se pasa, sustituye al placeholder) */
  shape?: Shape;
  /** marcadores (se dibujan como esferas) */
  markers?: Marker[];
  /** si true, Shift/Alt + click en el plano XZ añade marcador */
  holesMode?: boolean;
  addDiameter?: number;
  snapStep?: number;
  onAddMarker?: (m: Marker) => void;
};

export default function STLViewer({
  height = 520,
  background = "#ffffff",
  url,
  box,
  shape,
  markers = [],
  holesMode = false,
  addDiameter = 5,
  snapStep = 1,
  onAddMarker,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // Tipado laxo para evitar problemas de @types/three en Vercel
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // ---------- init ----------
  useEffect(() => {
    const root = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, root.clientWidth / height, 0.1, 20000);
    camera.position.set(600, 360, 520);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const onResize = () => {
      const w = root.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    // markers group
    const g = new THREE.Group();
    scene.add(g);
    markersGroupRef.current = g;

    // click-to-add markers (intersección con plano XZ)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0
    const clickHandler = (ev: MouseEvent) => {
      if (!holesMode || !onAddMarker) return;
      // Requiere tecla modificadora para no interferir con la cámara
      if (!ev.shiftKey && !ev.altKey) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, camera);
      const point = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, point);

      // snap opcional
      const s = Math.max(0.1, snapStep);
      const snap = (v: number) => Math.round(v / s) * s;

      onAddMarker({
        x_mm: snap(point.x),
        z_mm: snap(point.z),
        d_mm: addDiameter,
      });
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
  }, [height, background, holesMode, addDiameter, onAddMarker, snapStep]);

  // ---------- helpers: crear geometrías por modelo ----------
  function clearModel(scene: THREE.Scene) {
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse?.((o: any) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => m?.dispose?.());
      });
      modelRef.current = null;
    }
  }

  function addMesh(scene: THREE.Scene, mesh: THREE.Object3D) {
    scene.add(mesh);
    modelRef.current = mesh;
  }

  // place base mesh on ground (y=0) centered
  function placeY(mesh: THREE.Object3D, T: number) {
    mesh.position.y = T / 2;
  }

  // ---------- preview específico ----------
  useEffect(() => {
    const scene = sceneRef.current as THREE.Scene | null;
    if (!scene) return;

    clearModel(scene);

    // Si hay `shape`, renderizamos según tipo; fallback: caja alámbrica con `box`
    if (shape) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xb0b6bf, roughness: 0.6, metalness: 0.05 });

      if (shape.kind === "plate") {
        const g = new THREE.BoxGeometry(shape.L, shape.T, shape.W);
        const m = new THREE.Mesh(g, mat);
        placeY(m, shape.T);
        addMesh(scene, m);
        return;
      }

      if (shape.kind === "plate_chamfer") {
        // “falso chaflán”: base + tapa ligeramente menor
        const base = new THREE.Mesh(new THREE.BoxGeometry(shape.L, shape.T * 0.7, shape.W), mat);
        placeY(base, shape.T * 0.7);
        const top = new THREE.Mesh(new THREE.BoxGeometry(shape.L * 0.94, shape.T * 0.3, shape.W * 0.94), mat);
        top.position.y = shape.T * 0.7 + (shape.T * 0.3) / 2;
        const grp = new THREE.Group();
        grp.add(base, top);
        addMesh(scene, grp);
        return;
      }

      if (shape.kind === "u_channel") {
        // base
        const base = new THREE.Mesh(new THREE.BoxGeometry(shape.L, shape.wall, shape.W), mat);
        placeY(base, shape.wall);
        // paredes
        const sideH = Math.max(0, shape.H - shape.wall);
        const side1 = new THREE.Mesh(new THREE.BoxGeometry(shape.L, sideH, shape.wall), mat);
        const side2 = new THREE.Mesh(new THREE.BoxGeometry(shape.L, sideH, shape.wall), mat);
        side1.position.set(0, shape.wall + sideH / 2, shape.W / 2 - shape.wall / 2);
        side2.position.set(0, shape.wall + sideH / 2, -shape.W / 2 + shape.wall / 2);
        const grp = new THREE.Group();
        grp.add(base, side1, side2);
        addMesh(scene, grp);
        return;
      }

      if (shape.kind === "l_bracket") {
        const base = new THREE.Mesh(new THREE.BoxGeometry(shape.D, shape.T, shape.W), mat);
        placeY(base, shape.T);
        const flange = new THREE.Mesh(new THREE.BoxGeometry(shape.T, shape.flange, shape.W), mat);
        flange.position.set(-shape.D / 2 + shape.T / 2, shape.T + shape.flange / 2, 0);
        const grp = new THREE.Group();
        grp.add(base, flange);
        addMesh(scene, grp);
        return;
      }

      if (shape.kind === "phone_stand") {
        const base = new THREE.Mesh(new THREE.BoxGeometry(shape.D, shape.T, shape.W), mat);
        placeY(base, shape.T);
        const back = new THREE.Mesh(new THREE.BoxGeometry(shape.D * 0.9, shape.T, shape.W), mat);
        // transfiere la placa trasera a un grupo y la rotamos sobre su arista
        const pivot = new THREE.Group();
        pivot.position.set(-shape.D / 2 + shape.T / 2, shape.T, 0);
        back.position.set(shape.D * 0.45 - shape.T / 2, 0, 0);
        back.rotateZ(THREE.MathUtils.degToRad(90));
        pivot.add(back);
        pivot.rotateZ(-THREE.MathUtils.degToRad(shape.angleDeg));
        const grp = new THREE.Group();
        grp.add(base, pivot);
        addMesh(scene, grp);
        return;
      }

      if (shape.kind === "box_hollow") {
        // Representamos base + 4 paredes
        const base = new THREE.Mesh(new THREE.BoxGeometry(shape.L, shape.wall, shape.W), mat);
        placeY(base, shape.wall);
        const wallH = Math.max(0, shape.H - shape.wall);
        const wallX = new THREE.Mesh(new THREE.BoxGeometry(shape.wall, wallH, shape.W), mat);
        const wallX2 = wallX.clone();
        wallX.position.set(shape.L / 2 - shape.wall / 2, shape.wall + wallH / 2, 0);
        wallX2.position.set(-shape.L / 2 + shape.wall / 2, shape.wall + wallH / 2, 0);
        const wallZ = new THREE.Mesh(new THREE.BoxGeometry(shape.L - shape.wall * 2, wallH, shape.wall), mat);
        const wallZ2 = wallZ.clone();
        wallZ.position.set(0, shape.wall + wallH / 2, shape.W / 2 - shape.wall / 2);
        wallZ2.position.set(0, shape.wall + wallH / 2, -shape.W / 2 + shape.wall / 2);
        const grp = new THREE.Group();
        grp.add(base, wallX, wallX2, wallZ, wallZ2);
        addMesh(scene, grp);
        return;
      }

      if (shape.kind === "clip_c") {
        // aproximación: prisma con bisel lateral (placeholder mejor que caja)
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(20, shape.diameter * 1.2), shape.T, shape.width),
          mat
        );
        placeY(base, shape.T);
        const wedge = new THREE.Mesh(
          new THREE.BoxGeometry(shape.diameter * 0.7, shape.T, shape.width * 0.6),
          mat
        );
        wedge.position.set(
          (base as any).geometry.parameters.width / 2 - (wedge as any).geometry.parameters.width / 2,
          shape.T / 2,
          0
        );
        const grp = new THREE.Group();
        grp.add(base, wedge);
        addMesh(scene, grp);
        return;
      }
      // si llega aquí, no reconocido
    }

    // Fallback: placeholder caja alámbrica
    if (box) {
      const { length: L, height: H, width: W } = box;
      const g = new THREE.BoxGeometry(L, H, W);
      const m = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.y = H / 2;
      addMesh(scene, mesh);
    }
  }, [shape, box]);

  // ---------- dibujar marcadores ----------
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;
    // limpiar
    for (let i = group.children.length - 1; i >= 0; i--) {
      const ch: any = group.children[i];
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
        <div className="text-xs text-gray-600">
          Visor 3D · rueda: zoom · arrastra: rotar/pan · <span className="font-medium">Shift/Alt + clic</span>: agujero
        </div>
        <div className="flex gap-6 text-xs text-gray-500">
          <span>L</span>
          <span>H</span>
          <span>W</span>
        </div>
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
