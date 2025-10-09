"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

type Props = { url?: string | null; className?: string };

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Compatibilidad de tipos en Vercel
  const currentMeshRef = useRef<any>(null);
  const lastSizeRef = useRef<any>(null); // { x, y, z } del bounding box centrado

  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(1.0);
  const [preset, setPreset] = useState<"studio" | "neutral" | "night">("studio");
  const [clipping, setClipping] = useState(false);
  const [bgLight, setBgLight] = useState(true);

  // URL interna que puede venir por props o por eventos del configurador
  const [internalUrl, setInternalUrl] = useState<string | null>(url ?? null);
  useEffect(() => setInternalUrl(url ?? null), [url]);

  const three = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    camera.position.set(220, 180, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const group = new THREE.Group();
    scene.add(group);

    // Grid + ejes
    const grid = new THREE.GridHelper(1000, 40, 0x333333, 0x202020);
    const gm: any = (grid as any).material;
    if (Array.isArray(gm)) gm.forEach((m: any) => ((m.transparent = true), (m.opacity = 0.35)));
    else {
      gm.transparent = true;
      gm.opacity = 0.35;
    }
    scene.add(grid);

    const axes = new THREE.AxesHelper(80);
    axes.position.set(-120, 0, -120);
    scene.add(axes);

    // Entorno + luces
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envStudio = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envStudio;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.7);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(2.5, 5, 2.5).multiplyScalar(80);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.001;
    plane.receiveShadow = true;
    scene.add(plane);

    // Clipping opcional
    const planes = [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    ];
    renderer.clippingPlanes = [];

    return { scene, camera, renderer, controls, group, dir, hemi, envStudio, planes, pmrem, plane, grid, axes };
  }, []);

  // Montaje + render loop + resize
  useEffect(() => {
    const mount = mountRef.current!;
    const { renderer, camera, controls } = three;
    mount.appendChild(renderer.domElement);

    const onResize = () => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(three.scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      three.pmrem.dispose();
    };
  }, [three]);

  // Toggles
  useEffect(() => {
    three.renderer.shadowMap.enabled = shadows;
    (three.dir as any).castShadow = shadows;
    three.plane.visible = shadows;
  }, [shadows, three]);

  useEffect(() => {
    three.renderer.toneMappingExposure = tone;
  }, [tone, three]);

  useEffect(() => {
    switch (preset) {
      case "studio":
        three.hemi.intensity = 0.7;
        (three.dir as any).intensity = 1.4;
        three.scene.background = new THREE.Color(bgLight ? 0xf5f5f5 : 0x0b0b0b);
        break;
      case "neutral":
        three.hemi.intensity = 0.5;
        (three.dir as any).intensity = 1.0;
        three.scene.background = new THREE.Color(bgLight ? 0xffffff : 0x111111);
        break;
      case "night":
        three.hemi.intensity = 0.25;
        (three.dir as any).intensity = 0.6;
        three.scene.background = new THREE.Color(bgLight ? 0xdddddd : 0x000000);
        break;
    }
  }, [preset, bgLight, three]);

  useEffect(() => {
    three.renderer.localClippingEnabled = clipping;
    three.renderer.clippingPlanes = clipping ? three.planes : [];
  }, [clipping, three]);

  // ------------ Bus de eventos del configurador -------------
  useEffect(() => {
    const onGenUrl = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      if (detail?.url) setInternalUrl(String(detail.url));
    };
    const onLoadUrl = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      if (detail?.url) setInternalUrl(String(detail.url));
    };
    const onClear = () => {
      setInternalUrl(null);
      const { group } = three;
      group.clear();
      currentMeshRef.current = null;
      lastSizeRef.current = null;
    };

    window.addEventListener("forge:generated-url", onGenUrl as any);
    window.addEventListener("forge:load-url", onLoadUrl as any);
    window.addEventListener("forge:clear", onClear as any);

    return () => {
      window.removeEventListener("forge:generated-url", onGenUrl as any);
      window.removeEventListener("forge:load-url", onLoadUrl as any);
      window.removeEventListener("forge:clear", onClear as any);
    };
  }, [three]);

  // Carga STL (desde internalUrl)
  useEffect(() => {
    const { group, scene, camera, controls, renderer } = three;

    // limpia todo lo previo
    group.clear();
    currentMeshRef.current = null;
    lastSizeRef.current = null;
    if (!internalUrl) return;

    const loader = new STLLoader();
    let aborted = false;

    (async () => {
      try {
        // Bust de caché para evitar ver el STL anterior (CDN/proxy)
        const bust = internalUrl.includes("?") ? `&t=${Date.now()}` : `?t=${Date.now()}`;
        const finalUrl = internalUrl + bust;

        const res = await fetch(finalUrl, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (aborted) return;

        const geometry = loader.parse(buf);
        const material = new THREE.MeshStandardMaterial({
          color: 0x9ea2a7,
          roughness: 0.85,
          metalness: 0.05,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        // Normaliza
        geometry.computeVertexNormals();
        geometry.center();

        geometry.computeBoundingBox();
        const gbox = geometry.boundingBox!;
        const size = new THREE.Vector3();
        gbox.getSize(size);
        lastSizeRef.current = { x: size.x, y: size.y, z: size.z };

        // Apoyar en el suelo
        const minY = gbox.min.y;
        mesh.position.y -= minY;

        group.add(mesh);
        currentMeshRef.current = mesh;

        // Encuadre cámara
        const radius = size.length() * 0.5 || 1;
        const fov = camera.fov * (Math.PI / 180);
        const dist = radius / Math.sin(fov / 2);
        camera.near = Math.max(0.1, dist * 0.01);
        camera.far = dist * 10 + radius * 2;
        camera.updateProjectionMatrix();

        controls.target.set(0, size.y * 0.5, 0);
        camera.position.set(dist, dist * 0.6, dist);
        controls.update();

        renderer.render(scene, camera);
      } catch (e) {
        console.error("Error cargando STL:", e);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [internalUrl, three]);

  // ALT + clic → añade agujero
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (ev: MouseEvent) => {
      if (!ev.altKey) return;
      const mesh = currentMeshRef.current;
      const size = lastSizeRef.current;
      if (!mesh || !size) return;

      const rect = el.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, three.camera);
      const intersects = raycaster.intersectObject(mesh, true);
      if (!intersects.length) return;

      const pWorld = intersects[0].point.clone();
      const pLocal = pWorld.clone();
      mesh.worldToLocal(pLocal);

      const x_mm = pLocal.x + size.x / 2;
      const y_mm = pLocal.y + size.y / 2;
      const x_clamped = Math.max(0, Math.min(x_mm, size.x));
      const y_clamped = Math.max(0, Math.min(y_mm, size.y));

      window.dispatchEvent(
        new CustomEvent("forge:add-hole", {
          detail: { x_mm: x_clamped, y_mm: y_clamped, d_mm: 4 },
        })
      );
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [three]);

  // --- Helper: crea un Blob válido desde la salida del STLExporter ---
  function blobFromExporterOutput(output: unknown): Blob {
    const type = "model/stl";

    // 1) ArrayBuffer
    if (output instanceof ArrayBuffer) {
      return new Blob([output], { type });
    }

    // 2) DataView-like (duck-typing: objeto con .buffer ArrayBuffer)
    if (
      typeof output === "object" &&
      output !== null &&
      "buffer" in (output as any) &&
      (output as any).buffer instanceof ArrayBuffer
    ) {
      return new Blob([(output as any).buffer as ArrayBuffer], { type });
    }

    // 3) string
    if (typeof output === "string") {
      return new Blob([output], { type });
    }

    // 4) último recurso: intentar crear el blob directamente
    try {
      return new Blob([output as any], { type });
    } catch {
      return new Blob([], { type });
    }
  }

  // Exportar a STL lo que se ve
  function downloadCurrentSTL(fileName = "modelo.stl") {
    try {
      const exporter = new STLExporter();
      const object: any = currentMeshRef.current || three.group || three.scene;
      if (!object) throw new Error("No hay malla para exportar");
      const output = exporter.parse(object, { binary: true } as any);
      const blob = blobFromExporterOutput(output);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("No se pudo exportar el STL");
    }
  }

  return (
    <div ref={mountRef} className={className ?? "h-[70vh] w-full relative rounded-xl overflow-hidden bg-black"}>
      {/* HUD */}
      <div className="pointer-events-auto absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 text-xs">
        <button
          onClick={() => setShadows((s) => !s)}
          className="px-2 py-1 rounded-md bg-neutral-800 text-neutral-100 border border-neutral-700"
        >
          Sombras: {shadows ? "ON" : "OFF"}
        </button>

        <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 px-2 py-1 rounded-md">
          <span className="text-neutral-300">Tone</span>
          <input
            type="range"
            min={0.3}
            max={1.8}
            step={0.05}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.target.value))}
          />
        </div>

        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as any)}
          className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1"
        >
          <option value="studio">studio</option>
          <option value="neutral">neutral</option>
          <option value="night">night</option>
        </select>

        <label className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1 flex items-center gap-2">
          <span>Clipping</span>
          <input type="checkbox" checked={clipping} onChange={(e) => setClipping(e.target.checked)} />
        </label>

        <label className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1 flex items-center gap-2">
          <span>Fondo claro</span>
          <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
        </label>

        {/* Descargar STL del viewer */}
        <button
          onClick={() => downloadCurrentSTL()}
          className="px-3 py-1 rounded bg-neutral-900/80 text-white hover:bg-neutral-900 border border-neutral-700"
        >
          Descargar STL
        </button>
      </div>
    </div>
  );
}
