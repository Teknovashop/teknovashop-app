"use client";

import React, { useEffect, useRef } from "react";
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  MeshStandardMaterial,
  Color,
  Vector3,
  Matrix4,
  HemisphereLight,
  GridHelper,
} from "three";
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
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Init una sola vez
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new Scene();
    scene.background = new Color(background);
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(50, container.clientWidth / height, 0.1, 5000);
    camera.position.set(350, 250, 350);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Luces
    const light = new HemisphereLight(0xffffff, 0x777777, 1.0);
    scene.add(light);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    // Rejilla
    const grid = new GridHelper(2000, 40, 0xdddddd, 0xeeeeee);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.6;
    grid.position.y = -0.0001;
    scene.add(grid);

    // Resize
    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    // Loop
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

      controlsRef.current?.dispose();
      rendererRef.current?.dispose();

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

  // Cargar STL al cambiar URL
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!scene || !renderer || !camera) return;

    // Limpia mesh anterior
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
        const mat = new MeshStandardMaterial({
          color: new Color(modelColor),
          roughness: 0.6,
          metalness: 0.0,
        });
        const mesh = new Mesh(geom, mat);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const size = new Vector3();
        bb.getSize(size);
        const center = new Vector3();
        bb.getCenter(center);

        // Centrar la pieza
        const m = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
        geom.applyMatrix4(m);
        mesh.position.set(0, 0, 0);

        scene.add(mesh);
        meshRef.current = mesh;

        // Ajustar cámara
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitDist = maxDim * 2.0;
        camera.position.set(fitDist, fitDist * 0.7, fitDist);
        camera.near = 0.1;
        camera.far = fitDist * 10;
        camera.updateProjectionMatrix();

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
