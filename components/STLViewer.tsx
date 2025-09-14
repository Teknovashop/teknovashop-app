'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
// @ts-ignore - se resuelve en runtime
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

type Props = {
  url: string;
  height?: number;
};

export default function STLViewer({ url, height = 360 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 560;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(180, 140, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(200, 300, 200);
    scene.add(dir);

    // Rejilla
    const grid = new THREE.GridHelper(800, 40, 0xcccccc, 0xeeeeee);
    scene.add(grid);

    // Carga STL
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry: THREE.BufferGeometry) => {
        const material = new THREE.MeshStandardMaterial({
          metalness: 0.05,
          roughness: 0.8,
          color: 0x222244,
        });
        const mesh = new THREE.Mesh(geometry, material);

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center); // centrar en (0,0,0)
        scene.add(mesh);

        // encuadre
        const sphere = geometry.boundingSphere!;
        const dist = Math.max(120, sphere.radius * 3.0);
        camera.position.set(dist, dist, dist);
        camera.lookAt(0, 0, 0);
      },
      undefined,
      (err: any) => {
        console.error('STL load error', err);
      }
    );

    // OrbitControls en runtime
    const controls = new (require('three/examples/jsm/controls/OrbitControls').OrbitControls)(
      camera,
      renderer.domElement
    );
    controls.enableDamping = true;

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mountRef.current?.clientWidth || width;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          obj.material?.dispose?.();
        }
      });
    };
  }, [url, height]);

  return <div ref={mountRef} style={{ width: '100%', height }} />;
}
