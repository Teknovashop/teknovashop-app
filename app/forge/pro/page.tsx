"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";

/**
 * Visor Pro con panel lateral
 * - Sin dependencias nuevas (solo three + examples vía dynamic import)
 * - Todas las refs en `any` para evitar errores TS en Vercel
 * - Eventos esperados:
 *    - window.dispatchEvent(new CustomEvent("forge:stl-url", { detail: { url } }))
 *    - window.dispatchEvent(new CustomEvent("forge:svg-url", { detail: { url } }))
 */

type HistoryItem = { stl?: string | null; svg?: string | null; ts: number };

const LS_KEY = "teknovashop.forgepro.history.v1";

export default function ForgeProPage() {
  const canvasRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  const meshRef = useRef<any>(null);           // STL cargado
  const gridRef = useRef<any>(null);
  const axesRef = useRef<any>(null);
  const contourGroupRef = useRef<any>(null);   // grupo con líneas SVG

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // UI toggles
  const [bgLight, setBgLight] = useState(true);
  const [shadows, setShadows] = useState(true);

  // Clipping
  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipX, setClipX] = useState(false);
  const [clipY, setClipY] = useState(false);
  const [clipZ, setClipZ] = useState(false);
  const [clipXConst, setClipXConst] = useState(0);
  const [clipYConst, setClipYConst] = useState(0);
  const [clipZConst, setClipZConst] = useState(0);

  // HDRI
  const [hdriUrl, setHdriUrl] = useState<string>("");
  const [hdriLoaded, setHdriLoaded] = useState(false);

  // Historial local
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ---------- helpers ----------
  const pushHistory = useCallback((item: Partial<HistoryItem>) => {
    setHistory((prev) => {
      const next = [{ stl: stlUrl, svg: svgUrl, ts: Date.now(), ...item }, ...prev].slice(0, 30);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [stlUrl, svgUrl]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const fitView = useCallback(() => {
    const cam = cameraRef.current;
    const obj = meshRef.current;
    if (!cam || !obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (cam.fov * Math.PI) / 180;
    let dist = maxDim / (2 * Math.tan(fov / 2));
    dist *= 1.4;

    const dir = new THREE.Vector3(1, 1, 1).normalize();
    cam.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    cam.near = Math.max(0.001, dist / 50);
    cam.far = dist * 100;
    cam.updateProjectionMatrix();
    cam.lookAt(center);
    controlsRef.current?.target?.copy(center);
    controlsRef.current?.update?.();
  }, []);

  const clearCurrentMesh = useCallback(() => {
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) {
            o.material.forEach((m: any) => m.dispose?.());
          } else {
            o.material?.dispose?.();
          }
        }
      });
      meshRef.current = null;
    }
  }, []);

  const clearContours = useCallback(() => {
    const group = contourGroupRef.current;
    if (group && sceneRef.current) {
      group.children.forEach((c: any) => {
        if (c.geometry) c.geometry.dispose?.();
        if (c.material) c.material.dispose?.();
      });
      sceneRef.current.remove(group);
      contourGroupRef.current = null;
    }
  }, []);

  // ---------- init three ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f6f8);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true; // necesario para clipping por material
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      10_000
    );
    camera.position.set(300, 220, 300);
    cameraRef.current = camera;

    // Luces
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(200, 300, 200);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 4000;
    scene.add(dir);

    // Suelo (grid) y ejes
    const grid = new THREE.GridHelper(1000, 40, 0x888888, 0xcccccc);
    (grid.material as THREE.Material).transparent = true as any;
    (grid.material as THREE.Material).opacity = 0.6 as any;
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(80);
    scene.add(axes);
    axesRef.current = axes;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      renderer.render(scene, camera);
    };

    // OrbitControls (import dinámico)
    (async () => {
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      controlsRef.current = new OrbitControls(camera, renderer.domElement);
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.08;
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 5;
      controlsRef.current.maxDistance = 5000;
      loop();
    })();

    // Resize
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearContours();
      clearCurrentMesh();
      renderer.dispose();
      scene.clear();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [clearCurrentMesh, clearContours]);

  // ---------- carga STL ----------
  const loadStl = useCallback((url: string) => {
    if (!url || !sceneRef.current) return;
    let disposed = false;

    (async () => {
      try {
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        const loader: any = new STLLoader();
        const geometry: THREE.BufferGeometry = await new Promise((res, rej) => {
          loader.load(url, (geom: any) => res(geom), undefined, (err: any) => rej(err));
        });
        if (disposed) return;

        geometry.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: 0xbfc5cc,
          metalness: 0.15,
          roughness: 0.65,
          side: THREE.DoubleSide,
          clippingPlanes: [], // se rellena según toggles
          clipShadows: true,
        });
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        clearCurrentMesh();
        sceneRef.current!.add(mesh);
        meshRef.current = mesh;

        fitView();
        pushHistory({ stl: url });
      } catch (e) {
        console.error("Error cargando STL:", e);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [clearCurrentMesh, fitView, pushHistory]);

  useEffect(() => {
    if (!stlUrl) return;
    loadStl(stlUrl);
  }, [stlUrl, loadStl]);

  // ---------- carga SVG (contornos) ----------
  const loadSvgContours = useCallback(async (url: string) => {
    if (!url || !sceneRef.current) return;
    clearContours();

    try {
      const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
      const loader: any = new SVGLoader();
      const data: any = await new Promise((res, rej) => {
        loader.load(url, (d: any) => res(d), undefined, (err: any) => rej(err));
      });

      // Convertimos paths a THREE.Line
      const group = new THREE.Group();
      const color = new THREE.Color(0x1565c0);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
      });

      for (const path of data.paths) {
        const sub = SVGLoader.createPaths(path);
        // También vale: path.subPaths
        const toUse = (sub && sub.length ? sub : path.subPaths) || [];
        toUse.forEach((sp: any) => {
          const points = sp.getPoints(64);
          if (!points?.length) return;
          // SVG coords (x,y) → plano XZ en y=~0.02
          const positions: number[] = [];
          points.forEach((p: any) => {
            positions.push(p.x, 0.02, -p.y);
          });
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          const line = new THREE.LineLoop(geom, material);
          group.add(line);
        });
      }

      // Centrar el grupo con respecto al objeto cargado si existe
      if (meshRef.current) {
        const box = new THREE.Box3().setFromObject(meshRef.current);
        const center = new THREE.Vector3();
        box.getCenter(center);
        group.position.set(center.x - box.getSize(new THREE.Vector3()).x / 2, 0, center.z);
      }

      sceneRef.current.add(group);
      contourGroupRef.current = group;
      pushHistory({ svg: url });
    } catch (e) {
      console.error("Error cargando SVG:", e);
    }
  }, [clearContours, pushHistory]);

  useEffect(() => {
    if (!svgUrl) return;
    loadSvgContours(svgUrl);
  }, [svgUrl, loadSvgContours]);

  // ---------- eventos desde configurador ----------
  useEffect(() => {
    const onStl = (e: any) => {
      const url = e?.detail?.url;
      if (typeof url === "string") setStlUrl(url);
    };
    const onSvg = (e: any) => {
      const url = e?.detail?.url;
      if (typeof url === "string") setSvgUrl(url);
    };
    window.addEventListener("forge:stl-url", onStl as any);
    window.addEventListener("forge:svg-url", onSvg as any);
    return () => {
      window.removeEventListener("forge:stl-url", onStl as any);
      window.removeEventListener("forge:svg-url", onSvg as any);
    };
  }, []);

  // ---------- toggles básicos ----------
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(bgLight ? 0xf5f6f8 : 0x0e1116);
  }, [bgLight]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.shadowMap.enabled = !!shadows;
  }, [shadows]);

  // ---------- clipping global ----------
  const clippingPlanes = useMemo(() => {
    // Planos en espacio del mundo: +X, +Y, +Z (normal hacia +)
    const planes: THREE.Plane[] = [];
    if (clipX) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipXConst)); // x >= const
    if (clipY) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), clipYConst)); // y >= const
    if (clipZ) planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), clipZConst)); // z >= const
    return planes;
  }, [clipX, clipY, clipZ, clipXConst, clipYConst, clipZConst]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.clippingPlanes = clipEnabled ? clippingPlanes : [];
    // además aplicamos a material principal si está cargado
    const mesh = meshRef.current;
    if (mesh?.material) {
      const apply = (m: any) => {
        m.clippingPlanes = clipEnabled ? clippingPlanes : [];
        m.clipShadows = true;
      };
      if (Array.isArray(mesh.material)) mesh.material.forEach(apply);
      else apply(mesh.material);
    }
  }, [clipEnabled, clippingPlanes]);

  // ---------- HDRI ----------
  const loadHDRI = async () => {
    if (!hdriUrl || !sceneRef.current) return;
    try {
      const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
      const loader: any = new RGBELoader();
      loader.setDataType(THREE.UnsignedByteType);
      const tex: any = await new Promise((res, rej) => {
        loader.load(hdriUrl, (t: any) => res(t), undefined, (err: any) => rej(err));
      });
      tex.mapping = THREE.EquirectangularReflectionMapping;
      sceneRef.current.environment = tex;
      setHdriLoaded(true);
    } catch (e) {
      console.error("HDRI load error:", e);
      setHdriLoaded(false);
    }
  };

  const clearHDRI = () => {
    if (!sceneRef.current) return;
    const env = sceneRef.current.environment as any;
    if (env?.dispose) env.dispose();
    sceneRef.current.environment = null;
    setHdriLoaded(false);
  };

  // ---------- UI ----------
  return (
    <div className="flex h-[100dvh] w-full">
      {/* Panel lateral */}
      <aside className="w-[300px] shrink-0 border-r bg-white/80 p-3 text-sm">
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <strong>Visor Pro</strong>
            <button
              className="rounded-md border px-2 py-1"
              onClick={() => {
                // centrar
                fitView();
              }}
            >
              Centrar
            </button>
          </div>

          <div className="grid gap-2">
            <label className="inline-flex items-center justify-between gap-2">
              <span>Fondo claro</span>
              <input type="checkbox" checked={bgLight} onChange={(e) => setBgLight(e.target.checked)} />
            </label>

            <label className="inline-flex items-center justify-between gap-2">
              <span>Sombras</span>
              <input type="checkbox" checked={shadows} onChange={(e) => setShadows(e.target.checked)} />
            </label>
          </div>
        </div>

        {/* Clipping */}
        <div className="mb-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Clipping</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={clipEnabled}
                onChange={(e) => setClipEnabled(e.target.checked)}
              />
              <span>Activo</span>
            </label>
          </div>

          <div className="grid gap-3">
            <div className="rounded-md border p-2">
              <label className="flex items-center justify-between gap-2">
                <span>Plano X</span>
                <input type="checkbox" checked={clipX} onChange={(e) => setClipX(e.target.checked)} />
              </label>
              <div className="mt-2">
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={1}
                  value={clipXConst}
                  onChange={(e) => setClipXConst(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-xs text-neutral-600">Constante: {clipXConst} mm</div>
              </div>
            </div>

            <div className="rounded-md border p-2">
              <label className="flex items-center justify-between gap-2">
                <span>Plano Y</span>
                <input type="checkbox" checked={clipY} onChange={(e) => setClipY(e.target.checked)} />
              </label>
              <div className="mt-2">
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={1}
                  value={clipYConst}
                  onChange={(e) => setClipYConst(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-xs text-neutral-600">Constante: {clipYConst} mm</div>
              </div>
            </div>

            <div className="rounded-md border p-2">
              <label className="flex items-center justify-between gap-2">
                <span>Plano Z</span>
                <input type="checkbox" checked={clipZ} onChange={(e) => setClipZ(e.target.checked)} />
              </label>
              <div className="mt-2">
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={1}
                  value={clipZConst}
                  onChange={(e) => setClipZConst(Number(e.target.value))}
                  className="w-full"
                />
                <div className="mt-1 text-xs text-neutral-600">Constante: {clipZConst} mm</div>
              </div>
            </div>
          </div>
        </div>

        {/* HDRI */}
        <div className="mb-4 rounded-lg border p-3">
          <div className="mb-2 font-medium">HDRI</div>
          <input
            type="url"
            placeholder="URL .hdr (equirect)"
            className="w-full rounded-md border px-2 py-1"
            value={hdriUrl}
            onChange={(e) => setHdriUrl(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button className="rounded-md border px-2 py-1" onClick={loadHDRI} disabled={!hdriUrl}>
              Cargar
            </button>
            <button className="rounded-md border px-2 py-1" onClick={clearHDRI} disabled={!hdriLoaded}>
              Quitar
            </button>
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            {hdriLoaded ? "HDRI activo" : "Sin HDRI"}
          </div>
        </div>

        {/* Historial */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 font-medium">Historial</div>
          <div className="max-h-[240px] space-y-2 overflow-auto">
            {history.length === 0 && (
              <div className="text-xs text-neutral-500">Vacío por ahora.</div>
            )}
            {history.map((h, i) => (
              <div key={h.ts + ":" + i} className="rounded-md border p-2">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>{new Date(h.ts).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {h.stl && (
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      onClick={() => setStlUrl(h.stl || null)}
                    >
                      Cargar STL
                    </button>
                  )}
                  {h.svg && (
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      onClick={() => setSvgUrl(h.svg || null)}
                    >
                      Cargar SVG
                    </button>
                  )}
                </div>
                <div className="mt-1 break-all text-[10px] text-neutral-500">
                  {h.stl && <div>STL: {h.stl}</div>}
                  {h.svg && <div>SVG: {h.svg}</div>}
                </div>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <button
              className="mt-2 w-full rounded-md border px-2 py-1 text-xs"
              onClick={() => {
                setHistory([]);
                try {
                  localStorage.removeItem(LS_KEY);
                } catch {}
              }}
            >
              Limpiar historial
            </button>
          )}
        </div>
      </aside>

      {/* Lienzo */}
      <div className="relative flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />
        {!stlUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
            Genera un STL para visualizarlo aquí.
          </div>
        )}
      </div>
    </div>
  );
}
