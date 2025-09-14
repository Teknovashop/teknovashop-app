// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = { url?: string | null; height?: number; background?: string };

export default function STLViewer({ url, height = 520, background = "#ffffff" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const [stats, setStats] = useState<{ tri: number; bbox: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Init
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / height, 0.1, 2000);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background || "#ffffff");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(1, 1, 1);
    scene.add(dir);

    // rejilla
    const grid = new THREE.GridHelper(1000, 40, 0xdddddd, 0xeeeeee);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const onResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
          else o.material?.dispose?.();
        }
      });
    };
  }, [height, background]);

  // Cargar STL cuando cambia la URL
  useEffect(() => {
    if (!url || !sceneRef.current || !cameraRef.current) return;
    setLoading(true);

    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // limpia malla anterior
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry?.dispose?.();
      if (Array.isArray(meshRef.current.material))
        meshRef.current.material.forEach((m) => m?.dispose?.());
      else meshRef.current.material?.dispose?.();
      meshRef.current = null;
    }

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        // material limpio
        const material = new THREE.MeshStandardMaterial({
          color: 0x2b2f36,
          roughness: 0.55,
          metalness: 0.05,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshRef.current = mesh;

        // centra y ajusta cámara
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);
        mesh.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z || 1);
        const dist = maxDim * 1.85;
        camera.position.set(dist, dist, dist);
        camera.near = dist / 100;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();
        controlsRef.current?.target.set(0, 0, 0);
        controlsRef.current?.update();

        // stats
        const tri = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
        setStats({
          tri: Math.round(tri),
          bbox: `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(size.z)}`
        });

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("Error cargando STL:", err);
        setStats(null);
        setLoading(false);
      }
    );
  }, [url]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mountRef} style={{ width: "100%", height }} />
      <div style={{
        position: "absolute", left: 12, top: 12, fontSize: 12, color: "#111",
        background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb",
        borderRadius: 8, padding: "6px 10px"
      }}>
        {stats ? (
          <>
            <div><strong>triángulos:</strong> {stats.tri}</div>
            <div><strong>bbox:</strong> {stats.bbox}</div>
          </>
        ) : loading ? "Cargando STL…" : "—"}
      </div>
      <p style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
        Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan
      </p>
    </div>
  );
}
