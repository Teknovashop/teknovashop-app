"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";

/**
 * Visor Pro con panel lateral
 * - Reacciona a:
 *    - window.dispatchEvent(new CustomEvent("forge:stl-url", { detail: { url } }))
 *    - window.dispatchEvent(new CustomEvent("forge:svg-url", { detail: { url } }))
 * - Incluye: clipping, sombras, HDRI, historial, snapshot PNG, export GLB,
 *   mediciones (bounding box + regla interactiva), ghost layer SVG.
 * - Sin dependencias nuevas (solo three + examples via import dinámico)
 * - Tipado laxo para no fallar en Vercel (refs y casts como `any`)
 */

type HistoryItem = { stl?: string | null; svg?: string | null; ts: number };

const LS_KEY = "teknovashop.forgepro.history.v1";

export default function ForgeProPage() {
  // Three core
  const canvasRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // Objetos escena
  const meshRef = useRef<any>(null);           // STL cargado
  const gridRef = useRef<any>(null);
  const axesRef = useRef<any>(null);
  const contourGroupRef = useRef<any>(null);   // grupo con líneas del SVG

  // Estados principales
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  // UI básicos
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

  // Ghost layer (SVG bajo)
  const [ghostEnabled, setGhostEnabled] = useState(true);
  const [ghostOpacity, setGhostOpacity] = useState(0.45);
  const [ghostYOffset, setGhostYOffset] = useState(0.02);

  // Medición
  const [rulerMode, setRulerMode] = useState(false);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);
  const [measureLine, setMeasureLine] = useState<any>(null);
  const rulerPointsRef = useRef<THREE.Vector3[]>([]);

  // Bounding box dims
  const [bboxDims, setBboxDims] = useState<{ x: number; y: number; z: number } | null>(null);

  // Historial local
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const pushHistory = useCallback((item: Partial<HistoryItem>) => {
    setHistory((prev) => {
      const next = [{ stl: stlUrl, svg: svgUrl, ts: Date.now(), ...item }, ...prev].slice(0, 40);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [stlUrl, svgUrl]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Helpers
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

  const updateBBoxDims = useCallback(() => {
    if (!meshRef.current) {
      setBboxDims(null);
      return;
    }
    const box = new THREE.Box3().setFromObject(meshRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    setBboxDims({ x: size.x, y: size.y, z: size.z });
  }, []);

  const clearCurrentMesh = useCallback(() => {
    if (meshRef.current && sceneRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.());
          else o.material?.dispose?.();
        }
      });
      meshRef.current = null;
    }
  }, []);

  const clearContours = useCallback(() => {
    const group = contourGroupRef.current;
    if (group && sceneRef.current) {
      group.children.forEach((c: any) => {
        c.geometry?.dispose?.();
        c.material?.dispose?.();
      });
      sceneRef.current.remove(group);
      contourGroupRef.current = null;
    }
  }, []);

  const clearRuler = useCallback(() => {
    rulerPointsRef.current = [];
    setMeasureDistance(null);
    if (measureLine) {
      sceneRef.current?.remove(measureLine);
      measureLine.geometry?.dispose?.();
      (measureLine.material as any)?.dispose?.();
      setMeasureLine(null);
    }
  }, [measureLine]);

  // Init Three
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
    } as any);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);
    camera.position.set(300, 220, 300);
    cameraRef.current = camera;

    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(200, 300, 200);
    dir.castShadow = true;
    (dir.shadow as any).mapSize?.set?.(1024, 1024);
    (dir.shadow as any).camera.near = 0.5;
    (dir.shadow as any).camera.far = 4000;
    scene.add(dir);

    // Grid + Axes
    const grid = new THREE.GridHelper(1000, 40, 0x888888 as any, 0xcccccc as any) as any;
    (grid.material as any).transparent = true;
    (grid.material as any).opacity = 0.6;
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(80);
    scene.add(axes);
    axesRef.current = axes;

    // OrbitControls
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controlsRef.current?.update?.();
      renderer.render(scene, camera);
    };
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

    // Ruler clicks (sobre canvas)
    const raycaster = new THREE.Raycaster();
    const onClick = (ev: MouseEvent) => {
      if (!rulerMode || !meshRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = raycaster.intersectObject(meshRef.current, true);
      if (intersects && intersects.length) {
        const p = intersects[0].point.clone();
        rulerPointsRef.current.push(p);

        if (rulerPointsRef.current.length === 2) {
          const [a, b] = rulerPointsRef.current;
          // Línea
          const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
          const mat = new THREE.LineBasicMaterial({ color: 0xff0062, linewidth: 2 } as any);
          const line = new THREE.Line(geom, mat);
          scene.add(line);
          setMeasureLine(line);

          const d = a.distanceTo(b);
          setMeasureDistance(d);
          rulerPointsRef.current = [];
        }
      }
    };
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("click", onClick);
      clearRuler();
      clearContours();
      clearCurrentMesh();
      renderer.dispose();
      scene.clear();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [clearContours, clearCurrentMesh, clearRuler, rulerMode]);

  // Cargar STL
  const loadStl = useCallback(
    (url: string) => {
      if (!url || !sceneRef.current) return;
      let disposed = false;

      (async () => {
        try {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
          const loader: any = new STLLoader();
          const geometry: any = await new Promise((res, rej) => {
            loader.load(url, (geom: any) => res(geom), undefined, (err: any) => rej(err));
          });
          if (disposed) return;

          geometry.computeVertexNormals();
          const mat = new THREE.MeshStandardMaterial({
            color: 0xbfc5cc,
            metalness: 0.15,
            roughness: 0.65,
            side: THREE.DoubleSide,
            clippingPlanes: [],
            clipShadows: true,
          } as any);
          const mesh = new THREE.Mesh(geometry, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          clearCurrentMesh();
          sceneRef.current!.add(mesh);
          meshRef.current = mesh;

          fitView();
          updateBBoxDims();
          pushHistory({ stl: url });
        } catch (e) {
          console.error("Error cargando STL:", e);
        }
      })();

      return () => { disposed = true; };
    },
    [clearCurrentMesh, fitView, pushHistory, updateBBoxDims]
  );

  useEffect(() => {
    if (!stlUrl) return;
    loadStl(stlUrl);
    // limpiar medición al cargar nuevo STL
    clearRuler();
  }, [stlUrl, loadStl, clearRuler]);

  // Cargar SVG (contornos)
  const loadSvgContours = useCallback(
    async (url: string) => {
      if (!url || !sceneRef.current) return;
      clearContours();

      try {
        const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
        const loader: any = new SVGLoader();
        const data: any = await new Promise((res, rej) => {
          loader.load(url, (d: any) => res(d), undefined, (err: any) => rej(err));
        });

        const group = new THREE.Group();
        const material = new THREE.LineBasicMaterial({
          color: 0x1565c0,
          transparent: true,
          opacity: ghostOpacity,
        } as any);

        for (const path of data.paths) {
          const toUse = (path.subPaths && path.subPaths.length ? path.subPaths : []) as any[];
          toUse.forEach((sp: any) => {
            const points = sp.getPoints(128);
            if (!points?.length) return;
            const positions: number[] = [];
            points.forEach((p: any) => {
              // SVG (x,y) → plano XZ; Y a ghostYOffset
              positions.push(p.x, ghostYOffset, -p.y);
            });
            const geom = new THREE.BufferGeometry();
            geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
            const line = new THREE.LineLoop(geom, material);
            group.add(line);
          });
        }

        // Colocación relativa aproximada al STL (debajo)
        if (meshRef.current) {
          const box = new THREE.Box3().setFromObject(meshRef.current);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          // centra el SVG en X y Z
          group.position.set(center.x - size.x / 2, 0, center.z);
        }

        sceneRef.current.add(group);
        contourGroupRef.current = group;

        pushHistory({ svg: url });
      } catch (e) {
        console.error("Error cargando SVG:", e);
      }
    },
    [clearContours, ghostOpacity, ghostYOffset, pushHistory]
  );

  useEffect(() => {
    if (!svgUrl) return;
    loadSvgContours(svgUrl);
  }, [svgUrl, loadSvgContours]);

  // Eventos del configurador
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

  // Fondo claro/oscuro, sombras
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(bgLight ? 0xf5f6f8 : 0x0e1116);
  }, [bgLight]);
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.shadowMap.enabled = !!shadows;
  }, [shadows]);

  // Clipping
  const clippingPlanes = useMemo(() => {
    const planes: any[] = [];
    if (clipX) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipXConst));
    if (clipY) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), clipYConst));
    if (clipZ) planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), clipZConst));
    return planes;
  }, [clipX, clipY, clipZ, clipXConst, clipYConst, clipZConst]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.clippingPlanes = clipEnabled ? clippingPlanes : [];
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

  // HDRI
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
      console.error("HDRI error:", e);
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

  // Snapshot PNG
  const snapshotPNG = () => {
    if (!rendererRef.current) return;
    const dataURL = rendererRef.current.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `forge_snapshot_${Date.now()}.png`;
    a.click();
  };

  // Export GLB
  const exportGLB = async () => {
    if (!meshRef.current) return;
    try {
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const exporter: any = new GLTFExporter();
      exporter.parse(
        meshRef.current,
        (result: any) => {
          let blob: Blob;
          if (result instanceof ArrayBuffer) {
            blob = new Blob([result], { type: "model/gltf-binary" });
          } else {
            // por si exporta JSON (GLTF)
            const json = JSON.stringify(result);
            blob = new Blob([json], { type: "application/json" });
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `forge_export_${Date.now()}.glb`;
          a.click();
          URL.revokeObjectURL(url);
        },
        (err: any) => console.error("GLB export error:", err),
        { binary: true } // GLB
      );
    } catch (e) {
      console.error("GLB exporter load error:", e);
    }
  };

  // UI
  return (
    <div className="flex h-[100dvh] w-full">
      {/* Panel lateral */}
      <aside className="w-[320px] shrink-0 border-r bg-white/85 p-3 text-sm">
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <strong>Visor Pro</strong>
            <div className="flex gap-2">
              <button className="rounded-md border px-2 py-1" onClick={fitView}>
                Centrar
              </button>
              <button
                className="rounded-md border px-2 py-1"
                onClick={() => {
                  // limpiar todo
                  clearRuler();
                  clearContours();
                  clearCurrentMesh();
                  setStlUrl(null);
                  setSvgUrl(null);
                  setBboxDims(null);
                }}
              >
                Limpiar
              </button>
            </div>
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
                <input type="checkbox" checked={clipEnabled} onChange={(e) => setClipEnabled(e.target.checked)} />
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

        {/* Ghost layer (SVG) */}
        <div className="mb-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Ghost layer (SVG)</span>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={ghostEnabled} onChange={(e) => {
                setGhostEnabled(e.target.checked);
                if (contourGroupRef.current) {
                  (contourGroupRef.current as any).visible = e.target.checked;
                }
              }} />
              <span>Visible</span>
            </label>
          </div>
          <div className="grid gap-2">
            <label className="text-xs">Opacidad: {ghostOpacity.toFixed(2)}</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ghostOpacity}
              onChange={(e) => {
                const v = Number(e.target.value);
                setGhostOpacity(v);
                if (contourGroupRef.current) {
                  contourGroupRef.current.traverse((o: any) => {
                    if (o.material) o.material.opacity = v;
                  });
                }
              }}
            />
            <label className="text-xs">Offset Y: {ghostYOffset.toFixed(2)} mm</label>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.01}
              value={ghostYOffset}
              onChange={(e) => {
                const v = Number(e.target.value);
                setGhostYOffset(v);
                if (contourGroupRef.current) {
                  contourGroupRef.current.traverse((o: any) => {
                    if (o.geometry) {
                      const pos = o.geometry.getAttribute("position");
                      const arr = pos.array as number[];
                      for (let i = 1; i < arr.length; i += 3) {
                        // y index
                        arr[i] = v;
                      }
                      pos.needsUpdate = true;
                      o.geometry.computeBoundingBox?.();
                      o.geometry.computeBoundingSphere?.();
                    }
                  });
                }
              }}
            />
          </div>
        </div>

        {/* Mediciones */}
        <div className="mb-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Mediciones</span>
            <button className={`rounded-md border px-2 py-1 ${rulerMode ? "bg-black text-white" : ""}`} onClick={() => {
              setRulerMode(v => !v);
              if (rulerMode) clearRuler();
            }}>
              Regla {rulerMode ? "ON" : "OFF"}
            </button>
          </div>
          {bboxDims ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-neutral-500">X:</span> {bboxDims.x.toFixed(2)} mm</div>
              <div><span className="text-neutral-500">Y:</span> {bboxDims.y.toFixed(2)} mm</div>
              <div><span className="text-neutral-500">Z:</span> {bboxDims.z.toFixed(2)} mm</div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500">Sin objeto.</div>
          )}
          <div className="mt-2 text-xs">
            {measureDistance != null ? (
              <div>Distancia: <strong>{measureDistance.toFixed(2)} mm</strong></div>
            ) : (
              <div className="text-neutral-500">Haz clic en 2 puntos del modelo.</div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button className="rounded-md border px-2 py-1 text-xs" onClick={updateBBoxDims}>
              Recalcular bbox
            </button>
            <button className="rounded-md border px-2 py-1 text-xs" onClick={clearRuler} disabled={!measureLine}>
              Limpiar regla
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="mb-4 rounded-lg border p-3">
          <div className="mb-2 font-medium">Acciones</div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border px-2 py-1" onClick={snapshotPNG}>
              Snapshot PNG
            </button>
            <button className="rounded-md border px-2 py-1" onClick={exportGLB} disabled={!meshRef.current}>
              Export GLB
            </button>
          </div>
        </div>

        {/* Historial */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 font-medium">Historial</div>
          <div className="max-h-[220px] space-y-2 overflow-auto">
            {history.length === 0 && <div className="text-xs text-neutral-500">Vacío por ahora.</div>}
            {history.map((h, i) => (
              <div key={h.ts + ":" + i} className="rounded-md border p-2">
                <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>{new Date(h.ts).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {h.stl && (
                    <button className="rounded-md border px-2 py-1 text-xs" onClick={() => setStlUrl(h.stl || null)}>
                      Cargar STL
                    </button>
                  )}
                  {h.svg && (
                    <button className="rounded-md border px-2 py-1 text-xs" onClick={() => setSvgUrl(h.svg || null)}>
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
                try { localStorage.removeItem(LS_KEY); } catch {}
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
