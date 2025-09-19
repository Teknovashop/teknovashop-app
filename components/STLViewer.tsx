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

  // Tipos “deploy-safe” para evitar conflictos de d.ts de three en Vercel
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

    // (2) Placa sólida con agujeros (Shape + Extrude)
    if (thickness && thickness > 0) {
      // Rectángulo en plano X–Y
      const shape = new THREE.Shape();
      shape.moveTo(-L / 2, -W / 2);
      shape.lineTo( L / 2, -W / 2);
      shape.lineTo( L / 2,  W / 2);
      shape.lineTo(-L / 2,  W / 2);
      shape.lineTo(-L / 2, -W / 2);

      // Agujeros circulares (x=z en plano)
      (markers || []).forEach((mk) => {
        const r = Math.max(0.1, mk.d_mm / 2);
        const hole = new THREE.Path();
        hole.absellipse(mk.x_mm, mk.z_mm, r, r, 0, Math.PI * 2, false, 0);
        shape.holes.push(hole);
      });

      // Extrusión → rotamos para que el espesor sea Y y apoye en Y=0
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
      });
      geom.rotateX(Math.PI / 2);      // Z → Y
      geom.translate(0, thickness / 2, 0);

      const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.45, color: 0xf3f4f6 })
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // añadir a escena y encuadrar
    scene.add(group);
    modelRef.current = group;

    try {
      const camera = cameraRef.current!;
      const controls = controlsRef.current!;
      const box3 = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      box3.getSize(size);
      const center = new THREE.Vector3();
      box3.getCenter(center);

      controls.target.copy(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let distance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
      distance *= 1.6;
      const dir = new THREE.Vector3(1, 0.8, 1).normalize();
      camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
      camera.near = 0.1;
      camera.far = distance * 20;
      camera.updateProjectionMatrix();
    } catch {}
  }, [box, markers]);

  // ---------- marcadores visibles (esferas) ----------
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;

    // limpiar
    for (let i = group.children.length - 1; i >= 0; i--) {
      const ch = group.children[i] as any;
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
      group.remove(ch);
    }
    // añadir
    const mat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    (markers || []).forEach((mk) => {
      const r = Math.max(0.8, mk.d_mm / 2);
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat);
      s.position.set(mk.x_mm, 0.1 + (box?.thickness ? box.thickness / 2 : 0), mk.z_mm);
      group.add(s);
    });
  }, [markers, box?.thickness]);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Barra superior del visor */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur px-3 py-1 border-b border-gray-200">
        <div className="text-xs text-gray-600">Visor 3D · arrastra para rotar · rueda para zoom · Shift+drag pan</div>
        <div className="flex gap-6 text-xs text-gray-500">
          <span>L</span><span>H</span><span>W</span>
        </div>
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
