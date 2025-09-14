"use client";
// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  url?: string;
  height?: number;
  background?: string;
  showEdges?: boolean;
};

export default function STLPreview({ url, height = 460, background = "#ffffff", showEdges = false }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [stats, setStats] = useState<{ tris: number; bbox: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / height, 0.1, 10000);
    camera.position.set(0, 0, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Luces
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(200, 300, 400);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-200, -100, -200);
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(key, fill, amb);

    // Plano base
    const grid = new THREE.GridHelper(800, 20, 0xdddddd, 0xeeeeee);
    grid.visible = false; // desactivado para look limpio
    scene.add(grid);

    let mesh: THREE.Mesh | null = null;
    let edges: THREE.LineSegments | null = null;

    const fitCamera = (geom: THREE.BufferGeometry) => {
      geom.computeBoundingBox();
      const bb = geom.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);
      const center = new THREE.Vector3();
      bb.getCenter(center);

      // centra malla en el origen
      geom.translate(-center.x, -center.y, -center.z);

      // encuadre
      const maxDim = Math.max(size.x, size.y, size.z || 1);
      const dist = maxDim * 2.2; // factor distancia
      camera.position.set(dist, dist, dist);
      camera.near = 0.1;
      camera.far = dist * 20;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    };

    const loadSTL = async () => {
      if (!url) return;
      setLoading(true);

      // CORS-friendly
      const loader = new STLLoader();
      loader.crossOrigin = "anonymous";

      loader.load(
        url,
        (geometry) => {
          // malla
          const material = new THREE.MeshStandardMaterial({
            color: 0x2b3037,
            metalness: 0.15,
            roughness: 0.9
          });
          mesh = new THREE.Mesh(geometry, material);
          scene.add(mesh);

          if (showEdges) {
            const edgesGeo = new THREE.EdgesGeometry(geometry, 1);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x999999 });
            edges = new THREE.LineSegments(edgesGeo, lineMat);
            scene.add(edges);
          }

          fitCamera(geometry);

          // stats
          const pos = geometry.getAttribute("position");
          const tris = Math.floor(pos.count / 3);
          geometry.computeBoundingBox();
          const bb = geometry.boundingBox!;
          const size = new THREE.Vector3();
          bb.getSize(size);
          setStats({
            tris,
            bbox: `${size.x.toFixed(0)} × ${size.y.toFixed(0)} × ${size.z.toFixed(0)}`
          });

          setLoading(false);
        },
        undefined,
        (err) => {
          console.error("STL load error:", err);
          setLoading(false);
        }
      );
    };

    let raf = 0;
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    window.addEventListener("resize", onResize);
    onResize();
    animate();
    loadSTL();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      if (mesh) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m?.dispose?.());
        else mesh.material?.dispose?.();
        mesh.geometry?.dispose?.();
        scene.remove(mesh);
      }
      if (edges) {
        edges.geometry?.dispose?.();
        (edges.material as THREE.Material)?.dispose?.();
        scene.remove(edges);
      }

      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [url, height, background, showEdges]);

  return (
    <div>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative"
        }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        {loading ? <small className="muted">Cargando STL…</small> : <small className="muted">Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan</small>}
        {stats && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "#374151",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "4px 8px"
            }}
          >
            triángulos: {stats.tris} · bbox: {stats.bbox}
          </span>
        )}
      </div>
    </div>
  );
}
