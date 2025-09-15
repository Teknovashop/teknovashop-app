// /components/STLViewer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string | null;
  height?: number;
  background?: string;
};

export default function STLViewer({
  url,
  height = 420,
  background = "#ffffff",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current!;
    const width = container.clientWidth;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // scene + camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(180, 120, 220);

    // luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(0.6, 1, 0.8);
    scene.add(dir);

    // grid suave
    const grid = new THREE.GridHelper(1000, 40, 0xdddddd, 0xeeeeee);
    (grid.material as THREE.Material).opacity = 0.6;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let mesh: THREE.Mesh | null = null;

    const fitCameraTo = (geom: THREE.BufferGeometry) => {
      geom.computeBoundingBox();
      const bb = geom.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);

      const center = new THREE.Vector3();
      bb.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z || 1);
      const dist = maxDim * 2.2;

      camera.position.set(center.x + dist, center.y + dist, center.z + dist);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    };

    const loader = new STLLoader();

    let disposed = false;
    if (url) {
      loader.load(
        url,
        (geom) => {
          if (disposed) return;
          const material = new THREE.MeshStandardMaterial({
            color: 0x3f444c,
            roughness: 0.6,
            metalness: 0.05,
          });
          mesh = new THREE.Mesh(geom, material);
          mesh.castShadow = false;
          scene.add(mesh);
          fitCameraTo(geom);
        },
        undefined,
        () => {
          // nada; el contenedor ya muestra UI de carga desde el padre
        }
      );
    }

    // animate
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      req = requestAnimationFrame(tick);
    };
    let req = requestAnimationFrame(tick);

    // resize
    const onResize = () => {
      const w = container.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(req);
      renderer.dispose();
      scene.traverse((obj) => {
        const anyObj: any = obj;
        if (anyObj.isMesh) {
          anyObj.geometry?.dispose?.();
          Array.isArray(anyObj.material)
            ? anyObj.material.forEach((m: any) => m?.dispose?.())
            : anyObj.material?.dispose?.();
        }
      });
    };
  }, [url, height, background]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background:
          "radial-gradient(1000px 400px at 50% 0%, #f8fafc, #eff2f6 40%, #e8ecf3 60%, #e5e7eb 100%)",
        overflow: "hidden",
      }}
    />
  );
}
