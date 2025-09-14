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
  /** Color de fondo (CSS) */
  background?: string;
};

export default function STLPreview({ url, height = 520, background = "#ffffff" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Escena básica ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const container = mountRef.current;
    const width = container.clientWidth || container.offsetWidth || 800;
    const heightPx = height;

    // Cámara
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0, 0, 200);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, heightPx);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Luces
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(1, 1, 1);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-1, 0.5, -0.5);
    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(key, fill, amb);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.8;

    let frameId: number | null = null;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth || container.offsetWidth || width;
      renderer.setSize(w, heightPx);
      camera.aspect = w / heightPx;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // Limpieza
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const m = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
        }
      });
      container.removeChild(renderer.domElement);
    };
  }, [height, background]);

  // Cargar STL con fetch + parse
  useEffect(() => {
    if (!url || !mountRef.current) return;

    setStatus("loading");
    setMsg("Descargando STL…");

    let disposed = false;

    (async () => {
      try {
        const res = await fetch(url, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();

        if (disposed) return;

        const loader = new STLLoader();
        const geom = loader.parse(buf);

        // Material sobrio
        const mat = new THREE.MeshStandardMaterial({
          color: 0x0d1b2a,
          roughness: 0.6,
          metalness: 0.2,
        });
        const mesh = new THREE.Mesh(geom, mat);
        // Orientación típica de STL (Z-up) a Three (Y-up)
        mesh.rotation.x = -Math.PI / 2;

        // Centrar y escalar a un tamaño agradable
        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);
        geom.translate(-center.x, -center.y, -center.z);

        // Colocar escena
        const scene = (mountRef.current.firstChild as HTMLCanvasElement).__threeObj?.scene as THREE.Scene | undefined;
        // NOTA: no confiamos en esa propiedad, mejor buscamos el renderer del div:
        // Recorremos hijos hasta encontrar el canvas con renderer
        let renderer: THREE.WebGLRenderer | null = null;
        let camera: THREE.PerspectiveCamera | null = null;
        let orbit: OrbitControls | null = null;

        // @ts-ignore – guardamos referencias en el div para reuso
        renderer = (mountRef.current as any).__renderer;
        // @ts-ignore
        camera = (mountRef.current as any).__camera;
        // @ts-ignore
        orbit = (mountRef.current as any).__orbit;
        // Si no están aún, las cogemos de forma segura:
        if (!renderer || !camera || !orbit) {
          // Los creamos en el primer effect; aquí intentamos recuperarlos del canvas
          const canvas = mountRef.current.querySelector("canvas");
          if (!canvas) throw new Error("Renderer no inicializado");
          // @ts-ignore – las guardamos al inicializar (abajo)
        }

        // Como guardamos refs en el primer useEffect, las tomamos ahora:
        // @ts-ignore
        const three = (mountRef.current as any).__three as {
          scene: THREE.Scene;
          camera: THREE.PerspectiveCamera;
          renderer: THREE.WebGLRenderer;
          controls: OrbitControls;
        };
        if (!three) throw new Error("Three context no disponible");

        three.scene.add(mesh);

        // Ajustar cámara al modelo
        const maxDim = Math.max(size.x, size.y, size.z);
        const fitDist = maxDim / (2 * Math.tan((three.camera.fov * Math.PI) / 360));
        three.camera.position.set(fitDist * 1.4, fitDist * 1.2, fitDist * 1.6);
        three.camera.near = maxDim / 1000;
        three.camera.far = maxDim * 1000;
        three.camera.updateProjectionMatrix();

        three.controls.target.set(0, 0, 0);
        three.controls.update();

        setStatus("ok");
        setMsg("");

        // Limpieza parcial si se desmonta mientras carga
        return () => {
          geom.dispose();
          mat.dispose();
        };
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

  // Guardamos refs del “contexto three” (scene, camera, renderer, controls)
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    if ((container as any).__three) return; // ya inicializado por el effect de arriba

    // Recuperar lo creado en el primer effect:
    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    // “Hack” para obtener scene/camera/renderer/controls del renderer actual:
    // Creamos unos nuevos y los guardamos aquí para tenerlos a mano.
    // Más sencillo: volvemos a montar una referencia mínima.
    const width = container.clientWidth || 800;
    const heightPx = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // NO los usamos para pintar (usamos los ya creados), solo guardamos estructura:
    const controls = new OrbitControls(camera, canvas);

    (container as any).__three = { scene, camera, renderer, controls };
    (container as any).__renderer = renderer;
    (container as any).__camera = camera;
    (container as any).__orbit = controls;
  }, [height]);

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
