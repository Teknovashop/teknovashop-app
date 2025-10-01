"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Props = {
  url?: string | null;
  className?: string;
};

type MaterialPreset = "pvc-blue" | "pvc-gray" | "pvc-black";

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // HUD
  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(1.0);
  const [preset, setPreset] = useState<"studio" | "neutral" | "night">(
    "studio"
  );
  const [clipping, setClipping] = useState(false);
  const [lightBg, setLightBg] = useState(false);
  const [matPreset, setMatPreset] = useState<MaterialPreset>("pvc-blue");

  // guardamos el mesh para poder cambiar material sin recargar
  const currentMeshRef = useRef<THREE.Object3D | null>(null);

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const group = new THREE.Group();
    scene.add(group);

    // rejilla
    const grid = new THREE.GridHelper(1200, 48, 0x333333, 0x202020);
    setGridOpacity(grid, 0.35);
    scene.add(grid);

    // ejes
    const axes = new THREE.AxesHelper(80);
    axes.position.set(-120, 0, -120);
    scene.add(axes);

    // HDR env
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envStudio = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envStudio;

    // luces
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.7);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(2.5, 5, 2.5).multiplyScalar(80);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    // plano receptor de sombras
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.001;
    plane.receiveShadow = true;
    scene.add(plane);

    // clipping planes
    const planes = [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    ];
    renderer.clippingPlanes = [];

    return { scene, camera, renderer, controls, group, dir, hemi, envStudio, planes, pmrem, plane, grid };
  }, []);

  // montaje y render loop
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

  // toggles
  useEffect(() => {
    three.renderer.shadowMap.enabled = shadows;
    three.dir.castShadow = shadows;
    three.plane.visible = shadows;
  }, [shadows, three]);

  useEffect(() => {
    three.renderer.toneMappingExposure = tone;
  }, [tone, three]);

  useEffect(() => {
    three.renderer.localClippingEnabled = clipping;
    three.renderer.clippingPlanes = clipping ? three.planes : [];
  }, [clipping, three]);

  useEffect(() => {
    if (lightBg) {
      three.scene.background = new THREE.Color(0xf5f6f7);
      setGridColors(three.grid, 0xbbbbbb, 0xdddddd);
      setGridOpacity(three.grid, 0.45);
    } else {
      three.scene.background = new THREE.Color(0x0b0b0b);
      setGridColors(three.grid, 0x333333, 0x202020);
      setGridOpacity(three.grid, 0.35);
    }
  }, [lightBg, three]);

  useEffect(() => {
    switch (preset) {
      case "studio":
        three.hemi.intensity = 0.7;
        three.dir.intensity = 1.4;
        break;
      case "neutral":
        three.hemi.intensity = 0.5;
        three.dir.intensity = 1.0;
        break;
      case "night":
        three.hemi.intensity = 0.25;
        three.dir.intensity = 0.6;
        break;
    }
  }, [preset, three]);

  // carga STL
  useEffect(() => {
    const { group, scene, camera, controls, renderer } = three;
    group.clear();
    currentMeshRef.current = null;
    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        // material por preset
        const mat = makeMaterial(matPreset);

        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;

        geometry.computeVertexNormals();
        geometry.center();

        // bbox para framing
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const radius = size.length() * 0.5 || 1;

        // apoyar en el plano
        const minY = box.min.y;
        mesh.position.y -= minY;

        group.add(mesh);
        currentMeshRef.current = mesh;

        // framing
        const fov = camera.fov * (Math.PI / 180);
        const dist = radius / Math.sin(fov / 2);
        camera.near = Math.max(0.1, dist * 0.01);
        camera.far = dist * 10 + radius * 2;
        camera.updateProjectionMatrix();

        controls.target.set(0, size.y * 0.5, 0);
        camera.position.set(dist, dist * 0.6, dist);
        controls.update();

        renderer.render(scene, camera);
      },
      undefined,
      (err) => {
        console.error("Error cargando STL:", err);
      }
    );
  }, [url, three, matPreset]);

  // si cambia el preset de material, actualizamos sin recargar STL
  useEffect(() => {
    const obj = currentMeshRef.current as unknown as THREE.Mesh | null;
    if (!obj) return;
    const newMat = makeMaterial(matPreset);
    (obj as any).material = newMat;
  }, [matPreset]);

  return (
    <div
      ref={mountRef}
      className={
        className ??
        "h-[70vh] w-full relative rounded-xl overflow-hidden bg-black"
      }
    >
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
          <input
            type="checkbox"
            checked={clipping}
            onChange={(e) => setClipping(e.target.checked)}
          />
        </label>

        <label className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1 flex items-center gap-2">
          <span>Fondo claro</span>
          <input
            type="checkbox"
            checked={lightBg}
            onChange={(e) => setLightBg(e.target.checked)}
          />
        </label>

        <select
          value={matPreset}
          onChange={(e) => setMatPreset(e.target.value as MaterialPreset)}
          className="bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-md px-2 py-1"
        >
          <option value="pvc-blue">PVC (azul)</option>
          <option value="pvc-gray">PVC (gris)</option>
          <option value="pvc-black">PVC (negro)</option>
        </select>
      </div>
    </div>
  );
}

/* util rejilla */
function setGridOpacity(grid: any, opacity: number) {
  const m: any = grid.material;
  if (Array.isArray(m)) {
    m.forEach((mm) => {
      mm.transparent = true;
      mm.opacity = opacity;
    });
  } else if (m) {
    m.transparent = true;
    m.opacity = opacity;
  }
}
function setGridColors(grid: any, c1: number, c2: number) {
  // GridHelper expone 2 materiales en r157
  const m: any = grid.material;
  if (Array.isArray(m) && m.length >= 2) {
    m[0].color = new THREE.Color(c1);
    m[1].color = new THREE.Color(c2);
  }
}

/* materiales simples */
function makeMaterial(preset: MaterialPreset) {
  switch (preset) {
    case "pvc-blue":
      return new THREE.MeshStandardMaterial({
        color: 0x98b4e2,
        roughness: 0.85,
        metalness: 0.05,
      });
    case "pvc-gray":
      return new THREE.MeshStandardMaterial({
        color: 0xbec3c7,
        roughness: 0.85,
        metalness: 0.05,
      });
    case "pvc-black":
      return new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
        metalness: 0.03,
      });
  }
}
