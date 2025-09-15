"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string | null;
  height?: number;
  background?: string;
  /** Color del modelo (hex o css). Si no viene, por defecto #44484c */
  modelColor?: string;
};

export default function STLViewer({
  url,
  height = 520,
  background = "#ffffff",
  modelColor = "#44484c",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Usamos `any` para evitar depender de tipos de `three` en el build
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);

  // Init (una sola vez)
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
    camera.position.set(0, 120, 260);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min((window as any).devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Luces y grid
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(60, 120, 80);
    scene.add(dir);

    const grid = new THREE.GridHelper(1200, 60, 0xcccccc, 0xeeeeee);
    const gridMat = (grid as any).material as any;
    if (gridMat) {
      gridMat.transparent = true;
      gridMat.opacity = 0.65;
    }
    scene.add(grid);

    const animate = () => {
      const r = rendererRef.current;
      const sc = sceneRef.current;
      const cam = cameraRef.current;
      const ctr = controlsRef.current;
      if (!r || !sc || !cam) return;
      ctr?.update?.();
      r.render(sc, cam);
      requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const r = rendererRef.current;
      const cam = cameraRef.current;
      if (!r || !cam) return;
      const w = container.clientWidth;
      cam.aspect = w / height;
      cam.updateProjectionMatrix?.();
      r.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose?.();
      rendererRef.current?.dispose?.();

      scene.traverse?.((obj: any) => {
        if (obj?.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });

      try {
        container.removeChild(renderer.domElement);
      } catch {}
      controlsRef.current = null;
      meshRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, background]);

  // Carga/recarga del STL cuando cambia la URL o el color
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Limpia mesh anterior si existe
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry?.dispose?.();
      const mats = Array.isArray(meshRef.current.material)
        ? meshRef.current.material
        : [meshRef.current.material];
      mats.forEach((m: any) => m?.dispose?.());
      meshRef.current = null;
    }

    if (!url) return;

    setLoading(true);
    const loader = new STLLoader();
    // En algunas versiones no existe .manager; comprobamos defensivamente
    const anyLoader = loader as any;
    if (anyLoader.manager?.setCrossOrigin) {
      anyLoader.manager.setCrossOrigin("anonymous");
    }

    loader.load(
      url,
      (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          roughness: 0.45,
          metalness: 0.05,
        });

        const mesh = new THREE.Mesh(geometry, material);
        geometry.computeVertexNormals?.();
        geometry.computeBoundingBox?.();

        // Centrar el modelo en origen
        const bb = geometry.boundingBox;
        if (bb) {
          const size = new THREE.Vector3();
          bb.getSize(size);
          const center = new THREE.Vector3();
          bb.getCenter(center);
          mesh.position.sub(center);

          // Escala si es demasiado grande
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 600) {
            const s = 600 / maxDim;
            mesh.scale.setScalar(s);
          }
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);
        meshRef.current = mesh;

        fitCameraToObject();
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("Error cargando STL:", err);
        setLoading(false);
      }
    );

    function fitCameraToObject() {
      const cam = cameraRef.current;
      const obj = meshRef.current;
      if (!cam || !obj) return;

      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = ((cam.fov ?? 50) * Math.PI) / 180;
      let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
      cameraZ *= 1.6;

      cam.position.set(center.x + cameraZ, center.y + cameraZ * 0.35, center.z + cameraZ);
      cam.lookAt(center);
      cam.updateProjectionMatrix?.();

      controlsRef.current?.target?.copy?.(center);
      controlsRef.current?.update?.();
    }
  }, [url, modelColor]);

  return (
    <div>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          background,
        }}
      />
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        {loading ? "Cargando STL..." : "Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan"}
      </div>
    </div>
  );
}
