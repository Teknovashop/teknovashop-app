// components/STLViewerPro.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

type Props = { url?: string | null; className?: string };

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // ⚠️ Sin tipos THREE.* para no romper Vercel
  const currentMeshRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // UI state
  const [bgLight, setBgLight] = useState(true);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);

  // Descargar lo que se ve (export desde el mesh actual)
  const downloadCurrentSTL = () => {
    const mesh = currentMeshRef.current;
    if (!mesh) return;
    const exporter = new STLExporter();
    const parsed = exporter.parse(mesh, { binary: true }) as unknown;

    // ✅ Construir BlobPart seguro (Uint8Array) para evitar el error de ArrayBufferLike / SharedArrayBuffer
    const bytes =
      parsed instanceof ArrayBuffer
        ? new Uint8Array(parsed)
        : new Uint8Array((parsed as DataView).buffer);

    const blob = new Blob([bytes], { type: "model/stl" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forge-output.stl";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Inicializar escena
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgLight ? 0xffffff : 0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(220, 180, 220);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8 + tone * 0.7;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = showShadow;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rendererRef.current = renderer;

    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env).texture;

    const grid = new THREE.GridHelper(600, 60, 0xcccccc, 0xeeeeee);
    (grid.material as any).opacity = 0.6;
    (grid.material as any).transparent = true;
    scene.add(grid);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(300, 400, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    mount.appendChild(renderer.domElement);

    const onResize = () => {
      if (!mount) return;
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    onResize();

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      pmrem.dispose();
      scene.clear();
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      currentMeshRef.current = null;
    };
  }, []); // init 1 vez

  // Cambios UI: fondo, sombras, tone mapping
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgLight ? 0xffffff : 0x000000);
    }
  }, [bgLight]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = showShadow;
      rendererRef.current.toneMappingExposure = 0.8 + tone * 0.7;
    }
  }, [showShadow, tone]);

  // Carga STL
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // limpia malla previa
    const prev = currentMeshRef.current;
    if (prev) {
      scene.remove(prev);
      prev.geometry?.dispose?.();
      prev.material?.dispose?.();
      currentMeshRef.current = null;
    }

    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        geometry.center();
        geometry.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf0f0f0,
          metalness: 0.15,
          roughness: 0.85,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        currentMeshRef.current = mesh;
      },
      undefined,
      () => {
        // fallo de carga: no romper la escena
      }
    );
  }, [url]);

  return (
    <div ref={mountRef} className={`relative w-full rounded-xl ${className ?? "h-[520px] bg-white"}`}>
      {/* Barra de controles dentro del panel (arriba derecha) */}
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
          Fondo claro
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showShadow} onChange={(e) => setShowShadow(e.target.checked)} />
          Sombras
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600">Tone</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.currentTarget.value))}
          />
        </div>
        <button
          onClick={downloadCurrentSTL}
          className="rounded-md bg-[#2663EB] px-2 py-1 text-sm text-white hover:bg-[#1f55c8]"
        >
          Descargar STL
        </button>
      </div>
    </div>
  );
}
