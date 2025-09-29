"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

type BoxSpec = {
  length: number; // X (mm)
  width: number;  // Y (mm)
  height: number; // Z (mm)
  thickness?: number;
};

type Marker = { x_mm: number; z_mm: number; d_mm: number };

type Props = {
  className?: string;
  box: BoxSpec;
  markers?: Marker[];
  holesEnabled?: boolean;
  holeDiameter?: number; // mm
  snapMM?: number;       // grid snap in mm
  onMarkersChange?: (m: Marker[]) => void;
};

const STLViewerPro: React.FC<Props> = ({
  className,
  box,
  markers = [],
  holesEnabled = true,
  holeDiameter = 5,
  snapMM = 1,
  onMarkersChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [three, setThree] = useState<any>(null); // import dinámico
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const clipPlaneRef = useRef<any>(null);

  const dims = useMemo(() => {
    // Convertimos de mm a metros para Three (escala 1 = 1 mm está bien también;
    // pero nos quedamos en mm para evitar confusiones).
    const L = box.length;
    const W = box.width;
    const H = box.height;
    return { L, W, H };
  }, [box.length, box.width, box.height]);

  // Carga diferida de three + OrbitControls (evita SSR y problemas en Vercel)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const _three = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (!mounted) return;
      setThree({ ..._three, OrbitControls });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Inicializa escena
  useEffect(() => {
    if (!three || !containerRef.current) return;
    const { Scene, PerspectiveCamera, WebGLRenderer, GridHelper, AxesHelper, Group, Plane, PlaneHelper, EdgesGeometry, LineSegments, LineBasicMaterial, Mesh, MeshBasicMaterial, BoxGeometry, Color, Fog, Vector3 } = three;

    const scene = new Scene();
    scene.background = new Color(0xf6f7fb);
    scene.fog = new Fog(0xf6f7fb, 5000, 12000);

    const camera = new PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 50000);
    camera.position.set(dims.L * 0.9, dims.W * -1.2, dims.H * 1.6);

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.localClippingEnabled = true;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Controles
    const controls = new three.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grid y ejes
    const grid = new GridHelper(Math.max(dims.L, dims.W) * 2, 40);
    grid.position.set(0, 0, 0);
    const axes = new AxesHelper(Math.max(dims.L, dims.W) * 0.6);
    axes.position.set(0, 0, 0);
    scene.add(grid);
    scene.add(axes);

    // Grupo principal
    const group = new Group();
    scene.add(group);

    // Caja “alambre” centrada en (0,0,H/2) para que Z=0 sea la base
    const boxGeom = new BoxGeometry(dims.L, dims.W, dims.H);
    const boxMesh = new Mesh(
      boxGeom,
      new MeshBasicMaterial({
        color: 0x9aa0a6,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    boxMesh.position.set(0, 0, dims.H / 2);
    group.add(boxMesh);
    meshRef.current = boxMesh;

    // Edges únicos y limpios
    const edges = new EdgesGeometry(boxGeom);
    const edgesLines = new LineSegments(
      edges,
      new LineBasicMaterial({ color: 0x6b7280 })
    );
    edgesLines.position.copy(boxMesh.position);
    group.add(edgesLines);
    edgesRef.current = edgesLines;

    // Clipping plane horizontal (Z)
    const plane = new Plane(new Vector3(0, 0, -1), 0); // por defecto sin corte
    clipPlaneRef.current = plane;
    renderer.clippingPlanes = [plane];
    const planeHelper = new PlaneHelper(plane, Math.max(dims.L, dims.W), 0x999999);
    planeHelper.visible = false; // helper oculto, solo efecto visual de corte
    scene.add(planeHelper);

    // Marcadores
    const markersGroup = new Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Resize
    const onResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Render loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      try {
        renderer.dispose();
      } catch {}
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [three, dims.L, dims.W, dims.H]);

  // Dibuja marcadores (bolitas)
  useEffect(() => {
    if (!three || !markersGroupRef.current) return;
    const g = markersGroupRef.current as any;
    // limpiar anteriores
    for (let i = g.children.length - 1; i >= 0; i--) g.remove(g.children[i]);

    const { SphereGeometry, MeshBasicMaterial, Mesh } = three;
    const sph = new SphereGeometry( (Math.max(1, (markers[0]?.d_mm ?? 5)) / 2) * 0.6, 16, 16 );

    markers.forEach((m) => {
      const mesh = new Mesh(
        sph,
        new MeshBasicMaterial({ color: 0x3b82f6 })
      );
      // Nota: X=longitud, Y=centrado, Z=altura; nuestra cara superior está en Z=H
      mesh.position.set(m.x_mm - dims.L / 2, 0, m.z_mm);
      g.add(mesh);
    });
  }, [three, markers, dims.L]);

  // Raycast ALT+click para añadir marcador
  useEffect(() => {
    if (!three || !rendererRef.current || !cameraRef.current || !meshRef.current) return;
    const renderer = rendererRef.current as any;
    const camera = cameraRef.current as any;
    const mesh = meshRef.current as any;

    const onClick = (ev: MouseEvent) => {
      if (!holesEnabled || !ev.altKey) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new three.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -(((ev.clientY - rect.top) / rect.height) * 2 - 1)
      );
      const raycaster = new three.Raycaster();
      raycaster.setFromCamera(ndc, camera);

      // Intersecta con el plano Z=H (cara superior)
      const plane = new three.Plane(new three.Vector3(0, 0, -1), - (mesh.position.z + dims.H / 2));
      const hit = new three.Vector3();
      raycaster.ray.intersectPlane(plane, hit);

      if (!hit) return;

      // Convertimos world -> local del mesh caja
      const local = mesh.worldToLocal(hit.clone());

      // local.x ∈ [-L/2, L/2], local.y ∈ [-W/2, W/2], local.z ≈  H/2
      let x = local.x + dims.L / 2;  // a coordenada mm [0..L]
      let z = dims.H;                // cara superior en Z = H

      // snap
      const s = Math.max(0.1, snapMM);
      x = Math.round(x / s) * s;

      // límites dentro de la tapa superior con un margen mínimo
      const margin = Math.max(0.5, (holeDiameter / 2) + 0.5);
      x = Math.max(margin, Math.min(dims.L - margin, x));

      const newMarker: Marker = { x_mm: x, z_mm: z, d_mm: holeDiameter };
      const next = [...markers, newMarker];
      onMarkersChange?.(next);
    };

    renderer.domElement.addEventListener("click", onClick);
    return () => {
      renderer.domElement.removeEventListener("click", onClick);
    };
  }, [three, holesEnabled, holeDiameter, snapMM, markers, onMarkersChange, dims.H, dims.L]);

  // UI local: cámara locks + clipping slider
  const [camLock, setCamLock] = useState<"free" | "x" | "y" | "z">("free");
  const [clip, setClip] = useState<number>(0);

  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current as any;
    const cam = cameraRef.current as any;

    const setLock = (mode: typeof camLock) => {
      if (mode === "free") {
        controls.enableRotate = true;
        return;
      }
      // Bloquea órbita moviendo la cámara a un plano fijo
      const r = Math.max(dims.L, dims.W, dims.H) * 1.8;
      if (mode === "x") cam.position.set(r, 0, dims.H * 0.8);
      if (mode === "y") cam.position.set(0, -r, dims.H * 0.8);
      if (mode === "z") cam.position.set(0, 0, r);
      controls.update();
      controls.enableRotate = mode === "free";
    };
    setLock(camLock);
  }, [camLock, dims.L, dims.W, dims.H]);

  useEffect(() => {
    if (!rendererRef.current || !clipPlaneRef.current) return;
    const plane = clipPlaneRef.current as any;
    // clip: 0..1 → recorta desde Z=0 hasta Z=H
    const d = Math.max(0, Math.min(1, clip)) * dims.H;
    plane.constant = d; // secciona desde la base hacia arriba
  }, [clip, dims.H]);

  return (
    <div className={className ?? ""}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="opacity-70">Alt + clic = agujero</span>
        <div className="ml-4">Cámara:</div>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button className={`px-2 py-1 ${camLock==="free"?"bg-gray-900 text-white":"bg-white"}`} onClick={() => setCamLock("free")}>Libre</button>
          <button className={`px-2 py-1 ${camLock==="x"?"bg-gray-900 text-white":"bg-white"}`} onClick={() => setCamLock("x")}>X</button>
          <button className={`px-2 py-1 ${camLock==="y"?"bg-gray-900 text-white":"bg-white"}`} onClick={() => setCamLock("y")}>Y</button>
          <button className={`px-2 py-1 ${camLock==="z"?"bg-gray-900 text-white":"bg-white"}`} onClick={() => setCamLock("z")}>Z</button>
        </div>
        <button className="px-2 py-1 rounded-md border border-gray-300" onClick={() => setCamLock("free")}>Reset</button>
        <label className="ml-4 flex items-center gap-2">
          <input type="checkbox" checked={clip>0} onChange={(e)=>setClip(e.target.checked?0.5:0)} />
          <span>Clipping</span>
        </label>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "520px", borderRadius: 12, overflow: "hidden", background: "#fff" }} />
    </div>
  );
};

export default STLViewerPro;
