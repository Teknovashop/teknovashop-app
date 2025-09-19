"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** marcador (agujero) en mm sobre plano de la placa (X,Z) */
export type Marker = { x_mm: number; z_mm: number; d_mm: number };

type Box = { length: number; height: number; width: number; thickness?: number };

type Props = {
  height?: number;
  background?: string;
  box?: Box;
  markers?: Marker[];
  /** modo agujeros activado; AÚN ASÍ exige Shift/Alt para colocar */
  holesMode?: boolean;
  addDiameter?: number;
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
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const plateMeshRef = useRef<any>(null);
  const frameKeyRef = useRef<string>("");
  const pickingPlaneRef = useRef<any>(null);
  const ghostRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const ray = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const modifierDown = useRef<boolean>(false); // SHIFT/ALT presionada

  // ---------- init (una vez) ----------
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

    Object.assign(root.style, {
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#fff",
      position: "relative",
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

    // marcadores (esferas de apoyo, opcional)
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // ghost ring para previsualizar agujero (visible solo con Shift/Alt)
    const ghostGeo = new THREE.RingGeometry(1, 1.6, 48);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.rotation.x = -Math.PI / 2;
    ghost.visible = false;
    scene.add(ghost);
    ghostRef.current = ghost;

    // resize
    const onResize = () => {
      const w = root.clientWidth;
      const h = root.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // render loop
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    // helpers
    const setMouseFromEvent = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    // cambiar cursor según modificador
    const updateCursor = () => {
      renderer.domElement.style.cursor = modifierDown.current && holesMode ? "crosshair" : "grab";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Alt") {
        modifierDown.current = true;
        updateCursor();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Alt") {
        modifierDown.current = false;
        ghostRef.current && (ghostRef.current.visible = false);
        updateCursor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onMove = (ev: MouseEvent) => {
      if (!holesMode || !modifierDown.current || !pickingPlaneRef.current || !ghostRef.current) return;
      setMouseFromEvent(ev);
      ray.current.setFromCamera(mouse.current, camera);
      const p = new THREE.Vector3();
      if (ray.current.ray.intersectPlane(pickingPlaneRef.current, p)) {
        const L = lastBox.current.length, W = lastBox.current.width;
        const r = Math.max(0.1, addDiameter / 2);
        const margin = r + 0.5;
        const minX = -L / 2 + margin, maxX = L / 2 - margin;
        const minZ = -W / 2 + margin, maxZ = W / 2 - margin;
        let x = THREE.MathUtils.clamp(p.x, minX, maxX);
        let z = THREE.MathUtils.clamp(p.z, minZ, maxZ);
        if (snapStep && snapStep > 0) {
          x = Math.round(x / snapStep) * snapStep;
          z = Math.round(z / snapStep) * snapStep;
        }
        ghostRef.current.position.set(x, 0.001 + (lastBox.current.thickness ?? 0) / 2, z);
        ghostRef.current.scale.setScalar(addDiameter / 2);
        ghostRef.current.visible = true;
      }
    };
    const onLeave = () => { ghostRef.current && (ghostRef.current.visible = false); };

    const onClick = (ev: MouseEvent) => {
      // Solo si: modo agujeros y (Shift o Alt) pulsada.
      if (!holesMode || !modifierDown.current || !onAddMarker || !pickingPlaneRef.current) return;
      setMouseFromEvent(ev);
      ray.current.setFromCamera(mouse.current, camera);
      const p = new THREE.Vector3();
      if (ray.current.ray.intersectPlane(pickingPlaneRef.current, p)) {
        const x = ghostRef.current?.position.x ?? p.x;
        const z = ghostRef.current?.position.z ?? p.z;
        onAddMarker({ x_mm: x, z_mm: z, d_mm: addDiameter });
      }
    };

    renderer.domElement.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("mouseleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);
    updateCursor();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.domElement.removeEventListener("mouseleave", onLeave);
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo una vez

  // mantener box para ghost
  const lastBox = useRef<Box>({ length: 0, height: 0, width: 0, thickness: 0 });
  useEffect(() => { if (box) lastBox.current = { ...box }; }, [box?.length, box?.width, box?.height, box?.thickness]);

  // reconstruir placa + encuadre SOLO si cambian dimensiones (no al añadir agujeros)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !box) return;

    const L = box.length, W = box.width, H = box.height, T = box.thickness ?? 0;

    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, -W / 2);
    shape.lineTo( L / 2, -W / 2);
    shape.lineTo( L / 2,  W / 2);
    shape.lineTo(-L / 2,  W / 2);
    shape.lineTo(-L / 2, -W / 2);

    (markers || []).forEach((mk) => {
      const r = Math.max(0.1, mk.d_mm / 2);
      const hole = new THREE.Path();
      hole.absellipse(mk.x_mm, mk.z_mm, r, r, 0, Math.PI * 2, false, 0);
      shape.holes.push(hole);
    });

    const geom = new THREE.ExtrudeGeometry(shape, { depth: T > 0 ? T : 0.001, bevelEnabled: false, steps: 1 });
    geom.rotateX(Math.PI / 2);
    geom.translate(0, (T || 0) / 2, 0);

    const material = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.45, color: 0xf3f4f6 });

    if (!plateMeshRef.current) {
      plateMeshRef.current = new THREE.Mesh(geom, material);
      plateMeshRef.current.castShadow = true;
      plateMeshRef.current.receiveShadow = true;
      scene.add(plateMeshRef.current);
    } else {
      plateMeshRef.current.geometry.dispose();
      plateMeshRef.current.geometry = geom;
    }

    pickingPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(T || 0) / 2);

    const newKey = `${L}|${W}|${H}|${T}`;
    if (newKey !== frameKeyRef.current) {
      frameKeyRef.current = newKey;
      try {
        const camera = cameraRef.current!;
        const controls = controlsRef.current!;
        const box3 = new THREE.Box3().setFromObject(plateMeshRef.current);
        const size = new THREE.Vector3(); box3.getSize(size);
        const center = new THREE.Vector3(); box3.getCenter(center);
        controls.target.copy(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let distance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.6;
        const dir = new THREE.Vector3(1, 0.8, 1).normalize();
        camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
        camera.near = 0.1; camera.far = distance * 20; camera.updateProjectionMatrix();
      } catch {}
    }
  }, [box?.length, box?.width, box?.height, box?.thickness, markers]);

  // esferas de apoyo (opcionales)
  useEffect(() => {
    const group = markersGroupRef.current;
    if (!group) return;
    for (let i = group.children.length - 1; i >= 0; i--) {
      const ch = group.children[i] as any;
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
      group.remove(ch);
    }
    const T = box?.thickness ?? 0;
    const mat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    (markers || []).forEach((mk) => {
      const r = Math.max(0.8, mk.d_mm / 2);
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat);
      s.position.set(mk.x_mm, 0.1 + T / 2, mk.z_mm);
      group.add(s);
    });
  }, [markers, box?.thickness]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur px-3 py-1 border-b border-gray-200">
        <div className="text-xs text-gray-600">
          Visor 3D · rueda: zoom · arrastra: rotar/pan · <strong>Shift/Alt + clic</strong>: agujero
        </div>
        <div className="flex gap-6 text-xs text-gray-500"><span>L</span><span>H</span><span>W</span></div>
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
