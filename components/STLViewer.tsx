// teknovashop-app/components/STLViewer.tsx
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore - el tipo se resuelve en runtime (ok en Next)
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

type Props = {
  url: string;
  height?: number;
};

export default function STLViewer({ url, height = 320 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 560;

    // Escena / cámara / renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(120, 90, 160);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemi.position.set(0, 200, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(150, 120, 100);
    scene.add(dir);

    // Plano/grid (ayuda visual)
    const grid = new THREE.GridHelper(600, 30, 0xdedede, 0xeeeeee);
    scene.add(grid);

    // OrbitControls (mantenemos require dinámico para Next)
    const controls = new (require('three/examples/jsm/controls/OrbitControls').OrbitControls)(
      camera,
      renderer.domElement
    );
    controls.enableDamping = true;

    // Carga del STL
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry: THREE.BufferGeometry) => {
        geometry.computeVertexNormals(); // por si el STL viene sin normales
        const material = new THREE.MeshStandardMaterial({
          metalness: 0.05,
          roughness: 0.8,
          color: 0x222244,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // --- Centrado y encuadre robustos ---
        // 1) Obtener caja en coordenadas de mundo
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // 2) Recentrar el mesh al origen (0,0,0)
        mesh.position.x -= center.x;
        mesh.position.y -= center.y;
        mesh.position.z -= center.z;

        // 3) Recalcular caja ya centrada
        const box2 = new THREE.Box3().setFromObject(mesh);
        const size2 = box2.getSize(new THREE.Vector3());
        const maxDim = Math.max(size2.x, size2.y, size2.z);

        // 4) Colocar cámara a una distancia adecuada según FOV
        const fov = (camera.fov * Math.PI) / 180;
        let cameraDist = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
        cameraDist *= 1.6; // margen

        camera.near = cameraDist / 50;
        camera.far = cameraDist * 50;
        camera.updateProjectionMatrix();

        // Vista isométrica suave
        camera.position.set(cameraDist, cameraDist * 0.6, cameraDist * 0.9);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err: any) => {
        // eslint-disable-next-line no-console
        console.error('STL load error', err);
      }
    );

    // Animación
    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    // Resize responsive
    const handleResize = () => {
      const w = mountRef.current?.clientWidth || width;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    // Limpieza
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();

      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m?.dispose?.());
          } else {
            obj.material?.dispose?.();
          }
        }
      });
    };
  }, [url, height]);

  return <div ref={mountRef} style={{ width: '100%', height }} />;
}
