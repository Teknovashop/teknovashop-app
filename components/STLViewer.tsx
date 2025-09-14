// /components/STLViewer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
// Dependencias en runtime (están en package.json): three
import * as THREE from "three";
// @ts-ignore - los tipos de los helpers JSM no vienen en three
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// @ts-ignore
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  /** URL firmada al .stl */
  url?: string | null; // <- acepta null para evitar error TS en Vercel
  /** Alto del canvas en px */
  height?: number;
  /** Color de fondo (hex o css) */
  background?: string;
};

export default function STLViewer({ url, height = 480, background = "#fff" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [info, setInfo] = useState<{ tris: number; bbox: string } | null>(null);

  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / height,
      0.1,
      4000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);

    // Luz suave
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 1, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Grupo para el mesh
    const root = new THREE.Group();
    scene.add(root);

    // Animación
    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    // Limpieza
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      // Liberar geometrías/materiales
      root.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
            (m: any) => m?.dispose?.()
          );
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, background]);

  // Carga del STL cuando cambia la URL
  useEffect(() => {
    const container = mountRef.current!;
    if (!container) return;
    // @ts-ignore
    const currentScene: THREE.Scene = (container as any).__sceneRef ?? null;

    // Buscar el grupo root en la escena actual
    // (lo guardamos en el primer effect)
    // Como no tenemos referencia directa, lo resolvemos por children[1] (root)
    // que agregamos tras la luz. Más robusto: almacenar la ref en el div.
    // Para evitar complicaciones, usamos un query simple:
    const scene = (container as any).__three_scene as THREE.Scene;
    const getScene = () => {
      if (scene) return scene;
      // buscamos recorriendo padres (dom no guarda referencia); así que
      // como creamos todo en el primer effect, guardemos una ref ahora:
      return null;
    };

    // Recuperar referencias que guardamos en el primer effect:
    // Guardamos los objetos en propiedades del contenedor para poder reutilizarlos aquí.
    // Si aún no existen (primer render), las creamos:
    if (!(container as any).__bootstrapped) {
      // Re-crear un pequeño registro desde el árbol actual:
      // @ts-ignore
      const rendererDom = container.querySelector("canvas");
      // No necesitamos nada más aquí.
      (container as any).__bootstrapped = true;
    }

    // Limpiar meshes previos del root
    const clearRoot = () => {
      // @ts-ignore
      const canvas = container.querySelector("canvas");
      if (!canvas) return;

      // No hacemos nada aquí: el root lo limpiaremos cuando volvamos a montar.
    };

    clearRoot();

    // Si no hay URL, sólo vaciamos la UI de info y salimos
    if (!url) {
      setInfo(null);
      return;
    }

    // Para acceder a la escena/cámara/renderer que creamos antes, los guardamos
    // en propiedades del contenedor en el primer effect.
    // Para simplificar, volvemos a localizarlos recorriendo tres:
    // (más fácil: volver a crear loader y añadir al scene que ya existe)
    const loader = new STLLoader();
    loader.crossOrigin = "anonymous";

    // Encontrar referencias a scene, camera y root del primer effect
    // Las guardamos cuando se ejecuta el primer effect:
    // @ts-ignore
    let sceneRef: THREE.Scene = (container as any).__sceneRef;
    // @ts-ignore
    let cameraRef: THREE.PerspectiveCamera = (container as any).__cameraRef;
    // @ts-ignore
    let rendererRef: THREE.WebGLRenderer = (container as any).__rendererRef;
    // @ts-ignore
    let rootRef: THREE.Group = (container as any).__rootRef;

    // Si aún no están guardadas, buscamos en runtime y las guardamos:
    if (!sceneRef || !cameraRef || !rendererRef || !rootRef) {
      // reconstruimos referencias tomando las que se crearon:
      // truco: las guardamos al vuelo al acceder al renderer/scene desde THREE
      // Como no hay API directa, rehacemos un pequeño hack:
      // Recreamos el grab de referencias del primer effect:
      // Pero es más sencillo: en el primer effect, guardamos las refs en el contenedor:
    }

    // En caso de que no estén, obtenemos desde la instancia activa:
    // Esto depende de que en el primer effect hayamos guardado esas refs:
    // Vamos a guardarlas ahora mismo en el primer effect real de arriba:
    // —> Ajuste: guardamos desde el primer effect.
    // Para que este effect funcione, añadimos ese guardado:

    return;
  }, [url]);

  /** Guardar refs de escena/cámara/renderer/root al montarse */
  useEffect(() => {
    const container = mountRef.current!;
    // Si ya hay un canvas, recuperamos objetos del primer effect
    // Para hacerlo correctamente, vamos a reconstruir esta lógica:
    // Creamos aquí la escena/cámara/renderer y los guardamos para el siguiente effect de carga:

    // Evitar duplicados: si ya existe, no volvemos a crear
    if ((container as any).__sceneRef) return;

    const scene = new THREE.Scene();
    (container as any).__sceneRef = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / (container.clientHeight || 1),
      0.1,
      4000
    );
    (container as any).__cameraRef = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    const h = container.clientHeight || 480;
    renderer.setSize(container.clientWidth, h);
    (container as any).__rendererRef = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    (container as any).__controlsRef = controls;
    controls.enableDamping = true;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 1, 0);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 2);
    scene.add(hemi, dir);

    const root = new THREE.Group();
    scene.add(root);
    (container as any).__rootRef = root;

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();
    (container as any).__raf = raf;

    const onResize = () => {
      const hh = container.clientHeight || 480;
      camera.aspect = container.clientWidth / hh;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, hh);
    };
    window.addEventListener("resize", onResize);
    (container as any).__onResize = onResize;

    return () => {
      cancelAnimationFrame((container as any).__raf || 0);
      window.removeEventListener("resize", (container as any).__onResize);
      controls.dispose();
      root.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
            (m: any) => m?.dispose?.()
          );
        }
      });
      renderer.dispose();
      try {
        container.removeChild(renderer.domElement);
      } catch {}
      (container as any).__sceneRef = null;
      (container as any).__cameraRef = null;
      (container as any).__rendererRef = null;
      (container as any).__controlsRef = null;
      (container as any).__rootRef = null;
    };
  }, []);

  // **Carga real del STL y ajuste de cámara**
  useEffect(() => {
    const container = mountRef.current!;
    // Refs del primer effect
    // @ts-ignore
    const scene: THREE.Scene = (container as any).__sceneRef;
    // @ts-ignore
    const camera: THREE.PerspectiveCamera = (container as any).__cameraRef;
    // @ts-ignore
    const renderer: THREE.WebGLRenderer = (container as any).__rendererRef;
    // @ts-ignore
    const root: THREE.Group = (container as any).__rootRef;

    if (!scene || !camera || !renderer || !root) return;

    // Limpiar anterior
    while (root.children.length) {
      const c = root.children.pop() as any;
      if (c?.geometry?.dispose) c.geometry.dispose();
      const mats = Array.isArray(c?.material) ? c.material : [c?.material];
      mats.forEach((m: any) => m?.dispose?.());
    }

    if (!url) return;

    const loader = new STLLoader();
    loader.crossOrigin = "anonymous";

    loader.load(
      url,
      (geom: any) => {
        // Normalizar a BufferGeometry
        const geometry =
          geom && geom.isBufferGeometry
            ? geom
            : new THREE.BufferGeometry().fromGeometry(geom);

        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: 0x2b2f36,
          metalness: 0.05,
          roughness: 0.9,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        root.add(mesh);

        // Fit cámara
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const center = new THREE.Vector3();
        bb.getCenter(center);

        // Centrar en origen
        mesh.position.sub(center);

        // Distancia adecuada según tamaño
        const maxDim = Math.max(size.x, size.y, size.z || 1);
        const fov = (camera.fov * Math.PI) / 180;
        const dist = maxDim / (2 * Math.tan(fov / 2)) + maxDim * 0.5;

        camera.position.set(dist, dist, dist);
        camera.near = dist / 100;
        camera.far = dist * 100;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        camera.updateProjectionMatrix();

        setInfo({
          tris: (geometry.index?.count ?? geometry.attributes.position.count) / 3,
          bbox: `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(
            size.z || 0
          )}`,
        });
      },
      undefined,
      () => {
        setInfo(null);
      }
    );
  }, [url]);

  return (
    <div>
      {info && (
        <div
          style={{
            position: "absolute",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            marginTop: 8,
            marginLeft: 8,
          }}
        >
          <div>triángulos: {info.tris}</div>
          <div>bbox: {info.bbox}</div>
        </div>
      )}

      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          background,
          borderRadius: 8,
          overflow: "hidden",
        }}
      />

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
        Arrastra para rotar · Rueda para zoom · Shift+arrastrar para pan
      </p>
    </div>
  );
}
