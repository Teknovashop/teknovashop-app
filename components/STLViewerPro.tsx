"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Html,
  StatsGl,
} from "@react-three/drei";

// Utilidad: cargar BufferGeometry desde un STL en runtime (opcional)
async function loadSTLGeometry(url: string): Promise<any> {
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const loader: any = new (STLLoader as any)();
  return new Promise((resolve, reject) => {
    loader.load(url, (geom: any) => resolve(geom), undefined, reject);
  });
}

type ViewerProps = {
  // O pasas una geometry ya construida…
  geometry?: any;
  // …o pasas una URL STL para previsualizar:
  stlUrl?: string;
  //
  metalness?: number;
  roughness?: number;
  showShadows?: boolean;
  envPreset?: "studio" | "city" | "sunset" | "warehouse" | "forest" | "apartment";
};

function Rig() {
  const controls = useRef<any>(null);
  useFrame(() => {
    if (controls.current) controls.current.update();
  });
  return <OrbitControls ref={controls} enableDamping dampingFactor={0.08} rotateSpeed={0.6} />;
}

function ClippingController({ active, constant, planeRef }: { active: boolean; constant: number; planeRef: any }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = active;
    return () => {
      gl.localClippingEnabled = false;
    };
  }, [active, gl]);
  // planeRef.current = new THREE.Plane(new THREE.Vector3(0, 0, -1), constant)
  useEffect(() => {
    if (!planeRef.current) {
      const THREE: any = (globalThis as any).THREE;
      planeRef.current = new THREE.Plane(new THREE.Vector3(0, 0, -1), constant);
    } else {
      planeRef.current.constant = constant;
    }
  }, [constant, planeRef]);
  return null;
}

function ModelMesh({
  geometry,
  planeRef,
  metalness,
  roughness,
  showShadows,
}: {
  geometry: any;
  planeRef: any;
  metalness: number;
  roughness: number;
  showShadows: boolean;
}) {
  const matProps: any = useMemo(
    () => ({
      metalness,
      roughness,
      color: "#c9c9c9",
      clippingPlanes: planeRef.current ? [planeRef.current] : [],
    }),
    [metalness, roughness, planeRef]
  );

  // Centrar y escalar dentro de escena (auto-fit)
  const meshRef = useRef<any>(null);
  useEffect(() => {
    if (!meshRef.current || !geometry?.boundingBox) return;
    geometry.computeBoundingBox?.();
    const bb = geometry.boundingBox;
    const size = new (window as any).THREE.Vector3();
    bb.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.5 / maxDim; // encaja en ~3 unidades
    meshRef.current.scale.setScalar(scale);
    // centra
    const center = new (window as any).THREE.Vector3();
    bb.getCenter(center).multiplyScalar(-1);
    meshRef.current.position.set(center.x * scale, center.y * scale, center.z * scale);
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow={showShadows}>
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}

function STLOrGeometry({ stlUrl, geometry, ...rest }: any) {
  const [geo, setGeo] = useState<any>(geometry || null);
  useEffect(() => {
    let mounted = true;
    if (geometry) {
      setGeo(geometry);
      return;
    }
    if (stlUrl) {
      loadSTLGeometry(stlUrl).then((g) => mounted && setGeo(g));
    }
    return () => {
      mounted = false;
    };
  }, [stlUrl, geometry]);

  if (!geo) {
    return (
      <Html center>
        <div className="px-3 py-1 rounded bg-black/60 text-white text-sm">Cargando geometría…</div>
      </Html>
    );
  }
  return <ModelMesh geometry={geo} {...rest} />;
}

export default function ViewerPro({
  geometry,
  stlUrl,
  metalness = 0.1,
  roughness = 0.6,
  showShadows = true,
  envPreset = "studio",
}: ViewerProps) {
  const [shadows, setShadows] = useState(showShadows);
  const [tone, setTone] = useState(1.0);
  const [env, setEnv] = useState(envPreset);
  const [clipOn, setClipOn] = useState(false);
  const [clip, setClip] = useState(0); // distancia del plano
  const clipPlaneRef = useRef<any>(null);

  return (
    <div className="w-full h-[650px] rounded-2xl overflow-hidden relative bg-neutral-950">
      {/* Toolbar */}
      <div className="absolute z-10 top-3 left-3 flex gap-2 bg-black/30 backdrop-blur px-3 py-2 rounded-xl text-white text-sm">
        <button onClick={() => setShadows((s) => !s)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">
          Sombras: {shadows ? "ON" : "OFF"}
        </button>
        <label className="flex items-center gap-2">
          Tone
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.01}
            value={tone}
            onChange={(e) => setTone(parseFloat(e.target.value))}
          />
        </label>
        <select
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          value={env}
          onChange={(e) => setEnv(e.target.value as any)}
        >
          <option value="studio">studio</option>
          <option value="city">city</option>
          <option value="sunset">sunset</option>
          <option value="warehouse">warehouse</option>
          <option value="forest">forest</option>
          <option value="apartment">apartment</option>
        </select>
        <label className="flex items-center gap-2">
          Clipping
          <input type="checkbox" checked={clipOn} onChange={(e) => setClipOn(e.target.checked)} />
        </label>
        {clipOn && (
          <input
            type="range"
            min={-2}
            max={2}
            step={0.01}
            value={clip}
            onChange={(e) => setClip(parseFloat(e.target.value))}
          />
        )}
      </div>

      <Canvas
        shadows={shadows}
        dpr={[1, 2]}
        camera={{ position: [2.5, 1.6, 2.5], fov: 45 }}
        onCreated={({ gl }) => {
          const THREE: any = (globalThis as any).THREE;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = tone;
        }}
      >
        {/* tone mapping live */}
        <ToneMapper value={tone} />
        <Rig />

        {/* Luces físicas */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[3, 4, 2]}
          intensity={1.2}
          castShadow={shadows}
          shadow-mapSize={[1024, 1024] as any}
        />
        <Environment preset={env as any} />

        {/* Clipping */}
        <ClippingController active={clipOn} constant={clip} planeRef={clipPlaneRef} />

        {/* Modelo */}
        <STLOrGeometry
          stlUrl={stlUrl}
          geometry={geometry}
          planeRef={clipPlaneRef}
          metalness={metalness}
          roughness={roughness}
          showShadows={shadows}
        />

        {/* Suelo / sombras de contacto */}
        {shadows && <ContactShadows opacity={0.45} scale={10} blur={2.2} far={3.5} resolution={1024} />}

        {/* Mini-gizmo */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["red", "green", "blue"]} labelColor="white" />
        </GizmoHelper>

        {/* FPS/Stats opcional */}
        {/* <StatsGl /> */}
      </Canvas>
    </div>
  );
}

function ToneMapper({ value }: { value: number }) {
  const { gl } = useThree();
  useEffect(() => {
    const THREE: any = (globalThis as any).THREE;
    gl.toneMappingExposure = value;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
  }, [gl, value]);
  return null;
}
