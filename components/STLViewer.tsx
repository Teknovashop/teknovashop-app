"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type Props = {
  url?: string;            // URL firmada del STL
  height: number;          // alto del canvas
  background?: string;     // color fondo
  modelColor?: string;     // color del mesh
};

export default function STLViewer({
  url,
  height,
  background = "#ffffff",
  modelColor = "#3f444c",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Init 1 sola vez
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / height,
      0.1,
      5000
    );
    camera.position.set(350, 250, 350);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const light = new THREE.HemisphereLight(0xffffff, 0x777777, 1.0);
    scene.add(light);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Rejilla chula
    const grid = new THREE.GridHelper(2000, 40, 0xdddddd, 0xeeeeee);
    (grid.material as THREE.Material).opacity = 0.6;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.0001; // para evitar z-fighting
    scene.add(grid);

    // Render loop
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      rendererRef.current.setSize(w, height);
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(onResize);
    obs.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();

      // Limpieza completa
      controls.dispose();
      renderer.dispose();

      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });

      // DOM
      try {
        container.removeChild(renderer.domElement);
      } catch {}

      // Nulos
      controlsRef.current = null;
      meshRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [height, background]);

  // Carga STL cada vez que cambia la URL
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !renderer || !camera) return;

    // quita mesh anterior
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry?.dispose?.();
      const mats = Array.isArray(meshRef.current.material)
        ? meshRef.current.material
        : [meshRef.current.material];
      mats.forEach((m: any) => m?.dispose?.());
      meshRef.current = null;
    }

    if (!url) {
      renderer.render(scene, camera);
      return;
    }

    // 🔥 Cache-buster para forzar descarga nueva
    const effectiveUrl = (() => {
      const hasQuery = url.includes("?");
      const sep = hasQuery ? "&" : "?";
      return `${url}${sep}cb=${Date.now()}`;
    })();

    const loader = new STLLoader();
    loader.load(
      effectiveUrl,
      (geom) => {
        // Material
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          roughness: 0.6,
          metalness: 0.0,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        // Centro & escala: ajustamos cámara al tamaño
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        // Centrar la pieza en origen
        const m = new THREE.Matrix4().makeTranslation(
          -center.x,
          -center.y,
          -center.z
        );
        geom.applyMatrix4(m);
        mesh.position.set(0, 0, 0);

        scene.add(mesh);
        meshRef.current = mesh;

        // Fit camera
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 1.8;
        camera.position.set(dist, dist * 0.7, dist);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }

        renderer.render(scene, camera);
      },
      undefined,
      (err) => {
        console.error("STL load error", err);
      }
    );
  }, [url, modelColor]);

  return <div ref={mountRef} style={{ height }} className="w-full" />;
}
