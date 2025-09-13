'use client';

import { useMemo, useState } from 'react';
import STLViewer from './STLViewer';

type ModelKey = 'vesa-adapter' | 'router-mount' | 'cable-tray';

type ResultOk = { status: 'ok'; stl_url: string };
type ResultErr = { status: 'error'; detail?: string; message?: string };
type Result = ResultOk | ResultErr | null;

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FORGE_API ||
  process.env.NEXT_PUBLIC_STL_API ||
  process.env.NEXT_PUBLIC_STL_SERVICE_URL ||
  '';

export default function GenerateForm() {
  // --------- UI state ----------

  const [model, setModel] = useState<ModelKey>('vesa-adapter');

  // VESA params
  const [vesaWidth, setVesaWidth] = useState(180);
  const [vesaHeight, setVesaHeight] = useState(180);
  const [vesaThickness, setVesaThickness] = useState(6);
  const [vesaPattern, setVesaPattern] = useState('100x100');

  // Router mount params
  const [rWidth, setRWidth] = useState(160);
  const [rHeight, setRHeight] = useState(220);
  const [rDepth, setRDepth] = useState(40);
  const [rThickness, setRThickness] = useState(4);

  // Cable tray params
  const [cWidth, setCWidth] = useState(60);
  const [cHeight, setCHeight] = useState(25);
  const [cLength, setCLength] = useState(180);
  const [cThickness, setCThickness] = useState(3);
  const [cSlots, setCSlots] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const isVesa = model === 'vesa-adapter';
  const isRouter = model === 'router-mount';
  const isCable = model === 'cable-tray';

  const canSubmit = useMemo(() => {
    if (!API_BASE) return false;

    if (isVesa) {
      return vesaWidth >= 50 && vesaHeight >= 50 && vesaThickness >= 3;
    }
    if (isRouter) {
      return rWidth >= 60 && rHeight >= 80 && rDepth >= 10 && rThickness >= 2;
    }
    if (isCable) {
      return cWidth >= 20 && cHeight >= 10 && cLength >= 60 && cThickness >= 2;
    }
    return false;
  }, [
    isVesa,
    isRouter,
    isCable,
    vesaWidth,
    vesaHeight,
    vesaThickness,
    rWidth,
    rHeight,
    rDepth,
    rThickness,
    cWidth,
    cHeight,
    cLength,
    cThickness,
  ]);

  async function handleGenerate() {
    if (!API_BASE) {
      setResult({ status: 'error', message: 'Falta NEXT_PUBLIC_BACKEND_URL' });
      return;
    }

    setLoading(true);
    setResult(null);

    // Mapear params por modelo
    let params: Record<string, any> = {};
    if (isVesa) {
      params = {
        width: vesaWidth,
        height: vesaHeight,
        thickness: vesaThickness,
        pattern: vesaPattern,
      };
    } else if (isRouter) {
      params = {
        width: rWidth,
        height: rHeight,
        depth: rDepth,
        thickness: rThickness,
      };
    } else if (isCable) {
      params = {
        width: cWidth,
        height: cHeight,
        length: cLength,
        thickness: cThickness,
        slots: cSlots,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // el backend acepta model o model_slug
          model,
          params,
          order_id: 'demo-order-001',
          license: 'personal',
        }),
      });

      const json = (await res.json()) as Result;
      setResult(json);
    } catch (err: any) {
      setResult({ status: 'error', message: err?.message || 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 560,
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Selector de modelo */}
      <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
        Modelo
      </label>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value as ModelKey)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #c9c9c9',
          marginBottom: 16,
        }}
      >
        <option value="vesa-adapter">VESA Adapter</option>
        <option value="router-mount">Router Mount</option>
        <option value="cable-tray">Cable Tray</option>
      </select>

      {/* Parámetros según modelo */}
      {isVesa && (
        <>
          <Slider
            label={`Ancho (mm): ${vesaWidth}`}
            value={vesaWidth}
            min={80}
            max={300}
            step={1}
            onChange={setVesaWidth}
          />
          <Slider
            label={`Alto (mm): ${vesaHeight}`}
            value={vesaHeight}
            min={80}
            max={300}
            step={1}
            onChange={setVesaHeight}
          />
          <Slider
            label={`Espesor (mm): ${vesaThickness}`}
            value={vesaThickness}
            min={3}
            max={12}
            step={1}
            onChange={setVesaThickness}
          />

          <label style={{ fontWeight: 600, display: 'block', marginTop: 8 }}>
            Patrón agujeros
          </label>
          <select
            value={vesaPattern}
            onChange={(e) => setVesaPattern(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #c9c9c9',
              marginBottom: 16,
            }}
          >
            <option value="100x100">100 × 100 mm</option>
            <option value="75x75">75 × 75 mm</option>
            <option value="200x100">200 × 100 mm</option>
            <option value="200x200">200 × 200 mm</option>
          </select>
        </>
      )}

      {isRouter && (
        <>
          <Slider
            label={`Ancho base (mm): ${rWidth}`}
            value={rWidth}
            min={80}
            max={300}
            step={1}
            onChange={setRWidth}
          />
          <Slider
            label={`Alto base (mm): ${rHeight}`}
            value={rHeight}
            min={100}
            max={350}
            step={1}
            onChange={setRHeight}
          />
          <Slider
            label={`Fondo (mm): ${rDepth}`}
            value={rDepth}
            min={20}
            max={120}
            step={1}
            onChange={setRDepth}
          />
          <Slider
            label={`Espesor (mm): ${rThickness}`}
            value={rThickness}
            min={2}
            max={10}
            step={1}
            onChange={setRThickness}
          />
        </>
      )}

      {isCable && (
        <>
          <Slider
            label={`Ancho (mm): ${cWidth}`}
            value={cWidth}
            min={20}
            max={120}
            step={1}
            onChange={setCWidth}
          />
          <Slider
            label={`Alto (mm): ${cHeight}`}
            value={cHeight}
            min={10}
            max={80}
            step={1}
            onChange={setCHeight}
          />
          <Slider
            label={`Longitud (mm): ${cLength}`}
            value={cLength}
            min={60}
            max={400}
            step={5}
            onChange={setCLength}
          />
          <Slider
            label={`Espesor (mm): ${cThickness}`}
            value={cThickness}
            min={2}
            max={10}
            step={1}
            onChange={setCThickness}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={cSlots}
              onChange={(e) => setCSlots(e.target.checked)}
            />
            Con ranuras de ventilación
          </label>
        </>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !canSubmit}
        style={{
          width: '100%',
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid #0f172a',
          background: loading || !canSubmit ? '#cbd5e1' : '#0f172a',
          color: '#fff',
          cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {loading ? 'Generando…' : 'Generar STL'}
      </button>

      {/* Resultado JSON */}
      <pre
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f6f6f6',
          borderRadius: 8,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(result || {}, null, 2)}
      </pre>

      {/* Link y visor */}
      {result && result.status === 'ok' && (result as ResultOk).stl_url && (
        <>
          <p style={{ marginTop: 10 }}>
            <a href={(result as ResultOk).stl_url} target="_blank" rel="noreferrer">
              Descargar STL (en Supabase)
            </a>
          </p>

          <div style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 8 }}>
            <STLViewer url={(result as ResultOk).stl_url} height={360} />
          </div>
        </>
      )}
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, onChange } = props;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: '100%' }}
      />
    </div>
  );
}
