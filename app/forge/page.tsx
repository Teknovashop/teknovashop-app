// teknovashop-app/app/forge/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { generateSTL } from "@/lib/api";
import type {
  GenerateResponse,
  ModelKind,
  CableTrayPayload,
  VesaAdapterPayload,
  RouterMountPayload,
  ForgePayload,
} from "@/types/forge";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Plan = "oneoff" | "maker" | "commercial";

export default function ForgePage() {
  // ------------ modelo activo ------------
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // ------------ parámetros ------------
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  const [vesa, setVesa] = useState(100);
  const [vesaThk, setVesaThk] = useState(4);
  const [vesaClear, setVesaClear] = useState(1);
  const [vesaHole, setVesaHole] = useState(5);

  const [rWidth, setRWidth] = useState(120);
  const [rDepth, setRDepth] = useState(80);
  const [rThk, setRThk] = useState(4);
  const [rSlots, setRSlots] = useState(true);
  const [rHole, setRHole] = useState(4);

  // ------------ estado petición ------------
  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Visor
  const [viewMode, setViewMode] = useState<"preview" | "stl">("preview");
  const [modelColor, setModelColor] = useState<string>("#3f444c");
  const [quality, setQuality] = useState<"high" | "low">("high");

  // Compra
  const [email, setEmail] = useState<string>("");
  const [plan, setPlan] = useState<Plan>("oneoff");

  const stlUrl = useMemo(
    () => (result?.status === "ok" ? (result as any).stl_url : undefined),
    [result]
  );

  const preview = useMemo(() => {
    if (model === "cable_tray") {
      return {
        kind: "cable_tray",
        params: {
          width_mm: width,
          height_mm: height,
          length_mm: length,
          thickness_mm: thickness,
          ventilated,
        },
      } as const;
    }
    if (model === "vesa_adapter") {
      return {
        kind: "vesa_adapter",
        params: {
          vesa_mm: vesa,
          thickness_mm: vesaThk,
          clearance_mm: vesaClear,
        },
      } as const;
    }
    return {
      kind: "router_mount",
      params: {
        router_width_mm: rWidth,
        router_depth_mm: rDepth,
        thickness_mm: rThk,
      },
    } as const;
  }, [
    model,
    width,
    height,
    length,
    thickness,
    ventilated,
    vesa,
    vesaThk,
    vesaClear,
    rWidth,
    rDepth,
    rThk,
  ]);

  const applyPreset = (k: "S" | "M" | "L") => {
    if (k === "S") {
      setWidth(40);
      setHeight(20);
      setLength(120);
      setThickness(2);
    } else if (k === "M") {
      setWidth(60);
      setHeight(25);
      setLength(180);
      setThickness(3);
    } else {
      setWidth(80);
      setHeight(35);
      setLength(240);
      setThickness(4);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);
    try {
      let payload: ForgePayload;
      if (model === "cable_tray") {
        payload = {
          model: "cable_tray",
          width_mm: clamp(width, 10, 500),
          height_mm: clamp(height, 5, 300),
          length_mm: clamp(length, 30, 2000),
          thickness_mm: clamp(thickness, 1, 20),
          ventilated,
        } satisfies CableTrayPayload;
      } else if (model === "vesa_adapter") {
        payload = {
          model: "vesa_adapter",
          vesa_mm: clamp(vesa, 50, 400),
          thickness_mm: clamp(vesaThk, 2, 10),
          hole_diameter_mm: clamp(vesaHole, 3, 10),
          clearance_mm: clamp(vesaClear, 0, 5),
        } satisfies VesaAdapterPayload;
      } else {
        payload = {
          model: "router_mount",
          router_width_mm: clamp(rWidth, 50, 400),
          router_depth_mm: clamp(rDepth, 30, 300),
          thickness_mm: clamp(rThk, 2, 10),
          strap_slots: rSlots,
          hole_diameter_mm: clamp(rHole, 3, 10),
        } satisfies RouterMountPayload;
      }

      const res = await generateSTL(payload);
      setResult(res);
      setJsonOpen(true);
    } catch (e: any) {
      alert(`Error inesperado: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  async function handleCheckout() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Introduce un email válido para la licencia/recibo.");
      return;
    }
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          price: plan, // "oneoff" | "maker" | "commercial"
          model_kind: model,
          params: preview?.params || {},
          object_key: null,
        }),
      }).then((r) => r.json());
      if (res?.url) window.location.href = res.url;
      else alert(res?.error || "No se pudo crear la sesión de pago");
    } catch (e: any) {
      alert(e?.message || "Error creando la sesión de pago");
    }
  }

  const copyLink = async () => {
    if (!stlUrl) return;
    try {
      await navigator.clipboard.writeText(stlUrl);
      alert("Enlace copiado ✅");
    } catch {
      alert("No se pudo copiar el enlace");
    }
  };

  const Label = (p: { children: React.ReactNode }) => (
    <label className="block text-sm text-gray-700">{p.children}</label>
  );
  const Number = (p: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <input
      type="number"
      value={p.value}
      min={p.min}
      max={p.max}
      step={p.step ?? 1}
      onChange={(e) => p.onChange(parseFloat(e.target.value))}
      className="w-28 rounded-lg border px-2 py-1 text-sm"
    />
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">
            Teknovashop Forge
          </div>
          <nav className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Inicio
            </a>
            <a
              href="https://github.com/Teknovashop/teknovashop-app"
              target="_blank"
              className="text-sm text-gray-600 hover:text-gray-900"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px,1fr]">
          {/* Panel de configuración */}
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {/* tabs */}
            <div className="mb-4 flex gap-2">
              {[
                { id: "cable_tray", label: "Cable Tray" },
                { id: "vesa_adapter", label: "VESA Adapter" },
                { id: "router_mount", label: "Router Mount" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModel(t.id as ModelKind)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    model === t.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* parámetros */}
            {model === "cable_tray" && (
              <>
                <div className="flex gap-2">
                  {["S", "M", "L"].map((k) => (
                    <button
                      key={k}
                      onClick={() => applyPreset(k as any)}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Ancho (mm)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={500}
                        value={width}
                        onChange={(e) => setWidth(+e.target.value)}
                        className="w-full"
                      />
                      <span className="w-12 text-right tabular-nums">
                        {width}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Alto (mm)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={300}
                        value={height}
                        onChange={(e) => setHeight(+e.target.value)}
                        className="w-full"
                      />
                      <span className="w-12 text-right tabular-nums">
                        {height}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Longitud (mm)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={30}
                        max={2000}
                        value={length}
                        onChange={(e) => setLength(+e.target.value)}
                        className="w-full"
                      />
                      <span className="w-12 text-right tabular-nums">
                        {length}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Espesor (mm)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={thickness}
                        onChange={(e) => setThickness(+e.target.value)}
                        className="w-full"
                      />
                      <span className="w-12 text-right tabular-nums">
                        {thickness}
                      </span>
                    </div>
                  </div>
                  <label className="inline-flex select-none items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ventilated}
                      onChange={(e) => setVentilated(e.target.checked)}
                    />
                    Con ranuras de ventilación
                  </label>
                </div>
              </>
            )}

            {model === "vesa_adapter" && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Tamaño VESA (mm)</Label>
                  <Number
                    value={vesa}
                    onChange={setVesa}
                    min={50}
                    max={400}
                    step={25}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Espesor (mm)</Label>
                  <Number value={vesaThk} onChange={setVesaThk} min={2} max={10} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Holgura adicional (mm)</Label>
                  <Number
                    value={vesaClear}
                    onChange={setVesaClear}
                    min={0}
                    max={5}
                    step={0.5}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ø agujero (mm)</Label>
                  <Number
                    value={vesaHole}
                    onChange={setVesaHole}
                    min={3}
                    max={10}
                    step={0.5}
                  />
                </div>
                <p className="pt-1 text-xs text-gray-500">
                  Preview: placa con agujeros en patrón VESA.
                </p>
              </div>
            )}

            {model === "router_mount" && (
              <div className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Ancho router (mm)</Label>
                  <Number value={rWidth} onChange={setRWidth} min={50} max={400} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Fondo router (mm)</Label>
                  <Number value={rDepth} onChange={setRDepth} min={30} max={300} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Espesor (mm)</Label>
                  <Number value={rThk} onChange={setRThk} min={2} max={10} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ø agujero anclaje (mm)</Label>
                  <Number value={rHole} onChange={setRHole} min={3} max={8} step={0.5} />
                </div>
                <label className="inline-flex select-none items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rSlots}
                    onChange={(e) => setRSlots(e.target.checked)}
                  />
                  Ranuras para bridas/velcro
                </label>
                <p className="pt-1 text-xs text-gray-500">
                  Preview: escuadra en L básica.
                </p>
              </div>
            )}

            {/* Compra */}
            <div className="mt-6 space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Email (licencia / recibo)</Label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label>Plan</Label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as Plan)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="oneoff">STL individual</option>
                    <option value="maker">Suscripción Maker (mensual)</option>
                    <option value="commercial">Licencia Comercial (mensual)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckout}
                  className="flex-1 rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Comprar con Stripe
                </button>
                <div className="hidden text-xs text-gray-500 sm:block">
                  IVA automático con Stripe Tax
                </div>
              </div>
            </div>

            {/* acciones */}
            <div className="mt-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border p-2">
                  <Label>Color</Label>
                  <input
                    type="color"
                    value={modelColor}
                    onChange={(e) => setModelColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-2">
                  <Label>Calidad</Label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as "high" | "low")}
                    className="rounded-lg border px-2 py-1 text-sm"
                  >
                    <option value="high">Alta (sombras)</option>
                    <option value="low">Rápida</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-60"
              >
                {busy ? "Generando…" : "Generar STL"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={stlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-xl border px-3 py-2 text-center text-sm ${
                    stlUrl ? "hover:bg-gray-50" : "pointer-events-none opacity-50"
                  }`}
                >
                  Descargar STL
                </a>
                <button
                  onClick={copyLink}
                  disabled={!stlUrl}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Copiar enlace
                </button>
              </div>

              <details
                open={jsonOpen}
                onToggle={(e) =>
                  setJsonOpen((e.target as HTMLDetailsElement).open)
                }
                className="mt-2"
              >
                <summary className="cursor-pointer text-sm text-gray-700">
                  Ver respuesta JSON
                </summary>
                <textarea
                  readOnly
                  value={JSON.stringify(result ?? {}, null, 2)}
                  className="mt-2 h-40 w-full rounded-xl border p-2 font-mono text-xs"
                />
              </details>
            </div>
          </section>

          {/* Visor */}
          <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setViewMode("preview")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === "preview"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Vista: Preview
              </button>
              <button
                onClick={() => setViewMode("stl")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === "stl"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={!stlUrl}
              >
                Vista: STL generado
              </button>
            </div>

            <div className="rounded-xl border border-gray-200">
              <STLViewer
                url={stlUrl}
                preview={preview as any}
                mode={viewMode}
                height={560}
                background="#ffffff"
                modelColor={modelColor}
                quality={quality}
                watermark="Teknovashop FORGE · ©"
              />
            </div>
            <p className="px-2 py-2 text-xs text-gray-500">
              Arrastra para rotar · Rueda para zoom · <kbd>Shift</kbd>+arrastrar
              para pan
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
