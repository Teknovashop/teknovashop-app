"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  url?: string;        // URL firmada del STL
  height: number;      // alto del canvas
  background?: string; // color fondo
  modelColor?: string; // color del mesh
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

  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / height, 0.1, 5000);
    camera.position.set(350, 250, 350);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const light = new THREE.HemisphereLight(0xffffff, 0x777777, 1.0);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const grid = new THREE.GridHelper(2000, 40, 0xdddddd, 0xeeeeee);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as any).opacity = 0.6;
    grid.position.y = -0.0001;
    scene.add(grid);

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const renderLoop = () => {
      raf = requestAnimationFrame(renderLoop);
      controlsRef.current?.update();
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) rendererRef.current.dispose();

      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });

      try {
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      } catch {}

      controlsRef.current = null;
      meshRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [height, background]);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !renderer || !camera) return;

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      const mats = Array.isArray(meshRef.current.material)
        ? meshRef.current.material
        : [meshRef.current.material];
      mats.forEach((m: any) => m?.dispose?.());
      meshRef.current = null;
    }

    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geom) => {
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          roughness: 0.6,
          metalness: 0.0,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        const m = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
        geom.applyMatrix4(m);
        mesh.position.set(0, 0, 0);

        scene.add(mesh);
        meshRef.current = mesh;

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitDist = maxDim * 2.0;
        camera.position.set(fitDist, fitDist * 0.7, fitDist);
        camera.near = 0.1;
        camera.far = fitDist * 10;
        camera.updateProjectionMatrix();

        controlsRef.current?.update();
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
