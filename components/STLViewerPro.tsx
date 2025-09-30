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

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(1.0);
  const [preset, setPreset] = useState<"studio" | "neutral" | "night">("studio");
  const [clipping, setClipping] = useState(false);
  const [lightBg, setLightBg] = useState(false); // <--- fondo claro

  // guardamos el mesh para poder cambiar material sin recargar
  const currentMeshRef = useRef<THREE.Mesh | null>(null);

  const three = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    camera.position.set(220, 180, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
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

    // Rejilla + ejes
    const grid = new THREE.GridHelper(1000, 40, 0x333333, 0x202020);
    setGridOpacity(grid, 0.35);
    scene.add(grid);

    const axes = new THREE.AxesHelper(80);
    axes.position.set(-120, 0, -120);
    scene.add(axes);

    // Ambiente HDRI
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envStudio = pmrem.fromScene(new RoomEnvironment(), 0.7).texture;
    scene.environment = envStudio;

    // Luces físicas
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.7);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(2.5, 5, 2.5).multiplyScalar(80);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    // Plano receptor
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.001;
    plane.receiveShadow = true;
    scene.add(plane);

    // Clipping
    const planes = [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    ];
    renderer.clippingPlanes = [];

    return {
      scene,
      camera,
      renderer,
      controls,
      group,
      dir,
      hemi,
      envStudio,
      planes,
      pmrem,
      plane,
      grid,
      axes,
    };
  }, []);

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

  // sombras
  useEffect(() => {
    three.renderer.shadowMap.enabled = shadows;
    three.dir.castShadow = shadows;
    three.plane.visible = shadows;
  }, [shadows, three]);

  // exposición
  useEffect(() => {
    three.renderer.toneMappingExposure = tone;
  }, [tone, three]);

  // presets de iluminación
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

  // fondo claro/oscuro + colores rejilla
  useEffect(() => {
    if (lightBg) {
      three.scene.background = new THREE.Color(0xf3f4f6); // gris muy claro
      (three.grid.material as any).color?.set?.(0xbfc4cb);
      (three.grid.material as any).opacity = 0.6;
      (three.axes.material as any).color?.set?.(0x666666);
    } else {
      three.scene.background = new THREE.Color(0x0b0b0b);
      (three.grid.material as any).color?.set?.(0x202020);
      (three.grid.material as any).opacity = 0.35;
      (three.axes.material as any).color?.set?.(0xffffff);
    }
  }, [lightBg, three]);

  // clipping
  useEffect(() => {
    three.renderer.localClippingEnabled = clipping;
    three.renderer.clippingPlanes = clipping ? three.planes : [];
  }, [clipping, three]);

  // Carga STL
  useEffect(() => {
    const { group, scene, camera, controls, renderer } = three;
    group.clear();
    currentMeshRef.current = null;
    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: 0x9bb8ff, // azul suave
          roughness: 0.8,
          metalness: 0.05,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        geometry.computeVertexNormals();
        geometry.center();

        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const radius = size.length() * 0.5 || 1;

        const minY = box.min.y;
        mesh.position.y -= minY;

        group.add(mesh);
        currentMeshRef.current = mesh;

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
  }, [url, three]);

  return (
    <div
      ref={mountRef}
      className={className ?? "h-[70vh] w-full relative rounded-xl overflow-hidden bg-black"}
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
      </div>
    </div>
  );
}

/* util rejilla */
function setGridOpacity(grid: THREE.GridHelper, opacity: number) {
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
