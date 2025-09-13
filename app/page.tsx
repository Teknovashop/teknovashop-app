'use client';

import { useMemo, useState } from 'react';

type ForgeResponse =
  | { status: 'ok'; stl_url: string }
  | { status: 'error'; message?: string; detail?: string }
  | Record<string, unknown>;

export default function Page() {
  // ---- UI state ----
  const [model, setModel] = useState<'vesa-adapter'>('vesa-adapter');
  const [width, setWidth] = useState<number>(180);
  const [height, setHeight] = useState<number>(180);
  const [thickness, setThickness] = useState<number>(6);
  const [pattern, setPattern] = useState<'100x100' | '75x75' | 'custom'>('100x100');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResponse | null>(null);

  // ---- Backend base URL (Render) ----
  const apiBase = useMemo(
    () =>
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_FORGE_API ||
      process.env.NEXT_PUBLIC_STL_API ||
      process.env.NEXT_PUBLIC_STL_SERVICE_URL ||
      '',
    []
  );

  async function handleGenerate() {
    if (!apiBase) {
      setResult({ status: 'error', message: 'Falta NEXT_PUBLIC_BACKEND_URL (o FORGE_API/STL_API/STL_SERVICE_URL)' });
      return;
    }

    setLoading(true);
    setResult(null);

    // Construimos el payload para el backend
    // El backend acepta "vesa" o "vesa-adapter"; mantenemos "vesa-adapter" para que coincida con el nombre de archivo
    const payload = {
      order_id: 'test-order-123', // opcional, te sirve para logging
      model,                       // "vesa-adapter"
      params: {
        width,
        height,
        thickness,
        pattern,
      },
      license: 'personal',         // placeholder hasta que integres Stripe
    };

    try {
      const res = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Si el backend devuelve 4xx/5xx, intentamos leer el json igualmente
      let json: ForgeResponse;
      try {
        json = (await res.json()) as ForgeResponse;
      } catch {
        json = { status: 'error', message: `HTTP ${res.status}` };
      }

      setResult(json);
    } catch (err: any) {
      setResult({ status: 'error', message: err?.message || 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Teknovashop Forge</h1>

      {/* Configurador mínimo */}
      <div
        style={{
          display: 'grid',
          gap: 12,
          maxWidth: 520,
          padding: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fafafa',
          marginBottom: 20,
        }}
      >
        {/* Modelo */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Modelo</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as 'vesa-adapter')}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
          >
            <option value="vesa-adapter">VESA Adapter</option>
            {/* en el futuro: router-mount, cable-tray, etc. */}
          </select>
        </label>

        {/* Width */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>
            Ancho (mm): <b>{width}</b>
          </span>
          <input
            type="range"
            min={60}
            max={300}
            step={5}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>

        {/* Height */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>
            Alto (mm): <b>{height}</b>
          </span>
          <input
            type="range"
            min={60}
            max={300}
            step={5}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </label>

        {/* Thickness */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>
            Espesor (mm): <b>{thickness}</b>
          </span>
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
          />
        </label>

        {/* Pattern (simple select por ahora) */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Patrón agujeros</span>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value as '100x100' | '75x75' | 'custom')}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
          >
            <option value="100x100">100 × 100 mm</option>
            <option value="75x75">75 × 75 mm</option>
            <option value="custom">Custom (lo agregaremos luego)</option>
          </select>
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #111827',
            background: loading ? '#e5e7eb' : '#111827',
            color: loading ? '#111827' : '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {loading ? 'Generando…' : 'Generar STL'}
        </button>
      </div>

      {/* Respuesta JSON para depuración */}
      <pre
        style={{
          marginTop: 12,
          padding: 16,
          background: '#f6f6f6',
          borderRadius: 8,
          overflow: 'auto',
          maxWidth: 900,
        }}
      >
        {JSON.stringify(result || {}, null, 2)}
      </pre>

      {/* Enlace de descarga si hay URL firmada */}
      {result && (result as any).stl_url && (
        <p style={{ marginTop: 12 }}>
          <a href={(result as any).stl_url} target="_blank" rel="noreferrer">
            Descargar STL (en Supabase)
          </a>
        </p>
      )}
    </main>
  );
}
