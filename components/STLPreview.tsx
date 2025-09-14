"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  url?: string;        // URL firmada del STL (Supabase)
  height?: number;     // Alto del canvas
  background?: string; // Color de fondo
};

export default function STLPreview({
  url,
  height = 460,
  background = "#ffffff",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let disposed = false;
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;
    let animationId: number | null = null;

    async function run() {
      if (!mountRef.current || !url) return;

      setStatus("loading");
      setErrorMsg("");

      // IMPORTS DESDE CDN – IGNORADOS POR WEBPACK EN BUILD
      // (se resuelven en el navegador en tiempo de ejecución)
      const THREE = await import(
        /* webpackIgnore: true */
        "https://unpkg.com/three@0.157.0/build/three.module.js"
      );
      const { OrbitControls } = await import(
        /* webpackIgnore: true */
        "https://unpkg.com/three@0.157.0/examples/jsm/controls/OrbitControls.js"
      );
      const { STLLoader } = await import(
        /* webpackIgnore: true */
        "https://unpkg.com/three@0.157.0/examples/jsm/loaders/STLLoader.js"
      );

      if (disposed) return;

      // Escena
      scene = new THREE.Scene();
      scene.background = new THREE.Color(background);

      // Cámara
      const width = mountRef.current.clientWidth || 800;
      const h = height;
      camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 10000);
      camera.position.set(0, 0, 500);

      // Luces
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      dirLight.position.set(200, 300, 400);
      scene.add(dirLight);

      // Render
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, h);
      mountRef.current.appendChild(renderer.domElement);

      // Controles
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // Loader STL
      const loader = new STLLoader();
      loader.crossOrigin = "anonymous";

      loader.load(
        url,
        (geometry: any) => {
          if (disposed) return;

          const material = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.15,
            roughness: 0.6,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);

          // Ajuste de cámara al tamaño del modelo
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          const bbox = geometry.boundingBox!;
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());

          // Re-centrar en origen para que controles funcionen intuitivamente
          mesh.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
          cameraZ *= 1.8;

          camera.position.set(0, 0, cameraZ);
          camera.near = cameraZ / 100;
          camera.far = cameraZ * 100;
          camera.updateProjectionMatrix();

          controls.target.set(0, 0, 0);
          controls.update();

          setStatus("ready");
          animate();
        },
        undefined,
        (err: any) => {
          if (disposed) return;
          console.error("STL load error:", err);
          setErrorMsg("No se pudo cargar el STL (CORS o red).");
          setStatus("error");
        }
      );

      const onResize = () => {
        if (!renderer || !camera || !mountRef.current) return;
        const w = mountRef.current.clientWidth || 800;
        const h2 = height;
        renderer.setSize(w, h2, false);
        camera.aspect = w / h2;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      function animate() {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }

      // Cleanup
      return () => {
        window.removeEventListener("resize", onResize);
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) {
          renderer.dispose?.();
          renderer.forceContextLoss?.();
          renderer.domElement?.remove?.();
        }
        scene = null;
        camera = null;
        controls = null;
      };
    }

    const cleanupPromise = run();

    return () => {
      disposed = true;
      Promise.resolve(cleanupPromise).catch(() => {});
    };
  }, [url, height, background]);

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      />
      <div style={{ fontSize: 12, color: "#334155", marginTop: 8 }}>
        Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan
      </div>
      {status === "loading" && (
        <div style={{ marginTop: 8, fontSize: 12 }}>Cargando STL…</div>
      )}
      {status === "error" && (
        <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 12 }}>
          {errorMsg || "Error cargando STL."}
        </div>
      )}
      {!url && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          Genera o selecciona un STL para previsualizarlo
        </div>
      )}
    </div>
  );
}
