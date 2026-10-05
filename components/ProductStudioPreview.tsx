"use client";

import { useEffect, useRef, useState } from "react";

export default function ProductStudioPreview({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setActive(Boolean(entries[0]?.isIntersecting));
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return;

    let cancelled = false;
    let dispose = () => {};
    const controller = new AbortController();

    (async () => {
      try {
        const THREE = await import("three");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");

        const response = await fetch(
          "/api/catalog/mesh/" + encodeURIComponent(slug),
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("mesh unavailable");
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const geometry = new STLLoader().parse(buffer);
        geometry.computeVertexNormals();
        geometry.center();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const canvas = renderer.domElement;
        canvas.className = "absolute inset-0 h-full w-full";
        host.replaceChildren(canvas);

        const material = new THREE.MeshPhysicalMaterial({
          color: 0x111820,
          metalness: 0.82,
          roughness: 0.24,
          clearcoat: 0.28,
          clearcoatRoughness: 0.24,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.rotation.set(-Math.PI / 2 + 0.08, -0.64, 0.03);
        scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxExtent = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.65 / maxExtent;
        mesh.scale.setScalar(scale);
        mesh.updateMatrixWorld(true);

        box.setFromObject(mesh);
        mesh.position.y -= box.min.y + 0.02;

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(12, 12),
          new THREE.ShadowMaterial({ color: 0x071321, opacity: 0.28 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        scene.add(ground);

        scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x071321, 2.2));

        const key = new THREE.DirectionalLight(0xffffff, 4.8);
        key.position.set(-4.5, 6.5, 7.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0005;
        scene.add(key);

        const rim = new THREE.DirectionalLight(0x6ecbff, 3.2);
        rim.position.set(5, 3.5, 3.8);
        scene.add(rim);

        const fill = new THREE.DirectionalLight(0xbcd9ff, 1.4);
        fill.position.set(-1.5, 1.8, -4.5);
        scene.add(fill);

        camera.position.set(3.9, 3.0, 4.9);
        camera.lookAt(0, 0.55, 0);

        const render = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };

        const resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(host);
        render();

        dispose = () => {
          resizeObserver.disconnect();
          geometry.dispose();
          material.dispose();
          ground.geometry.dispose();
          (ground.material as any).dispose?.();
          renderer.dispose();
          canvas.remove();
        };
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      dispose();
    };
  }, [active, slug]);

  return (
    <div
      ref={hostRef}
      className={
        "relative h-full w-full overflow-hidden " +
        "bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,.95),transparent_30%)," +
        "linear-gradient(145deg,#dff2ff_0%,#a8d0ee_56%,#6f96b8_100%)] " +
        className
      }
      aria-label={"Vista 3D de " + slug}
    >
      {!active && (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#dff2ff,#86b1d2)]" />
      )}
      {active && failed && (
        <div className="absolute inset-0 grid place-items-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
          Vista 3D no disponible
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#071321]/18 to-transparent" />
    </div>
  );
}
