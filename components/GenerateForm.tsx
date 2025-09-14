'use client';

import React, { useMemo, useState } from 'react';
import STLViewer from './STLViewer';

type BackendResponse =
  | { status: 'ok'; stl_url: string; meta?: any }
  | { status: 'error'; detail?: string; message?: string };

const BACKEND =
  process.env.NEXT_PUBLIC_FORGE_BACKEND ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://<TU-RENDER-O-BACKEND>/'; // termina sin /; ajusta si quieres

type VesaParams = { width: number; height: number; thickness: number; pattern: string };
type RouterParams = { width: number; height: number; depth: number; thickness: number };
type CableParams = { width: number; height: number; length: number; thickness: number; slots: boolean };

type ModelKey = 'vesa-adapter' | 'router-mount' | 'cable-tray';

export default function GenerateForm() {
  const [model, setModel] = useState<ModelKey>('vesa-adapter');

  // params por modelo
  const [vesa, setVesa] = useState<VesaParams>({ width: 180, height: 180, thickness: 6, pattern: '100x100' });
  const [router, setRouter] = useState<RouterParams>({ width: 160, height: 220, depth: 40, thickness: 4 });
  const [cable, setCable] = useState<CableParams>({ width: 60, height: 25, length: 180, thickness: 3, slots: true });

  const [busy, setBusy] = useState(false);
  const [jsonOut, setJsonOut] = useState<string>('');
  const [stlUrl, setStlUrl] = useState<string>('');

  const paramBlock = useMemo(() => {
    if (model === 'vesa-adapter') {
      return (
        <>
          <label className="block mt-3 font-medium">Ancho (mm): {vesa.width}</label>
          <input type="range" min={80} max={300} value={vesa.width}
            onChange={(e) => setVesa({ ...vesa, width: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Alto (mm): {vesa.height}</label>
          <input type="range" min={80} max={300} value={vesa.height}
            onChange={(e) => setVesa({ ...vesa, height: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Espesor (mm): {vesa.thickness}</label>
          <input type="range" min={3} max={16} value={vesa.thickness}
            onChange={(e) => setVesa({ ...vesa, thickness: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Patrón agujeros</label>
          <select
            value={vesa.pattern}
            onChange={(e) => setVesa({ ...vesa, pattern: e.target.value })}
            className="border rounded px-2 py-1"
          >
            <option value="75x75">75 × 75 mm</option>
            <option value="100x100">100 × 100 mm</option>
            <option value="100x200">100 × 200 mm</option>
            <option value="200x200">200 × 200 mm</option>
          </select>
        </>
      );
    }

    if (model === 'router-mount') {
      return (
        <>
          <label className="block mt-3 font-medium">Ancho base (mm): {router.width}</label>
          <input type="range" min={100} max={300} value={router.width}
            onChange={(e) => setRouter({ ...router, width: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Alto base (mm): {router.height}</label>
          <input type="range" min={120} max={400} value={router.height}
            onChange={(e) => setRouter({ ...router, height: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Fondo (mm): {router.depth}</label>
          <input type="range" min={20} max={120} value={router.depth}
            onChange={(e) => setRouter({ ...router, depth: +e.target.value })} className="w-full" />

          <label className="block mt-3 font-medium">Espesor (mm): {router.thickness}</label>
          <input type="range" min={3} max={12} value={router.thickness}
            onChange={(e) => setRouter({ ...router, thickness: +e.target.value })} className="w-full" />
        </>
      );
    }

    // cable-tray
    return (
      <>
        <label className="block mt-3 font-medium">Ancho (mm): {cable.width}</label>
        <input type="range" min={30} max={120} value={cable.width}
          onChange={(e) => setCable({ ...cable, width: +e.target.value })} className="w-full" />

        <label className="block mt-3 font-medium">Alto (mm): {cable.height}</label>
        <input type="range" min={15} max={60} value={cable.height}
          onChange={(e) => setCable({ ...cable, height: +e.target.value })} className="w-full" />

        <label className="block mt-3 font-medium">Longitud (mm): {cable.length}</label>
        <input type="range" min={80} max={400} value={cable.length}
          onChange={(e) => setCable({ ...cable, length: +e.target.value })} className="w-full" />

        <label className="block mt-3 font-medium">Espesor (mm): {cable.thickness}</label>
        <input type="range" min={2} max={10} value={cable.thickness}
          onChange={(e) => setCable({ ...cable, thickness: +e.target.value })} className="w-full" />

        <label className="inline-flex items-center gap-2 mt-3">
          <input type="checkbox" checked={cable.slots}
            onChange={(e) => setCable({ ...cable, slots: e.target.checked })} />
          Con ranuras de ventilación
        </label>
      </>
    );
  }, [model, vesa, router, cable]);

  async function handleGenerate() {
    setBusy(true);
    setJsonOut('');
    setStlUrl('');

    const params =
      model === 'vesa-adapter' ? vesa :
      model === 'router-mount' ? router :
      cable;

    try {
      const res = await fetch(`${BACKEND.replace(/\/$/,'')}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          params,
          license: 'personal',
          order_id: '',
        }),
      });

      const json = (await res.json()) as BackendResponse;
      setJsonOut(JSON.stringify(json, null, 2));
      if ((json as any)?.status === 'ok' && (json as any)?.stl_url) {
        setStlUrl((json as any).stl_url);
      }
    } catch (err: any) {
      setJsonOut(JSON.stringify({ status: 'error', message: err?.message || String(err) }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <label className="block font-medium">Modelo</label>
      <select
        className="border rounded px-2 py-1"
        value={model}
        onChange={(e) => setModel(e.target.value as ModelKey)}
      >
        <option value="vesa-adapter">VESA Adapter</option>
        <option value="router-mount">Router Mount</option>
        <option value="cable-tray">Cable Tray</option>
      </select>

      {paramBlock}

      <button
        disabled={busy}
        onClick={handleGenerate}
        className="mt-6 w-full rounded-lg bg-slate-900 text-white py-3 disabled:opacity-60"
      >
        {busy ? 'Generando…' : 'Generar STL'}
      </button>

      {jsonOut && (
        <>
          <pre className="mt-4 p-3 bg-gray-50 rounded border overflow-auto text-sm">{jsonOut}</pre>
          {stlUrl && (
            <a
              href={stlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline inline-block mt-2"
            >
              Descargar STL (en Supabase)
            </a>
          )}
          {stlUrl && (
            <div className="mt-4">
              <STLViewer url={stlUrl} height={420} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
