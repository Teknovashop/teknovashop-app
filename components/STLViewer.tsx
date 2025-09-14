"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  url?: string;
  height?: number;
  background?: string; // e.g. "#ffffff"
};

export default function STLViewer({ url, height = 480, background = "#ffffff" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [debug, setDebug] = useState<{ tris: number; bbox: string } | null>(null);

  useEffect(() => {
    const container = mountRef.current!;
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);

    // Escena (SOLO una)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    // Cámara
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / height,
      0.1,
      2000
    );
    camera.position.set(0, 0, 300);
    scene.add(camera);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(0.5, 1, 1);
    scene.add(dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grupo donde metemos el STL
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let animHandle: number;
    const animate = () => {
      animHandle = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Limpieza
    return () => {
      cancelAnimationFrame(animHandle);
      window.removeEventListener("resize", onResize);
      scene.remove(modelGroup);
      modelGroup.traverse((o) => {
        const anyO: any = o;
        if (anyO.isMesh) {
          anyO.geometry?.dispose?.();
          if (Array.isArray(anyO.material)) {
            anyO.material.forEach((m: any) => m?.dispose?.());
          } else {
            anyO.material?.dispose?.();
          }
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, background]);

  // Cargar STL cuando cambie la URL
  useEffect(() => {
    if (!url || !mountRef.current) return;

    // Buscamos la escena y el group creados en el primer effect
    // (están colgando del mismo contenedor)
    const container = mountRef.current;
    const renderer = (container.firstChild as HTMLCanvasElement)?._threeRenderer as THREE.WebGLRenderer | undefined;

    // Creamos un loader para el STL
    const loader = new STLLoader();
    // CORS safe; si no lo soporta, igualmente funciona porque Vercel permite fetch cross-origin de Supabase con la URL firmada
    (loader as any).crossOrigin = "anonymous";

    // Recuperar referencias a escena y objetos
    // Truco: guardamos referencias en dataset del contenedor
    // Para evitar eso, sencillamente vuelvo a crear el Scene/Group aquí y sustituyo el contenido anterior:
    // → más robusto y simple.
    // Nota: reutilizamos el canvas existente (renderer ya creado en el primer effect),
    //       solo reemplazamos el contenido del modelo.
    // Para lograrlo, busco el último Group añadido al scene en el primer effect usando una marca.
    // Alternativa simple: disparamos un evento custom en mountRef (omitido por brevedad).
    // Implementación práctica: mantenemos un “model-root” por id.
    // Como no compartimos la instancia de scene aquí, rehacemos la carga en el primer effect:
    // —> más simple: volvemos a pintar dentro de ese effect. Pero ya está inicializado arriba,
    // así que hacemos un pequeño “bridge”:

    // Mini bridge: guardo el group en una variable global en el contenedor
    const anyContainer = container as any;
    if (!anyContainer._modelGroup) {
      // Si por cualquier motivo no existe, no hacemos nada (el primer effect aún no montó)
      return;
    }

  }, [url]);

  // *** Bridge sencillo ***
  // Al montar, guardamos referencias globales (SEGURAS para este componente)
  useEffect(() => {
    const container = mountRef.current!;
    const canvas = container.querySelector("canvas");
    // @ts-ignore – guardamos renderer y un group raíz para el modelo
    if (canvas) {
      // Next/Three no expone renderer en canvas, así que lo guardo manualmente la primera vez:
      // En el effect de arriba fue donde lo creamos; aquí sólo nos aseguramos de tener un “modelGroup”
    }
  }, []);

  // Cargador de STL y centrado dentro del mismo effect inicial
  useEffect(() => {
    if (!url || !mountRef.current) return;

    // Reobtengo todo del primer effect:
    const container = mountRef.current!;
    const rendererCanvas = container.querySelector("canvas");
    if (!rendererCanvas) return;

    // Recuperamos THREE desde el DOM no es trivial; rehacemos un pequeño “hook”:
    // Mejor opción: encapsular toda la carga del STL en el primer effect. Hacemos eso:
    let disposed = false;

    const load = async () => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(background);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
      renderer.setSize(container.clientWidth, height);

      // Reemplazo el canvas anterior por el nuevo para simplificar
      if (rendererCanvas.parentElement) {
        rendererCanvas.parentElement.removeChild(rendererCanvas);
      }
      container.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / height,
        0.1,
        2000
      );
      camera.position.set(0, 0, 300);
      scene.add(camera);

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0.5, 1, 1);
      scene.add(dir);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const group = new THREE.Group();
      scene.add(group);

      const loader = new STLLoader();
      (loader as any).crossOrigin = "anonymous";

      loader.load(
        url,
        (geometry) => {
          if (disposed) return;

          const material = new THREE.MeshStandardMaterial({
            color: 0x2f3337,
            roughness: 0.7,
            metalness: 0.1,
          });
          const mesh = new THREE.Mesh(geometry, material);
          geometry.computeBoundingBox();

          // Centrar y escalar a vista
          const bb = geometry.boundingBox!;
          const size = new THREE.Vector3();
          bb.getSize(size);
          const center = new THREE.Vector3();
          bb.getCenter(center);
          mesh.position.sub(center);
          group.add(mesh);

          // Ajuste de cámara
          const maxDim = Math.max(size.x, size.y, size.z || 1);
          const dist = maxDim * 1.8;
          camera.position.set(dist, dist, dist);
          camera.lookAt(0, 0, 0);
          controls.update();

          setDebug({
            tris: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
            bbox: `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(size.z || 0)}`,
          });

          const render = () => {
            if (disposed) return;
            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(render);
          };
          render();
        },
        undefined,
        (err) => {
          console.warn("Error cargando STL:", err);
          setDebug(null);
        }
      );
    };

    load();

    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, height, background]);

  return (
    <div>
      {debug && (
        <div
          style={{
            position: "absolute",
            marginTop: 8,
            marginLeft: 8,
            padding: "6px 8px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 12,
            color: "#111827",
            zIndex: 1,
          }}
        >
          <div><strong>triángulos:</strong> {debug.tris.toLocaleString("es-ES")}</div>
          <div><strong>bbox:</strong> {debug.bbox}</div>
        </div>
      )}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          position: "relative",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          background, // evita checkerboard
        }}
      />
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar para pan
      </div>
    </div>
  );
}
