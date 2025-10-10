"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/**
 * Visor Pro (autónomo) — no añade deps nuevas.
 * - Renderiza en <canvas> con Three.js
 * - OrbitControls y STLLoader via dynamic import
 * - Reacciona a window events:
 *    - "forge:stl-url"  => { detail: { url: string } }
 */

export default function ForgeProPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [bgLight, setBgLight] = useState(true);
  const [shadows, setShadows] = useState(true);

  // Helpers
  const fitView = useCallback(() => {
    const cam = cameraRef.current;
    const obj = meshRef.current;
    if (!cam || !obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (cam.fov * Math.PI) / 180;
    let dist = maxDim / (2 * Math.tan(fov / 2));
    dist *= 1.4; // margen

    const dir = new THREE.Vector3(1, 1, 1).normalize();
    cam.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    cam.near = dist / 50;
    cam.far = dist * 100;
    cam.updateProjectionMatrix();
    cam.lookAt(center);
    controlsRef.current?.target?.copy(center);
    controlsRef.current?.update?.();
  }, []);

  const clearCurrentMesh = useCallback(() => {
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) {
            o.material.forEach((m: any) => m.dispose?.());
          } else {
            o.material?.dispose?.();
          }
        }
      });
      meshRef.current = null;
    }
  }, []);

  // Inicialización básica
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f6f8);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      10_000
    );
    camera.position.set(300, 220, 300);
    cameraRef.current = camera;

    // Luces
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(200, 300, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 2000;
    scene.add(dir);

    // Grid + Ejes
    const grid = new THREE.GridHelper(1000, 40, 0x888888, 0xcccccc);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(80);
    scene.add(axes);
    axesRef.current = axes;

    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      renderer.render(scene, camera);
    };

    // OrbitControls (dynamic import)
    (async () => {
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      controlsRef.current = new OrbitControls(camera, renderer.domElement);
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.08;
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 5;
      controlsRef.current.maxDistance = 5000;
      loop();
    })();

    // Resize
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearCurrentMesh();
      renderer.dispose();
      scene.clear();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [clearCurrentMesh]);

  // Carga del STL cuando cambia la URL
  useEffect(() => {
    if (!stlUrl || !sceneRef.current) return;

    let disposed = false;
    (async () => {
      try {
        const { STLLoader } = await import(
          "three/examples/jsm/loaders/STLLoader.js"
        );
        const loader: any = new STLLoader();
        const geometry: THREE.BufferGeometry = await new Promise((res, rej) => {
          loader.load(
            stlUrl,
            (geom: THREE.BufferGeometry) => res(geom),
            undefined,
            (err: any) => rej(err)
          );
        });
        if (disposed) return;

        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xbfc5cc,
          metalness: 0.15,
          roughness: 0.65,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        clearCurrentMesh();
        sceneRef.current!.add(mesh);
        meshRef.current = mesh;

        // Ajustar vista
        fitView();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Error cargando STL:", e);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [stlUrl, clearCurrentMesh, fitView]);

  // Suscripción a eventos del configurador
  useEffect(() => {
    const onStl = (e: any) => {
      const url = e?.detail?.url;
      if (typeof url === "string") setStlUrl(url);
    };
    window.addEventListener("forge:stl-url", onStl as any);
    return () => window.removeEventListener("forge:stl-url", onStl as any);
  }, []);

  // Toggles de UI
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(bgLight ? 0xf5f6f8 : 0x0e1116);
  }, [bgLight]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.shadowMap.enabled = !!shadows;
  }, [shadows]);

  return (
    <div className="flex h-[100dvh] w-full flex-col">
      {/* Barra de controles simple */}
      <div className="flex items-center gap-3 border-b px-3 py-2 text-sm">
        <strong className="mr-2">Visor Pro</strong>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={bgLight}
            onChange={(e) => setBgLight(e.target.checked)}
          />
          Fondo claro
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={shadows}
            onChange={(e) => setShadows(e.target.checked)}
          />
          Sombras
        </label>
        <button
          className="ml-auto rounded-md border px-3 py-1"
          onClick={() => {
            fitView();
          }}
        >
        Centrar
        </button>
        <button
          className="rounded-md border px-3 py-1"
          onClick={() => {
            clearCurrentMesh();
            setStlUrl(null);
          }}
        >
          Limpiar
        </button>
      </div>

      {/* Lienzo */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="h-full w-full block"
          style={{ display: "block" }}
        />
        {!stlUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
            Genera un STL para visualizarlo aquí.
          </div>
        )}
      </div>
    </div>
  );
}
