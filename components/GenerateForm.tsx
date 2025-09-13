'use client';

import { useCallback, useMemo, useState } from 'react';

type ApiResult =
  | { status: 'ok'; stl_url: string }
  | { status: 'error'; detail?: string; message?: string }
  | null;

type ModelSlug = 'vesa-adapter' | 'router-mount' | 'cable-tray';

const apiBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FORGE_API ||
  process.env.NEXT_PUBLIC_STL_API ||
  process.env.NEXT_PUBLIC_STL_SERVICE_URL ||
  '';

const DEFAULTS: Record<ModelSlug, any> = {
  'vesa-adapter': { width: 180, height: 180, thickness: 6, pattern: '100x100' },
  'router-mount': { width: 160, height: 220, depth: 40, thickness: 4 },
  'cable-tray': { width: 60, height: 25, length: 180, thickness: 3, slots: true },
};

export default function GenerateForm() {
  const [model, setModel] = useState<ModelSlug>('vesa-adapter');
  const [params, setParams] = useState<any>(DEFAULTS['vesa-adapter']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult>(null);

  const patterns = useMemo(
    () => ['75x75', '100x100', '100x75', '120x120', '200x100'],
    []
  );

  const onChangeModel = useCallback((value: ModelSlug) => {
    setModel(value);
    setParams(DEFAULTS[value]);
    setResult(null);
  }, []);

  const setNumber = (key: string, v: number) =>
    setParams((p: any) => ({ ...p, [key]: v }));
  const setString = (key: string, v: string) =>
    setParams((p: any) => ({ ...p, [key]: v }));
  const setBool = (key: string, v: boolean) =>
    setParams((p: any) => ({ ...p, [key]: v }));

  const handleGenerate = async () => {
    setResult(null);
    if (!apiBase) {
      setResult({ status: 'error', message: 'Falta NEXT_PUBLIC_BACKEND_URL' } as any);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,          // 'vesa-adapter' | 'router-mount' | 'cable-tray'
          params,         // parámetros según el modelo
          order_id: 'demo-order',
          license: 'personal',
        }),
      });
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setResult({ status: 'error', message: err?.message || 'Failed to fetch' } as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Modelo</label>
      <select
        value={model}
        onChange={(e) => onChangeModel(e.target.value as ModelSlug)}
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', marginBottom: 16 }}
      >
        <option value="vesa-adapter">VESA Adapter</option>
        <option value="router-mount">Router / Device Wall-Mount</option>
        <option value="cable-tray">Bandeja pasa-cables</option>
      </select>

      {model === 'vesa-adapter' && (
        <>
          <Slider label={`Ancho (mm): ${params.width}`} min={100} max={300} value={params.width} onChange={(v) => setNumber('width', v)} />
          <Slider label={`Alto (mm): ${params.height}`} min={100} max={300} value={params.height} onChange={(v) => setNumber('height', v)} />
          <Slider label={`Espesor (mm): ${params.thickness}`} min={3} max={10} value={params.thickness} onChange={(v) => setNumber('thickness', v)} />

          <label style={{ display: 'block', fontWeight: 600, marginTop: 18, marginBottom: 6 }}>Patrón agujeros</label>
          <select
            value={params.pattern}
            onChange={(e) => setString('pattern', e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', marginBottom: 16 }}
          >
            {patterns.map((p) => (
              <option key={p} value={p}>
                {p.replace('x', ' × ')} mm
              </option>
            ))}
          </select>
        </>
      )}

      {model === 'router-mount' && (
        <>
          <Slider label={`Ancho (mm): ${params.width}`} min={80} max={260} value={params.width} onChange={(v) => setNumber('width', v)} />
          <Slider label={`Alto (mm): ${params.height}`} min={120} max={300} value={params.height} onChange={(v) => setNumber('height', v)} />
          <Slider label={`Fondo (mm): ${params.depth}`} min={20} max={80} value={params.depth} onChange={(v) => setNumber('depth', v)} />
          <Slider label={`Espesor (mm): ${params.thickness}`} min={3} max={8} value={params.thickness} onChange={(v) => setNumber('thickness', v)} />
        </>
      )}

      {model === 'cable-tray' && (
        <>
          <Slider label={`Ancho (mm): ${params.width}`} min={30} max={120} value={params.width} onChange={(v) => setNumber('width', v)} />
          <Slider label={`Alto (mm): ${params.height}`} min={15} max={60} value={params.height} onChange={(v) => setNumber('height', v)} />
          <Slider label={`Largo (mm): ${params.length}`} min={120} max={400} value={params.length} onChange={(v) => setNumber('length', v)} />
          <Slider label={`Espesor (mm): ${params.thickness}`} min={2} max={6} value={params.thickness} onChange={(v) => setNumber('thickness', v)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input id="slots" type="checkbox" checked={!!params.slots} onChange={(e) => setBool('slots', e.target.checked)} />
            <label htmlFor="slots">Ranuras de ventilación</label>
          </div>
        </>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: '100%',
          marginTop: 18,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #1b2533',
          color: 'white',
          background: '#0f1a2b',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontWeight: 600,
        }}
      >
        {loading ? 'Generando…' : 'Generar STL'}
      </button>

      <pre style={{ marginTop: 16, padding: 14, background: '#f6f6f6', borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
        {JSON.stringify(result || {}, null, 2)}
      </pre>

      {result && (result as any).stl_url && (
        <p style={{ marginTop: 10 }}>
          <a href={(result as any).stl_url} target="_blank" rel="noreferrer">
            Descargar STL (en Supabase)
          </a>
        </p>
      )}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
    </div>
  );
}
