"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  /** URL firmada del STL (Supabase) */
  url?: string;
  /** Alto del canvas en px */
  height?: number;
  /** Color de fondo */
  background?: string;
};

export default function STLPreview({ url, height = 520, background = "#ffffff" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // refs de three
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  // Inicializar escena una vez
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const w = container.clientWidth || container.offsetWidth || 800;
    const h = height;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
    camera.position.set(0, 0, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Luces
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(1, 1, 1);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-1, 0.5, -0.5);
    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(key, fill, amb);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.9;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let raf: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const ww = container.clientWidth || w;
      renderer.setSize(ww, h);
      camera.aspect = ww / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m: any) => m?.dispose?.());
          }
        }
      });
      try {
        container.removeChild(renderer.domElement);
      } catch {}
    };
  }, [height, background]);

  // Cargar/actualizar el STL cuando cambie la URL
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!scene || !camera || !controls) return;
    if (!url) return;

    let disposed = false;
    setStatus("loading");
    setMsg("Descargando STL…");

    (async () => {
      try {
        // Descargar binario (evita CORS raros del loader con URLs firmadas)
        const res = await fetch(url, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (disposed) return;

        // Parsear
        const loader = new STLLoader();
        const geom = loader.parse(buf);

        // Limpiar mesh anterior si lo hubiera
        if (meshRef.current) {
          const old = meshRef.current;
          scene.remove(old);
          old.geometry?.dispose?.();
          const mats = Array.isArray(old.material) ? old.material : [old.material];
          mats.forEach((m: any) => m?.dispose?.());
          meshRef.current = null;
        }

        // Material
        const mat = new THREE.MeshStandardMaterial({
          color: 0x0d1b2a,
          roughness: 0.6,
          metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geom, mat);

        // Los STL suelen venir en Z-up; pasamos a Y-up
        mesh.rotation.x = -Math.PI / 2;

        // Centrar
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);
        geom.translate(-center.x, -center.y, -center.z);

        // Añadir a escena
        scene.add(mesh);
        meshRef.current = mesh;

        // Ajustar cámara (fit)
        const maxDim = Math.max(size.x, size.y, size.z);
        const safe = Math.max(maxDim, 1);
        const dist = safe / (2 * Math.tan((camera.fov * Math.PI) / 360));
        camera.near = safe / 1000;
        camera.far = safe * 1000;
        camera.position.set(dist * 1.35, dist * 1.15, dist * 1.6);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();

        setStatus("ok");
        setMsg("");
      } catch (err: any) {
        if (disposed) return;
        setStatus("error");
        setMsg(err?.message ?? "Error cargando STL");
      }
    })();

    return () => {
      disposed = true;
    };
  }, [url]);

  return (
    <div>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          minHeight: height,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          position: "relative",
          background,
        }}
      />
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        {status === "loading" && (msg || "Cargando STL…")}
        {status === "error" && `Error: ${msg}`}
        {status === "ok" && "Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan"}
      </div>
    </div>
  );
}
