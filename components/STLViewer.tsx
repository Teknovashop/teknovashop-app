// /components/STLViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string;          // firmada de Supabase o similar
  height?: number;       // alto del canvas
  background?: string;   // color de fondo
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Referencias runtime (evitamos usar tipos THREE.* para no romper el build)
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Init + resize
  useEffect(() => {
    const container = mountRef.current!;
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1, 2));
    renderer.setSize(container.clientWidth, height);
    renderer.setClearColor(new THREE.Color(background));
    container.innerHTML = ""; // por si había algo previo
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / height, 0.1, 5000);
    camera.position.set(150, 120, 180);
    cameraRef.current = camera;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(200, 250, 200);
    scene.add(dir);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.zoomSpeed = 0.7;
    controls.panSpeed = 0.7;
    controlsRef.current = controls;

    // Grid + helpers (opcional; comenta si no quieres)
    const grid = new THREE.GridHelper(1000, 40, 0xdddddd, 0xeeeeee);
    grid.position.y = -0.01;
    scene.add(grid);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      rendererRef.current.setSize(w, height);
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);

      // Limpieza ordenada
      try {
        controls.dispose();
        renderer.dispose();
      } catch {}
      // Liberar geometrías/materiales
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m?.dispose?.());
          } else {
            obj.material?.dispose?.();
          }
        }
      });

      // Sacar el canvas del DOM
      try {
        container.removeChild(renderer.domElement);
      } catch {}

      // Null refs
      controlsRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      meshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, background]);

  // Cargar STL cuando cambia la URL
  useEffect(() => {
    setErr(null);

    const scene = sceneRef.current;
    if (!scene) return; // aún no inicializado
    // Quitar mesh previo si existía
    if (meshRef.current) {
      try {
        scene.remove(meshRef.current);
        meshRef.current.geometry?.dispose?.();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m: any) => m?.dispose?.());
        } else {
          meshRef.current.material?.dispose?.();
        }
      } catch {}
      meshRef.current = null;
    }

    if (!url) return; // nada que cargar

    setLoading(true);
    const loader = new STLLoader();

    loader.load(
      url,
      (geometry) => {
        // Material básico gris
        const material = new THREE.MeshStandardMaterial({
          color: 0xb0b7c3,
          metalness: 0.15,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        // Centrado y ajuste de escala/cámara
        fitAndCenter(geometry, mesh);

        scene.add(mesh);
        meshRef.current = mesh;

        setLoading(false);
      },
      undefined,
      (e) => {
        setLoading(false);
        setErr("No se pudo cargar el STL. Verifica la URL firmada o CORS.");
        // console.error(e);
      }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // ---- util: centrar y ajustar cámara ----
  const fitAndCenter = (geom: any, mesh: any) => {
    const camera = cameraRef.current as any;
    const controls = controlsRef.current as any;
    if (!camera || !controls) return;

    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    if (!bb) return;

    const size = new THREE.Vector3();
    bb.getSize(size);
    const center = new THREE.Vector3();
    bb.getCenter(center);

    // Centrar el mesh en escena (pivot en origen)
    mesh.position.x -= center.x;
    mesh.position.y -= center.y;
    mesh.position.z -= center.z;

    // Distancia para encajar en frustum
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2) / Math.tan(fov / 2);

    // Colocar cámara y target
    camera.position.set(center.x + dist * 0.9, center.y + dist * 0.9, center.z + dist * 1.1);
    controls.target.set(0, 0, 0);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
  };

  return (
    <div>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          borderRadius: 8,
          overflow: "hidden",
          background,
          border: "1px solid #e5e7eb",
        }}
      />
      <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
        {loading ? "Cargando STL…" : err ? err : url ? "Listo." : "Sin modelo todavía."}
      </div>
    </div>
  );
}
