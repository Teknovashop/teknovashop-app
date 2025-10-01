"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Props = { url?: string | null; className?: string };

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Evitamos tipos de THREE para no romper el build en Vercel
  const currentMeshRef = useRef<any>(null);
  const bboxSizeXRef = useRef<number>(0); // ancho (mm) de la pieza para ALT+clic

  const [shadows, setShadows] = useState(true);
  const [tone, setTone] = useState(1.0);
  const [preset, setPreset] = useState<"studio" | "neutral" | "night">("studio");
  const [clipping, setClipping] = useState(false);
  const [bgLight, setBgLight] = useState(true);

  const three = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    camera.position.set(220, 180, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    (renderer as any).toneMapping = THREE.ACESFilmicToneMapping;
    (renderer as any).toneMappingExposure = 1.0;
    (renderer as any).physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, (window as any).devicePixelRatio || 1));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const group = new THREE.Group();
    scene.add(group);

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

    // Planos de clipping opcionales
    const planes = [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    ];
    renderer.clippingPlanes = [];

    // Plano Y=0 para ALT+clic (picking)
    const pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0

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
      pickPlane,
    };
  }, []);

  // Render loop + resize
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
    const ro = new (window as any).ResizeObserver(onResize);
    ro.observe(mount);

    let raf = 0;
    const loop = () => {
      raf = (window as any).requestAnimationFrame(loop);
      controls.update();
      renderer.render(three.scene, camera);
    };
    loop();

    return () => {
      (window as any).cancelAnimationFrame(raf);
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
    (three.renderer as any).toneMappingExposure = tone;
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
    (three.renderer as any).localClippingEnabled = clipping;
    three.renderer.clippingPlanes = clipping ? three.planes : [];
  }, [clipping, three]);

  // Carga STL
  useEffect(() => {
    const { group, scene, camera, controls, renderer } = three;
    group.clear();
    currentMeshRef.current = null;
    bboxSizeXRef.current = 0;
    if (!url) return;

    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: 0x9ea2a7,
          roughness: 0.85,
          metalness: 0.05,
        });

        const mesh = new THREE.Mesh(geometry, material);
        (mesh as any).castShadow = true;

        geometry.computeVertexNormals();
        geometry.center();

        // reposiciona sobre suelo
        const box3 = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box3.getSize(size);
        const radius = size.length() * 0.5 || 1;

        // Guardamos tamaño X (mm) para ALT+clic -> convertir worldX a [0..L]
        bboxSizeXRef.current = size.x;

        const minY = box3.min.y;
        mesh.position.y -= minY;

        group.add(mesh);
        currentMeshRef.current = mesh;

        const fov = (camera.fov as number) * (Math.PI / 180);
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

  // ALT + clic: proyecta al plano Y=0 y convierte X a mm según el bbox de la pieza
  useEffect(() => {
    const { renderer, camera, pickPlane } = three;
    const el = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitPoint = new THREE.Vector3();

    const onPointerDown = (ev: PointerEvent) => {
      if (!ev.altKey) return; // solo ALT + clic
      if (!currentMeshRef.current) return;

      // NDC
      const rect = el.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ndc.set(x, y);

      raycaster.setFromCamera(ndc, camera);
      const ok = raycaster.ray.intersectPlane(pickPlane, hitPoint);
      if (!ok) return;

      const worldX = hitPoint.x; // porque la pieza está centrada en X
      const L = bboxSizeXRef.current || 0;
      if (L <= 0) return;

      // Convertimos a [0..L] en mm
      const x_mm = Math.max(0, Math.min(L, Math.round(worldX + L / 2)));
      // Avisamos al formulario (publicado por ForgeForm)
      (window as any).__forgeAltClickX?.(x_mm);
    };

    el.addEventListener("pointerdown", onPointerDown);
    return () => el.removeEventListener("pointerdown", onPointerDown);
  }, [three]);

  return (
    <div
      ref={mountRef}
      className={className ?? "h-[70vh] w-full relative rounded-xl overflow-hidden bg-black"}
    >
      {/* HUD */}
      <div className="pointer-events-auto absolute top-3 left-3 z-10 flex items-center gap-3 text-xs">
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
            checked={bgLight}
            onChange={(e) => setBgLight(e.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}
