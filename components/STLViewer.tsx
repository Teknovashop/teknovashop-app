// components/STLViewer.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type STLViewerProps = {
  stlUrl?: string;                 // URL firmada o blob
  width?: number;
  height?: number;
  onMeasure?(mm: number): void;    // callback distancia medida
};

export default function STLViewer({
  stlUrl,
  width = 800,
  height = 520,
  onMeasure,
}: STLViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [distanceMM, setDistanceMM] = useState<number | null>(null);

  const state = useMemo(
    () => ({
      renderer: null as THREE.WebGLRenderer | null,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, width / height, 0.1, 5000),
      controls: null as any,
      model: null as THREE.Mesh | null,
      measurePoints: [] as THREE.Vector3[],
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      grid: null as THREE.GridHelper | null,
      axes: null as THREE.AxesHelper | null,
      pmrem: null as THREE.PMREMGenerator | null,
    }),
    [width, height]
  );

  useEffect(() => {
    if (!mountRef.current) return;

    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.setSize(width, height);
    mountRef.current.appendChild(state.renderer.domElement);

    // Scene
    state.scene.background = null;

    // Camera
    state.camera.position.set(220, 140, 220);
    state.camera.lookAt(0, 0, 0);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 200, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(100, 100, 50);
    state.scene.add(hemi, dir);

    // Grid en mm (1m = 1000 mm): cuadricula 1000x1000mm con divisiones cada 10mm
    state.grid = new THREE.GridHelper(1000, 100); // size mm, divisions
    (state.grid.material as THREE.Material).opacity = 0.35;
    (state.grid.material as THREE.Material).transparent = true;
    state.grid.rotation.x = Math.PI / 2; // que la grid quede en plano Y=0
    state.scene.add(state.grid);

    // Ejes
    state.axes = new THREE.AxesHelper(120);
    state.scene.add(state.axes);

    // OrbitControls livianos (sin dependencia externa): simple drag-rotate/zoom
    let isDragging = false;
    let last = { x: 0, y: 0 };
    const el = state.renderer.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      state.camera.position.multiplyScalar(delta > 0 ? 1.1 : 0.9);
    };

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
      state.scene.rotation.y += dx * rot;
      state.scene.rotation.x += dy * rot;
    };
    const onUp = () => (isDragging = false);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // Medición: clic para marcar 2 puntos sobre el modelo
    const onClick = (e: MouseEvent) => {
      if (!state.model) return;
      const rect = el.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hits = state.raycaster.intersectObject(state.model, true);
      if (hits.length) {
        state.measurePoints.push(hits[0].point.clone());
        if (state.measurePoints.length === 2) {
          const [a, b] = state.measurePoints;
          const mm = a.distanceTo(b); // nuestras unidades ya son mm
          setDistanceMM(mm);
          onMeasure?.(mm);
          state.measurePoints = [];
          // dibujar una línea temporal
          const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
          const mat = new THREE.LineBasicMaterial({ transparent: true });
          const line = new THREE.Line(geo, mat);
          state.scene.add(line);
          setTimeout(() => {
            state.scene.remove(line);
            geo.dispose();
            mat.dispose();
          }, 1500);
        }
      }
    };
    el.addEventListener("click", onClick);

    // Render loop
    let raf = 0;
    const tick = () => {
      state.renderer!.render(state.scene, state.camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("click", onClick);
      state.renderer?.dispose();
      mountRef.current?.removeChild(el);
    };
  }, [height, width]); // no dependemos de stlUrl aquí

  // Carga/recarga del STL
  useEffect(() => {
    if (!state.renderer) return;
    if (!stlUrl) return;

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        // Asumimos mm en geometría (tu backend ya exporta en mm).
        const material = new THREE.MeshStandardMaterial({
          metalness: 0.1,
          roughness: 0.6,
          opacity: 1,
          transparent: false,
        });

        if (state.model) {
          state.scene.remove(state.model);
          (state.model.geometry as THREE.BufferGeometry).dispose();
          (state.model.material as THREE.Material).dispose();
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        state.scene.add(mesh);
        state.model = mesh;

        // Frame automático
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        state.scene.position.set(-center.x, -bb.min.y, -center.z);

        // Ajusta cámara según tamaño
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 2.2;
        state.camera.position.set(dist, dist * 0.6, dist);
        state.camera.lookAt(0, 0, 0);
      },
      undefined,
      (err) => {
        console.error("STL load error:", err);
      }
    );
  }, [stlUrl]);

  return (
    <div className="relative rounded-2xl shadow-sm border bg-white/60" style={{ width, height }}>
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-white/80 rounded">
        {distanceMM ? `Medida: ${distanceMM.toFixed(1)} mm` : "Click x2 para medir"}
      </div>
      <button
        onClick={() => {
          state.scene.rotation.set(0, 0, 0);
          state.camera.position.set(220, 140, 220);
          state.camera.lookAt(0, 0, 0);
        }}
        className="absolute top-2 right-2 text-xs px-2 py-1 bg-white/80 rounded hover:bg-white"
      >
        Reset
      </button>
    </div>
  );
}
