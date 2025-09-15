"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { WebGLRenderer, PerspectiveCamera, Scene, Mesh } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type Props = {
  url?: string;
  height?: number;
  background?: string;
  modelColor?: string;
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
  modelColor = "#3f444c",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs de three con TIPOS nombrados (no Three.*)
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const meshRef = useRef<Mesh | null>(null);

  // Init
  useEffect(() => {
    const container = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / height,
      0.1,
      2000
    );
    cameraRef.current = camera;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 1, 2);
    scene.add(dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let rafId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = container.clientWidth / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();

      // Limpieza de recursos
      try {
        renderer.dispose();
        renderer.forceContextLoss?.();
        (renderer.domElement.parentNode as HTMLElement | null)?.removeChild(
          renderer.domElement
        );
      } catch {}

      try {
        scene.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            mats.forEach((m: any) => m?.dispose?.());
          }
        });
      } catch {}

      scene.clear();

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      meshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, background]);

  // Carga STL
  useEffect(() => {
    if (!url || !sceneRef.current || !cameraRef.current || !rendererRef.current)
      return;

    const scene = sceneRef.current;
    const cam = cameraRef.current;
    const renderer = rendererRef.current;

    // Borra modelo previo si existe
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry?.dispose?.();
      const mats = Array.isArray((meshRef.current as any).material)
        ? (meshRef.current as any).material
        : [(meshRef.current as any).material];
      mats.forEach((m: any) => m?.dispose?.());
      meshRef.current = null;
    }

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        // Centrar y escalar de forma amable
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);

        // Material
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          metalness: 0.05,
          roughness: 0.85,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Centrar en origen
        const center = new THREE.Vector3();
        bb.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        scene.add(mesh);
        meshRef.current = mesh;

        // Colocar cámara basada en la diagonal del bounding box
        const diagonal = size.length(); // mm
        const dist = diagonal * 1.4 + 50; // pequeño margen
        cam.position.set(dist, dist, dist);
        cam.near = Math.max(0.1, diagonal * 0.002);
        cam.far = Math.max(2000, diagonal * 8);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();

        renderer.render(scene, cam);
      },
      undefined,
      (err) => {
        // Opcional: podrías mostrar un toast fuera
        // console.error("Error cargando STL:", err);
      }
    );
  }, [url, modelColor]);

  return (
    <div
      ref={mountRef}
      className="w-full rounded-xl border border-gray-200 overflow-hidden"
      style={{ height }}
    />
  );
}
