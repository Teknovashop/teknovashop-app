// components/STLViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string;             // pasar undefined si no hay STL
  height?: number;          // alto del canvas
  background?: string;      // color fondo
  modelColor?: string;      // color del mesh
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
  modelColor = "#44484f",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [loading, setLoading] = useState(false);

  // Init (renderer, camera, scene, lights, grid)
  useEffect(() => {
    const container = mountRef.current!;
    // Limpieza si ya había renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      container.innerHTML = "";
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / height,
      0.1,
      5000
    );
    camera.position.set(280, 200, 280);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 40;
    controls.maxDistance = 1800;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(400, 500, 200);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-300, 200, -200);
    scene.add(fill);

    // Grid
    const grid = new THREE.GridHelper(2000, 100, 0xe5e7eb, 0xe5e7eb);
    (grid.material as THREE.Material).opacity = 0.75;
    (grid.material as THREE.Material as any).transparent = true;
    scene.add(grid);

    // Animación
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!rendererRef.current) return;
      const w = container.clientWidth;
      rendererRef.current.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // Guardamos scene en el div por si hiciera falta inspección (dev)
    (container as any).__three_scene = scene;

    // Limpieza
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const anyObj: any = obj;
        if (anyObj.isMesh) {
          anyObj.geometry?.dispose?.();
          if (Array.isArray(anyObj.material)) {
            anyObj.material.forEach((m: any) => m?.dispose?.());
          } else {
            anyObj.material?.dispose?.();
          }
        }
      });
      container.innerHTML = "";
    };
  }, [height, background]);

  // Carga del STL
  useEffect(() => {
    const container = mountRef.current!;
    const renderer = rendererRef.current;
    if (!container || !renderer) return;

    const scene: THREE.Scene = (container as any).__three_scene;

    // Si no hay URL limpiamos y salimos
    if (!url) {
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry?.dispose?.();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m: any) => m?.dispose?.());
        } else {
          (meshRef.current.material as any)?.dispose?.();
        }
        meshRef.current = null;
      }
      return;
    }

    setLoading(true);
    const loader = new STLLoader();

    loader.load(
      url,
      (geometry) => {
        // Limpiar mesh anterior
        if (meshRef.current) {
          scene.remove(meshRef.current);
          meshRef.current.geometry?.dispose?.();
        }

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          metalness: 0.2,
          roughness: 0.8,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        scene.add(mesh);
        meshRef.current = mesh;

        // Ajuste de cámara a bounding sphere
        geometry.computeBoundingSphere();
        const bs = geometry.boundingSphere!;
        const size = bs.radius * 2.2;
        const camera = (renderer as any).__camera as THREE.PerspectiveCamera | undefined;

        // En lugar de guardar la cámara, la localizamos a partir del control
        const controls = (controlsRef.current as OrbitControls)!;
        const cam = controls.object as THREE.PerspectiveCamera;

        cam.position.set(bs.center.x + size, bs.center.y + size, bs.center.z + size);
        controls.target.copy(bs.center);
        controls.update();

        setLoading(false);
      },
      undefined,
      () => setLoading(false)
    );
  }, [url, modelColor]);

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header mini con estado */}
      <div className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-600 shadow">
        {loading ? "Cargando STL…" : url ? "Listo" : "Sin STL"}
      </div>

      {/* Canvas */}
      <div ref={mountRef} style={{ height }} className="w-full" />

      {/* Overlay loader */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          <span className="ml-2 text-sm text-gray-600">Procesando…</span>
        </div>
      )}

      {/* Ayuda de interacción */}
      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
        Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan
      </div>
    </div>
  );
}
