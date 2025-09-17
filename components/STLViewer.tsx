// teknovashop-app/components/STLViewer.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Mode = "auto" | "preview" | "stl";
type Quality = "high" | "low";

type Preview =
  | {
      kind: "cable_tray";
      params: {
        width_mm: number;
        height_mm: number;
        length_mm: number;
        thickness_mm: number;
        ventilated: boolean;
      };
    }
  | {
      kind: "vesa_adapter";
      params: { vesa_mm: number; thickness_mm: number; clearance_mm: number };
    }
  | {
      kind: "router_mount";
      params: { router_width_mm: number; router_depth_mm: number; thickness_mm: number };
    };

type Marker = { x: number; z: number; d: number };

type Props = {
  url?: string;
  preview?: Preview;
  mode?: Mode;
  height: number;
  background?: string;
  modelColor?: string;
  quality?: Quality;
  watermark?: string;
  rulers?: boolean;
  showAxes?: boolean;
  markers?: Marker[];
  editing?: { enabled: boolean; onPick?: (p: { x: number; z: number }) => void };
};

export default function STLViewer({
  url,
  preview,
  mode = "auto",
  height,
  background = "#ffffff",
  modelColor = "#3f444c",
  quality = "high",
  watermark,
  rulers = true,
  showAxes = true,
  markers = [],
  editing = { enabled: false },
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  // `any` para evitar problemas de tipos en Vercel
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const objectRef = useRef<any>(null);
  const gridRef = useRef<any>(null);
  const groundRef = useRef<any>(null);
  const axesRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const [wireframe, setWireframe] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    background === "#111827" ? "dark" : "light"
  );

  const [dims, setDims] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  /** -------------- Utils -------------- */
  const traverseMaterials = (obj: any, fn: (m: any) => void) => {
    obj.traverse((o: any) => {
      if (o.isMesh) {
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((m) => m && fn(m));
      }
    });
  };

  const fitCamera = useCallback((obj: any) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    setDims({ x: size.x, y: size.y, z: size.z });

    obj.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.2;

    camera.position.set(dist, dist * 0.7, dist);
    camera.near = 0.1;
    camera.far = dist * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();

    const ground = groundRef.current;
    if (ground) ground.scale.setScalar(Math.max(1200, maxDim * 4));
  }, []);

  const addObject = useCallback(
    (obj: any) => {
      const scene = sceneRef.current!;
      if (objectRef.current) {
        scene.remove(objectRef.current);
        objectRef.current.traverse((o: any) => {
          if (o.isMesh) {
            o.geometry?.dispose?.();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m: any) => m?.dispose?.());
          }
        });
      }
      obj.traverse((o: any) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      scene.add(obj);
      objectRef.current = obj;
      fitCamera(obj);
    },
    [fitCamera]
  );

  const setWire = useCallback(
    (on: boolean) => {
      setWireframe(on);
      if (!objectRef.current) return;
      traverseMaterials(objectRef.current, (m) => {
        (m as any).wireframe = on;
        m.needsUpdate = true;
      });
    },
    []
  );

  const presetView = useCallback((kind: "iso" | "top" | "front" | "right") => {
    const camera = cameraRef.current!;
    const controls = controlsRef.current!;
    const size = dims;
    const maxDim = Math.max(size.x, size.y, size.z) || 200;
    const d = maxDim * 2.0;

    if (kind === "iso") camera.position.set(d, d * 0.7, d);
    if (kind === "top") camera.position.set(0, d, 0);
    if (kind === "front") camera.position.set(0, d * 0.3, d);
    if (kind === "right") camera.position.set(d, d * 0.3, 0);

    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }, [dims]);

  const resetView = useCallback(() => {
    controlsRef.current?.reset();
    presetView("iso");
  }, [presetView]);

  /** -------------- Init -------------- */
  useEffect(() => {
    const container = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "dark" ? "#111827" : background);
    scene.fog = new THREE.Fog(scene.background.getHex(), 1200, 4000);
    sceneRef.current = scene;

    const aspect = container.clientWidth / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(420, 320, 420);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = quality === "high";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(quality === "high" ? Math.min(window.devicePixelRatio ?? 1, 2) : 1);
    renderer.setSize(container.clientWidth, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3af, 0.8);
    const dir = new THREE.DirectionalLight(0xffffff, quality === "high" ? 0.9 : 0.6);
    dir.position.set(600, 900, 600);
    dir.castShadow = quality === "high";
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 5000;
    dir.shadow.camera.left = -1500;
    dir.shadow.camera.right = 1500;
    dir.shadow.camera.top = 1500;
    dir.shadow.camera.bottom = -1500;
    scene.add(hemi, dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controlsRef.current = controls;

    const grid = new THREE.GridHelper(3000, 60, 0xe5e7eb, 0xeff2f6);
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = theme === "dark" ? 0.3 : 0.9;
    grid.position.y = -0.01;
    grid.visible = gridVisible;
    scene.add(grid);
    gridRef.current = grid;

    const shadowMat = new THREE.ShadowMaterial();
    shadowMat.opacity = theme === "dark" ? 0.25 : 0.35;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), shadowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = quality === "high";
    scene.add(ground);
    groundRef.current = ground;

    if (showAxes) {
      const axes = new THREE.AxesHelper(120);
      axes.position.set(-450, 0, -450);
      axesRef.current = axes;
      scene.add(axes);
    }

    // Grupo para marcadores de agujero
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current || !mountRef.current) return;
      const w = mountRef.current.clientWidth;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    loop();

    presetView("iso");

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controlsRef.current?.dispose();
      rendererRef.current?.dispose();
      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => m?.dispose?.());
        }
      });
      const el = renderer.domElement;
      el?.parentNode?.removeChild(el);

      controlsRef.current = null;
      objectRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, [height, background, theme, quality, gridVisible, showAxes, presetView]);

  /** -------------- PREVIEW -------------- */
  useEffect(() => {
    const showPreview = mode === "preview" || (mode === "auto" && !url);
    if (!showPreview || !preview || !sceneRef.current) return;

    const col = new THREE.Color(modelColor);
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.05, roughness: 0.6 });

    if (preview.kind === "cable_tray") {
      const { width_mm: W, height_mm: H, length_mm: L, thickness_mm: T, ventilated } = preview.params;

      const base = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), mat);
      base.position.set(0, -H / 2 + T / 2, 0);
      const side1 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side1.position.set(0, 0, -W / 2 + T / 2);
      const side2 = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), mat);
      side2.position.set(0, 0, W / 2 - T / 2);
      group.add(base, side1, side2);

      if (ventilated) {
        const n = Math.max(3, Math.floor(L / 40));
        const gap = L / (n + 1);
        const ribW = Math.max(2, Math.min(6, W * 0.08));
        for (let i = 1; i <= n; i++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(ribW, T * 1.05, W - 2 * T), mat);
          rib.position.set(-L / 2 + i * gap, -H / 2 + T / 2 + 0.01, 0);
          group.add(rib);
        }
      }
    }

    if (preview.kind === "vesa_adapter") {
      const { vesa_mm: V, thickness_mm: T, clearance_mm: C } = preview.params;
      const size = V + 2 * C + 20;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(size, T, size), mat);
      group.add(plate);

      const r = 3;
      const hGeo = new THREE.CylinderGeometry(r, r, T * 1.6, 20);
      const mh = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0, roughness: 0.45 });
      const off = V / 2;
      [new THREE.Vector3(+off, 0, +off), new THREE.Vector3(-off, 0, +off), new THREE.Vector3(+off, 0, -off), new THREE.Vector3(-off, 0, -off)]
        .forEach((p) => {
          const m = new THREE.Mesh(hGeo, mh);
          m.position.copy(p);
          group.add(m);
        });
    }

    if (preview.kind === "router_mount") {
      const { router_width_mm: W, router_depth_mm: D, thickness_mm: T } = preview.params;
      const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), mat);
      base.position.set(0, -D * 0.3, 0);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(W, D * 0.6, T), mat);
      wall.position.set(0, 0, -D / 2 + T / 2);
      group.add(base, wall);
    }

    addObject(group);
    setWire(wireframe);
  }, [preview, mode, url, modelColor, addObject, setWire, wireframe]);

  /** -------------- STL -------------- */
  useEffect(() => {
    const showStl = mode === "stl" || (mode === "auto" && !!url);
    if (!showStl || !url) return;

    const loader = new STLLoader();
    const col = new THREE.Color(modelColor);
    loader.load(
      url,
      (geom: any) => {
        geom.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.05, roughness: 0.6 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        geom.computeBoundingBox();
        const bb = geom.boundingBox!;
        const center = bb.getCenter(new THREE.Vector3());
        geom.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

        addObject(mesh);
        setWire(wireframe);
      },
      undefined,
      (err) => console.error("STL load error", err)
    );
  }, [url, mode, modelColor, addObject, setWire, wireframe]);

  /** -------------- Marcadores de agujero -------------- */
  useEffect(() => {
    const group = markersGroupRef.current as any;
    if (!group) return;
    // limpiar
    while (group.children.length) {
      const ch = group.children.pop();
      if (ch?.geometry) ch.geometry.dispose();
      if (ch?.material) ch.material.dispose();
    }
    if (!markers.length) return;

    // Altura de los cilindros = bounding box de la pieza (si la hay)
    const h =
      objectRef.current
        ? new THREE.Box3().setFromObject(objectRef.current).getSize(new THREE.Vector3()).y + 2
        : 20;

    markers.forEach((m) => {
      const geo = new THREE.CylinderGeometry(m.d / 2, m.d / 2, h, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        metalness: 0.1,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      const cyl = new THREE.Mesh(geo, mat);
      cyl.position.set(m.x, 0, m.z);
      group.add(cyl);
    });
  }, [markers]);

  /** -------------- Edición (click to add) -------------- */
  useEffect(() => {
    if (!editing?.enabled) return;
    const el = rendererRef.current?.domElement as HTMLCanvasElement | undefined;
    if (!el) return;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      if (!editing?.enabled || !groundRef.current || !cameraRef.current) return;
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, cameraRef.current);
      const inter = raycaster.intersectObject(groundRef.current, false)[0];
      if (inter && editing.onPick) {
        const p = inter.point; // unidades = mm
        editing.onPick({ x: p.x, z: p.z });
      }
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [editing]);

  /** -------------- UI Toolbar y overlay -------------- */
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (sceneRef.current) {
      const col = next === "dark" ? "#111827" : background;
      sceneRef.current.background = new THREE.Color(col);
      sceneRef.current.fog = new THREE.Fog(new THREE.Color(col), 1200, 4000);
    }
    if (gridRef.current) {
      (gridRef.current.material as any).opacity = next === "dark" ? 0.3 : 0.9;
    }
    if (groundRef.current) {
      (groundRef.current.material as any).opacity = next === "dark" ? 0.25 : 0.35;
    }
  };

  const dimsText = useMemo(
    () =>
      dims.x || dims.y || dims.z
        ? `${Math.round(dims.x)} × ${Math.round(dims.y)} × ${Math.round(dims.z)} mm`
        : "",
    [dims]
  );

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      {/* Frame / borde */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-gray-200" />

      {/* Canvas */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Toolbar izquierda */}
      <div className="pointer-events-auto absolute left-2 top-2 z-10 flex gap-1">
        <button
          onClick={() => presetView("iso")}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Vista isométrica"
        >
          Iso
        </button>
        <button
          onClick={() => presetView("top")}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Vista superior"
        >
          Top
        </button>
        <button
          onClick={() => presetView("front")}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Vista frontal"
        >
          Front
        </button>
        <button
          onClick={() => presetView("right")}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Vista derecha"
        >
          Right
        </button>
        <button
          onClick={resetView}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Reset cámara"
        >
          Reset
        </button>
      </div>

      {/* Toolbar derecha */}
      <div className="pointer-events-auto absolute right-2 top-2 z-10 flex gap-1">
        <button
          onClick={() => setWire(!wireframe)}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Wireframe"
        >
          {wireframe ? "Wire: ON" : "Wire: OFF"}
        </button>
        <button
          onClick={() =>
            setGridVisible((v) => {
              if (gridRef.current) gridRef.current.visible = !v;
              return !v;
            })
          }
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Mostrar/Ocultar rejilla"
        >
          Grid
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Tema claro/oscuro"
        >
          {theme === "dark" ? "Dark" : "Light"}
        </button>
        <button
          onClick={() => objectRef.current && fitCamera(objectRef.current)}
          className="rounded-md border bg-white/80 px-2 py-1 text-xs shadow hover:bg-white"
          title="Ajustar a pantalla"
        >
          Fit
        </button>
      </div>

      {/* Overlay bottom-left: dims + rulers hint */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex select-none items-center gap-2 rounded bg-white/70 px-2 py-1 text-[11px] text-gray-700 shadow">
        {dimsText ? <span>{dimsText}</span> : null}
        {rulers && <span className="text-gray-500">· grid 50 mm</span>}
      </div>

      {/* Watermark */}
      {watermark && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 select-none rounded bg-white/70 px-2 py-0.5 text-[11px] text-gray-700 shadow">
          {watermark}
        </div>
      )}
    </div>
  );
}
