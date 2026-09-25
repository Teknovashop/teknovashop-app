// components/STLViewerPro.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Props = { url?: string | null; className?: string };
type Unit = "mm" | "cm";
type ToolMode = "orbit" | "measure";
type Point3 = { x: number; y: number; z: number };

function makeDimensionLabel(text: string, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(7,19,33,0.94)";
  ctx.strokeStyle = "rgba(139,233,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e8f7ff";
  ctx.font = "600 34px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale * 4, scale, 1);
  sprite.renderOrder = 50;
  return sprite;
}

function niceStep(raw: number) {
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  if (f <= 1) return p;
  if (f <= 2) return 2 * p;
  if (f <= 5) return 5 * p;
  return 10 * p;
}

function fmt(valueMm: number, unit: Unit) {
  const v = unit === "cm" ? valueMm / 10 : valueMm;
  const a = Math.abs(v);
  if (a >= 100 || Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toFixed(a < 10 ? 1 : 0);
}

function fmtDim(valueMm: number, unit: Unit) {
  return unit === "cm"
    ? `${(valueMm / 10).toFixed(valueMm < 100 ? 1 : 0)} cm`
    : `${valueMm.toFixed(valueMm < 10 ? 1 : 0)} mm`;
}

export default function STLViewerPro({ url, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Refs laxos para evitar choques con @types/three en Vercel
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // Objetos de escena
  const groupRef = useRef<any>(null); // mesh + edges
  const meshRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);
  const groundRef = useRef<any>(null);
  const dirLightRef = useRef<any>(null);
  const dimensionGroupRef = useRef<any>(null);
  const measureGroupRef = useRef<any>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const toolModeRef = useRef<ToolMode>("orbit");
  const measurePointsRef = useRef<Point3[]>([]);

  const [viewerError, setViewerError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bgLight, setBgLight] = useState(false);
  const [tone, setTone] = useState(0.5);
  const [showShadow, setShowShadow] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [unit, setUnit] = useState<Unit>("mm");
  const [ruler, setRuler] = useState({ spanX: 400, spanY: 300, step: 50 });
  const [modelInfo, setModelInfo] = useState<{ x: number; y: number; z: number; triangles: number } | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>("orbit");
  const [showDimensions, setShowDimensions] = useState(true);
  const [measurePoints, setMeasurePoints] = useState<Point3[]>([]);

  function disposeObject(root: any) {
    if (!root) return;
    root.traverse?.((obj: any) => {
      obj.geometry?.dispose?.();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((m: any) => {
        if (m?.map) m.map.dispose?.();
        m?.dispose?.();
      });
    });
    root.removeFromParent?.();
  }

  function clearMeasurement() {
    const scene = sceneRef.current as any;
    if (measureGroupRef.current && scene) {
      scene.remove(measureGroupRef.current);
      disposeObject(measureGroupRef.current);
    }
    measureGroupRef.current = null;
    measurePointsRef.current = [];
    setMeasurePoints([]);
  }

  function drawMeasurement(points: Point3[]) {
    const scene = sceneRef.current as any;
    if (!scene) return;

    if (measureGroupRef.current) {
      scene.remove(measureGroupRef.current);
      disposeObject(measureGroupRef.current);
    }

    const group = new THREE.Group();
    const markerGeometry = new THREE.SphereGeometry(1.8, 18, 18);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      depthTest: false,
    });

    points.forEach((p) => {
      const marker = new THREE.Mesh(markerGeometry.clone(), markerMaterial.clone());
      marker.position.set(p.x, p.y, p.z);
      marker.renderOrder = 60;
      group.add(marker);
    });

    if (points.length === 2) {
      const a = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
      const b = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
      const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
      const material = new THREE.LineBasicMaterial({
        color: 0xf97316,
        depthTest: false,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 59;
      group.add(line);

      const distance = a.distanceTo(b);
      const label = makeDimensionLabel(
        `${distance.toFixed(distance < 10 ? 2 : 1)} mm`,
        Math.max(distance * 0.08, 5)
      );
      if (label) {
        label.position.copy(a.clone().add(b).multiplyScalar(0.5));
        label.position.y += Math.max(distance * 0.05, 3);
        group.add(label);
      }
    }

    scene.add(group);
    measureGroupRef.current = group;
  }

  function addDimensionLine(
    parent: any,
    start: any,
    end: any,
    labelText: string,
    labelScale: number
  ) {
    const color = 0x2563eb;
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 40;
    parent.add(line);

    const tickSize = Math.max(labelScale * 0.45, 2);
    const direction = end.clone().sub(start).normalize();
    let tickAxis = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(tickAxis)) > 0.9) tickAxis = new THREE.Vector3(1, 0, 0);

    [start, end].forEach((p) => {
      const a = p.clone().add(tickAxis.clone().multiplyScalar(-tickSize));
      const b = p.clone().add(tickAxis.clone().multiplyScalar(tickSize));
      const tickGeom = new THREE.BufferGeometry().setFromPoints([a, b]);
      const tick = new THREE.Line(tickGeom, material.clone());
      tick.renderOrder = 40;
      parent.add(tick);
    });

    const label = makeDimensionLabel(labelText, labelScale);
    if (label) {
      label.position.copy(start.clone().add(end).multiplyScalar(0.5));
      label.position.y += labelScale * 0.7;
      parent.add(label);
    }
  }

  function buildDimensionHelpers(
    group: any,
    bb: any,
    objectSize: any
  ) {
    if (dimensionGroupRef.current) {
      group.remove(dimensionGroupRef.current);
      disposeObject(dimensionGroupRef.current);
    }

    const dims = new THREE.Group();
    dims.visible = showDimensions;

    const maxDim = Math.max(objectSize.x, objectSize.y, objectSize.z, 1);
    const offset = Math.max(maxDim * 0.08, 5);
    const labelScale = Math.max(maxDim * 0.07, 5);

    const xY = bb.min.y - offset;
    const xZ = bb.max.z + offset;
    addDimensionLine(
      dims,
      new THREE.Vector3(bb.min.x, xY, xZ),
      new THREE.Vector3(bb.max.x, xY, xZ),
      `X ${objectSize.x.toFixed(objectSize.x < 10 ? 2 : 1)} mm`,
      labelScale
    );

    const yX = bb.min.x - offset;
    const yZ = bb.max.z + offset;
    addDimensionLine(
      dims,
      new THREE.Vector3(yX, bb.min.y, yZ),
      new THREE.Vector3(yX, bb.max.y, yZ),
      `Y ${objectSize.y.toFixed(objectSize.y < 10 ? 2 : 1)} mm`,
      labelScale
    );

    const zX = bb.max.x + offset;
    const zY = bb.min.y - offset;
    addDimensionLine(
      dims,
      new THREE.Vector3(zX, zY, bb.min.z),
      new THREE.Vector3(zX, zY, bb.max.z),
      `Z ${objectSize.z.toFixed(objectSize.z < 10 ? 2 : 1)} mm`,
      labelScale
    );

    group.add(dims);
    dimensionGroupRef.current = dims;
  }

  function updateRuler() {
    const camera = cameraRef.current as any;
    const controls = controlsRef.current as any;
    const mount = mountRef.current;
    if (!camera || !controls || !mount) return;

    const distance = camera.position.distanceTo(controls.target);
    const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * Math.max(distance, 0.001);
    const visibleW = visibleH * Math.max(camera.aspect || 1, 0.001);
    setRuler({
      spanX: visibleW,
      spanY: visibleH,
      step: niceStep(visibleW / 8),
    });
  }

  function setView(mode: "iso" | "front" | "top" | "right") {
    const camera = cameraRef.current as any;
    const controls = controlsRef.current as any;
    const mesh = meshRef.current as any;
    if (!camera || !controls || !mesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const s = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(s.x, s.y, s.z, 1);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.75;

    if (mode === "front") camera.position.set(center.x, center.y, center.z + distance);
    else if (mode === "top") camera.position.set(center.x, center.y + distance, center.z);
    else if (mode === "right") camera.position.set(center.x + distance, center.y, center.z);
    else camera.position.set(center.x + distance, center.y + distance, center.z + distance);

    camera.lookAt(center);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
    updateRuler();
  }

  useEffect(() => {
    toolModeRef.current = toolMode;
    if (controlsRef.current) {
      controlsRef.current.enabled = toolMode === "orbit";
    }
  }, [toolMode]);

  useEffect(() => {
    if (dimensionGroupRef.current) {
      dimensionGroupRef.current.visible = showDimensions;
    }
  }, [showDimensions]);

  // Init escena
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgLight ? 0xf7faff : 0x071321);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(220, 180, 220);
    cameraRef.current = camera;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      sceneRef.current = null;
      cameraRef.current = null;
      setViewerError("Este navegador no puede mostrar la vista 3D. Activa la aceleración gráfica o utiliza otro navegador. El formulario sigue disponible.");
      return;
    }
    (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? "srgb";
    (renderer as any).toneMapping = (THREE as any).ACESFilmicToneMapping ?? 0;
    (renderer as any).toneMappingExposure = 0.8 + tone * 0.7;
    (renderer as any).physicallyCorrectLights = true;
    renderer.shadowMap.enabled = showShadow;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    rendererRef.current = renderer;

    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(env);
    scene.environment = environmentTarget.texture;
    env.dispose();

    const grid = new THREE.GridHelper(600, 60, 0x326cff, 0x18314f);
    (grid.material as any).opacity = 0.48;
    (grid.material as any).transparent = true;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(60));

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x020617, 1.15);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.35);
    dir.position.set(300, 400, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);
    dirLightRef.current = dir;

    // Suelo receptor de sombras
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.ShadowMaterial({ opacity: showShadow ? 0.25 : 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Grupo para mesh + edges
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;
    (controls as any).addEventListener("change", updateRuler);

    mount.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownRef.current = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (toolModeRef.current !== "measure" || !meshRef.current) return;

      const start = pointerDownRef.current;
      pointerDownRef.current = null;
      if (start && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObject(meshRef.current, false);
      if (!hits.length) return;

      const p = hits[0].point;
      const next: Point3[] =
        measurePointsRef.current.length === 1
          ? [measurePointsRef.current[0], { x: p.x, y: p.y, z: p.z }]
          : [{ x: p.x, y: p.y, z: p.z }];

      measurePointsRef.current = next;
      setMeasurePoints(next);
      drawMeasurement(next);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = Math.max(1e-6, clientWidth / Math.max(1, clientHeight));
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      setSize({ w: clientWidth, h: clientHeight });
      window.setTimeout(updateRuler, 0);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    onResize();

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      (controls as any).removeEventListener("change", updateRuler);
      controls.dispose();
      renderer.dispose();
      environmentTarget.dispose();
      pmrem.dispose();
      disposeObject(scene);
      scene.clear();
      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      meshRef.current = null;
      edgesRef.current = null;
      groundRef.current = null;
      dirLightRef.current = null;
      dimensionGroupRef.current = null;
      measureGroupRef.current = null;
      groupRef.current = null;
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tone + Sombras
  useEffect(() => {
    const r = rendererRef.current as any;
    if (!r) return;
    r.toneMappingExposure = 0.8 + tone * 0.7;

    r.shadowMap.enabled = showShadow;
    if (dirLightRef.current) dirLightRef.current.castShadow = showShadow;
    if (groundRef.current) {
      const gm = (groundRef.current.material as any);
      gm.opacity = showShadow ? 0.25 : 0;
      gm.needsUpdate = true;
    }
    groupRef.current?.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = showShadow;
        o.receiveShadow = showShadow;
      }
    });
  }, [tone, showShadow]);

  // Fondo claro/oscuro
  useEffect(() => {
    const scene = sceneRef.current as any;
    if (!scene) return;
    scene.background = new THREE.Color(bgLight ? 0xf7faff : 0x071321);

    const mesh = meshRef.current as any;
    if (mesh?.material) (mesh.material as any).color.setHex(bgLight ? 0xd7e1ee : 0xbccbe0);

    const edges = edgesRef.current as any;
    if (edges?.material) (edges.material as any).color.setHex(bgLight ? 0x1e3a5f : 0x8be9ff);
  }, [bgLight]);

  function fitCameraToObject(obj: any) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.65;

    camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    camera.near = Math.max(0.1, maxDim / 500);
    camera.far = distance * 10;
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
    updateRuler();
  }

  // Cargar STL cuando cambie la URL
  useEffect(() => {
    const scene = sceneRef.current as any;
    const group = groupRef.current as any;
    if (!scene || !group) return;

    // Limpiar grupo anterior
    while (group.children.length) {
      const c = group.children.pop()!;
      (c as any).geometry?.dispose?.();
      const mat: any = (c as any).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
        else mat.dispose?.();
      }
      c.removeFromParent();
    }
    meshRef.current = null;
    edgesRef.current = null;
    dimensionGroupRef.current = null;
    clearMeasurement();
    setModelInfo(null);

    if (!url) return;

    setLoadError(null);
    let cancelled = false;
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        if (cancelled) {
          geometry.dispose();
          return;
        }
        geometry.computeVertexNormals();

        // Malla principal
        const mat = new THREE.MeshStandardMaterial({
          color: bgLight ? 0xd7e1ee : 0xbccbe0,
          metalness: 0.28,
          roughness: 0.54,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = showShadow;
        mesh.receiveShadow = showShadow;
        group.add(mesh);
        meshRef.current = mesh;

        // Contorno para resaltar grabados
        const edgesGeom = new THREE.EdgesGeometry(geometry, 15);
        const edgesMat = new THREE.LineBasicMaterial({ color: bgLight ? 0x1e3a5f : 0x8be9ff });
        const edges = new THREE.LineSegments(edgesGeom, edgesMat);
        group.add(edges);
        edgesRef.current = edges;

        // Centrar grupo
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox!;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
        const triangles = Math.round((geometry.getAttribute("position")?.count ?? 0) / 3);
        setModelInfo({ x: size.x, y: size.y, z: size.z, triangles });
        group.position.set(-center.x, -center.y, -center.z);
        buildDimensionHelpers(group, bb, size);

        // Suelo bajo la pieza
        if (groundRef.current) {
          groundRef.current.position.y = -size.y / 2 - 0.02;
        }

        fitCameraToObject(mesh);
      },
      undefined,
      () => {
        if (!cancelled) {
          setLoadError("No se ha podido cargar la vista 3D. Vuelve a generar la pieza para renovar la vista previa.");
        }
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (viewerError) {
    return (
      <div role="status" className={`flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center ${className || "h-[560px]"}`}>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Vista 3D no disponible</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{viewerError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden rounded-[1.35rem] border border-white/10 shadow-inner ${
        className ?? "h-[560px] bg-[#071321]"
      }`}
    >
      {loadError && (
        <p role="alert" className="absolute left-4 right-4 top-12 z-30 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {loadError}
        </p>
      )}
      {/* Reglas CAD */}
      <div className="pointer-events-none absolute left-10 right-0 top-0 z-10 h-8 border-b border-white/10 bg-[#071321]/88 backdrop-blur">
        <svg width={Math.max(1, size.w - 40)} height={32} className="block">
          {Array.from({ length: 51 }).map((_, i) => {
            const usable = Math.max(1, size.w - 40);
            const x = (i / 50) * usable;
            const major = i % 5 === 0;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={32}
                  x2={x}
                  y2={major ? 17 : 24}
                  stroke={major ? "#8be9ff" : "#334155"}
                  strokeWidth="1"
                />
                {major && (
                  <text x={x + 2} y={11} fontSize="9" fill="#94a3b8">
                    {fmt(((i - 25) / 50) * ruler.spanX, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-10 border-r border-white/10 bg-[#071321]/88 backdrop-blur">
        <svg width={40} height={Math.max(1, size.h)} className="block">
          {Array.from({ length: 51 }).map((_, i) => {
            const y = (i / 50) * Math.max(1, size.h);
            const major = i % 5 === 0;
            return (
              <g key={i}>
                <line
                  x1={40}
                  y1={y}
                  x2={major ? 24 : 32}
                  y2={y}
                  stroke={major ? "#8be9ff" : "#334155"}
                  strokeWidth="1"
                />
                {major && i > 0 && (
                  <text x={2} y={y - 3} fontSize="9" fill="#94a3b8">
                    {fmt(((25 - i) / 50) * ruler.spanY, unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute left-1 top-1 z-20 rounded-md border border-cyan-300/20 bg-[#071321]/95 px-1.5 py-1 text-[10px] font-bold text-cyan-200">
        {unit}
      </div>

      {/* Toolbar premium */}
      <div className="pointer-events-auto absolute right-3 top-11 z-20 max-w-[calc(100%-56px)] rounded-2xl border border-white/10 bg-[#071321]/88 p-2 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {[
              ["iso", "Iso"],
              ["front", "Frontal"],
              ["top", "Superior"],
              ["right", "Derecha"],
            ].map(([value, label], index) => (
              <button
                key={value}
                onClick={() => setView(value as "iso" | "front" | "top" | "right")}
                className={(index ? "border-l border-white/10 " : "") + "px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-white/10"}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const next = toolMode === "measure" ? "orbit" : "measure";
              setToolMode(next);
              if (next === "measure") clearMeasurement();
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              toolMode === "measure"
                ? "border-orange-300/40 bg-orange-400/15 text-orange-200"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
            title="Medir distancia entre dos puntos"
          >
            {toolMode === "measure" ? "Midiendo…" : "Medir"}
          </button>

          {measurePoints.length > 0 && (
            <button
              type="button"
              onClick={clearMeasurement}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10"
            >
              Limpiar
            </button>
          )}

          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-bold text-slate-300">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              className="accent-cyan-300"
            />
            Cotas
          </label>

          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="rounded-lg border border-white/10 bg-[#0d2035] px-2 py-1.5 text-[11px] font-bold text-slate-200"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
          </select>

          <button
            type="button"
            onClick={() => setBgLight((value) => !value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10"
          >
            {bgLight ? "Tema oscuro" : "Tema claro"}
          </button>

          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-bold text-slate-300">
            <input
              type="checkbox"
              checked={showShadow}
              onChange={(e) => setShowShadow(e.target.checked)}
              className="accent-cyan-300"
            />
            Sombras
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-bold text-slate-300">
            Luz
            <input
              className="w-16 accent-cyan-300"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={tone}
              onChange={(e) => setTone(parseFloat(e.currentTarget.value))}
            />
          </label>
        </div>
      </div>

      {!url && (
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center px-8 pt-8">
          <div className="max-w-md text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/5 text-cyan-200 shadow-[0_20px_60px_rgba(37,99,235,.18)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                <path d="m4.4 7.7 7.6 4.2 7.6-4.2M12 12v9" />
              </svg>
            </div>
            <div className="mt-4 text-sm font-black text-white">Tu pieza aparecerá aquí</div>
            <div className="mt-2 text-xs leading-5 text-slate-400">
              Ajusta los parámetros y genera una vista previa protegida para revisar escala, cotas y orientación.
            </div>
          </div>
        </div>
      )}

      {modelInfo && (
        <div className="pointer-events-none absolute bottom-3 left-12 z-20 rounded-xl border border-white/10 bg-[#071321]/88 px-3 py-2.5 shadow-xl backdrop-blur">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
            Dimensiones reales
          </div>
          <div className="mt-1 font-mono text-[11px] font-bold text-slate-100">
            X {fmtDim(modelInfo.x, unit)} · Y {fmtDim(modelInfo.y, unit)} · Z {fmtDim(modelInfo.z, unit)}
          </div>
          <div className="mt-1 text-[9px] text-slate-400">
            {modelInfo.triangles.toLocaleString("es-ES")} triángulos · paso {fmt(ruler.step, unit)} {unit}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 max-w-[52%] rounded-lg border border-white/10 bg-[#071321]/80 px-2.5 py-1.5 text-right text-[9px] font-medium text-slate-300 backdrop-blur">
        {toolMode === "measure"
          ? measurePoints.length === 0
            ? "Selecciona el primer punto"
            : measurePoints.length === 1
              ? "Selecciona el segundo punto"
              : "Medición completada"
          : "Arrastrar · rotar · rueda · zoom · botón derecho · desplazar"}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
        Vista previa 3D · escala real
      </div>
    </div>
  );
}
