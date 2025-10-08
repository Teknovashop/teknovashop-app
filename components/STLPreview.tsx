"use client";

import React, { useEffect, useRef, useState } from "react";

// Runtime imports (sin tipos estrictos para evitar incompatibilidades de three en Vercel)
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string;
  height?: number;
  background?: string;
  showEdges?: boolean;
  showGrid?: boolean;
};

type DebugInfo = {
  triangles: number;
  bbox: { x: number; y: number; z: number };
};

export default function STLPreview({
  url,
  height = 520,
  background = "#ffffff",
  showEdges = true,
  showGrid = false,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  // Bootstrap three
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const width = container.clientWidth || 800;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 0, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const k = 1.2;
    const lights = [
      new THREE.DirectionalLight(0xffffff, 0.8),
      new THREE.DirectionalLight(0xffffff, 0.5),
      new THREE.DirectionalLight(0xffffff, 0.4),
    ];
    lights[0].position.set(k, k, k);
    lights[1].position.set(-k, k, k);
    lights[2].position.set(k, -k, k);
    lights.forEach((l) => scene.add(l));

    if (showGrid) {
      const grid = new THREE.GridHelper(400, 20, 0xdddddd, 0xeeeeee);
      scene.add(grid);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w2 = container.clientWidth || width;
      renderer.setSize(w2, height);
      camera.aspect = w2 / height;
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
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });

      try {
        container.removeChild(renderer.domElement);
      } catch {}
    };
  }, [height, background, showGrid]);

  // Carga STL (fetch + parse)
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !url) return;

    let disposed = false;
    setStatus("loading");
    setMsg("Cargando STL…");
    setDebug(null);

    const clearOld = () => {
      if (edgesRef.current) {
        scene.remove(edgesRef.current);
        edgesRef.current.geometry?.dispose?.();
        (edgesRef.current.material as any)?.dispose?.();
        edgesRef.current = null;
      }
      if (meshRef.current) {
        const old: any = meshRef.current;
        scene.remove(old);
        old.geometry?.dispose?.();
        const mats = Array.isArray(old.material) ? old.material : [old.material];
        mats.forEach((m: any) => m?.dispose?.());
        meshRef.current = null;
      }
    };

    const fitCamera = (geom: any) => {
      geom.computeBoundingBox();
      const bb = geom.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);

      // Centrar al origen:
      const center = new THREE.Vector3();
      bb.getCenter(center);
      geom.translate(-center.x, -center.y, -center.z);

      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));

      camera.near = Math.max(maxDim / 1000, 0.01);
      camera.far = Math.max(maxDim * 1000, 1000);
      camera.position.set(dist * 1.35, dist * 1.1, dist * 1.6);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      controls.target.set(0, 0, 0);
      controls.update();

      const triCount = (geom.getAttribute("position")?.count ?? 0) / 3;
      setDebug({
        triangles: Math.round(triCount),
        bbox: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
      });
    };

    const material = new THREE.MeshStandardMaterial({
      color: 0x30343a,
      roughness: 0.6,
      metalness: 0.2,
      flatShading: true,
      side: THREE.DoubleSide, // <-- clave para láminas finas/caras invertidas
    });

    const onGeomReady = (geom: any) => {
      if (disposed) return;
      clearOld();

      // Orientación habitual de STL (Z arriba)
      const mesh = new THREE.Mesh(geom, material);
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;

      if (showEdges) {
        const eg = new THREE.EdgesGeometry(geom, 15); // umbral de ángulo
        const em = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35 });
        const edges = new THREE.LineSegments(eg, em);
        edges.rotation.copy(mesh.rotation);
        scene.add(edges);
        edgesRef.current = edges;
      }

      fitCamera(geom);
      setStatus("ok");
      setMsg("");
    };

    (async () => {
      try {
        const res = await fetch(url, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const loader = new STLLoader();
        const geom = loader.parse(buf);
        onGeomReady(geom);
      } catch (e: any) {
        if (!disposed) {
          setStatus("error");
          setMsg(e?.message ?? "No se pudo cargar el STL");
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [url, showEdges]);

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
      >
        {debug && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "6px 8px",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 12,
              color: "#111827",
            }}
          >
            <div>
              <strong>triángulos:</strong> {debug.triangles}
            </div>
            <div>
              <strong>bbox:</strong> {debug.bbox.x} × {debug.bbox.y} × {debug.bbox.z}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        {status === "loading" && (msg || "Cargando STL…")}
        {status === "error" && `Error: ${msg}`}
        {status === "ok" && "Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan"}
      </div>
    </div>
  );
}
