"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { forgeGenerate, DEFAULT_PARAMS, FIELDS } from "@/lib/forge-config";
import type { ForgeModelSlug } from "@/lib/forge-spec";

type TextMode = "engrave" | "emboss";
type Anchor = "front" | "back" | "left" | "right" | "top" | "bottom";
type Hole = { x: number; y: number; diameter_mm: number };

type ForgeFormProps = {
  initialModel?: string;
  initialParams?: any;
  onGenerated?: (url: string) => void;
};

type CatalogItem = { slug: string; label: string };

type CatalogProduct = {
  slug: string;
  name: string;
  version?: string;
  stage?: string;
  capabilities?: {
    text?: boolean;
    free_holes?: boolean;
  };
  defaults?: Record<string, number>;
};

type LastDesign = {
  designId?: string;
  productName?: string;
  version?: string;
  stage?: string;
  manifestUrl?: string;
  sha256?: string;
};

type AccessState = {
  loading: boolean;
  authenticated: boolean;
  hasAccess: boolean;
  plan?: string;
};

const CANONICAL: Record<string, string> = {
  "tablet-stand": "laptop-stand",
  "phone-dock": "phone-stand",
  "monitor-stand": "cable-tray",
};

const HIDE_SLUGS = new Set<string>(Object.keys(CANONICAL));

const NICE: Record<string, string> = {
  "vesa-adapter": "Adaptador VESA (2 patrones)",
  "router-mount": "Soporte de Router",
  "cable-tray": "Bandeja de Cables",
  "laptop-stand": "Soporte Laptop / Tablet",
  "phone-stand": "Soporte / Dock Móvil (USB-C)",
  "ssd-holder": "Caddy SSD 2.5 a 3.5",
  "raspi-case": "Caja Raspberry Pi 4 Model B",
  "go-pro-mount": "Soporte GoPro",
  "mic-arm-clip": "Clip Brazo Mic",
  "camera-plate": "Placa para Cámara",
  "wall-hook": "Colgador de Pared",
  "wall-bracket": "Escuadra de Pared",
  "cable-clip": "Clip de Cable",
  "hub-holder": "Soporte Hub USB",
  "headset-stand": "Soporte Auriculares",
  "vesa-shelf": "Bandeja VESA",
  "enclosure-ip65": "Caja técnica con tapa",
  "qr-plate": "Placa de identificación / Texto",
};

const DEFAULTS = {
  length_mm: 120,
  width_mm: 60,
  height_mm: 8,
  thickness_mm: 2.4,
  fillet_mm: 2,
};

function n(v: any, fb: number) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
}

function kebab(s?: string) {
  return (s || "").trim().toLowerCase().replace(/_/g, "-");
}

function canonicalize(s?: string) {
  const k = kebab(s);
  return CANONICAL[k] || k;
}

function humanizeParameter(key: string) {
  const explicit: Record<string, string> = {
    margin: "Margen",
    finger_h: "Altura dedos",
    hole_off: "Margen taladros",
    slot_w: "Ancho ranura",
    slot_d: "Fondo ranura",
  };
  if (explicit[key]) return explicit[key];

  return key
    .replace(/_mm$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function fallbackField(key: string, value: any) {
  const numeric = Number(value);
  return {
    label: humanizeParameter(key),
    type: "number",
    step: Number.isInteger(numeric) ? 1 : 0.1,
    defaultValue: Number.isFinite(numeric) ? numeric : 0,
  };
}

const FALLBACK_MODELS: CatalogItem[] = [
  "vesa-adapter",
  "router-mount",
  "cable-tray",
  "laptop-stand",
  "phone-stand",
  "ssd-holder",
  "raspi-case",
  "go-pro-mount",
  "mic-arm-clip",
  "camera-plate",
  "wall-hook",
  "wall-bracket",
  "cable-clip",
  "hub-holder",
  "headset-stand",
  "vesa-shelf",
  "enclosure-ip65",
  "qr-plate",
].map((slug) => ({
  slug,
  label:
    NICE[slug] ||
    slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
}));

export default function ForgeForm({
  initialModel,
  initialParams,
  onGenerated,
}: ForgeFormProps) {
  const searchParams = useSearchParams();
  const pendingBuyDesignId = searchParams.get("buy");
  const normalizedInitial = canonicalize(initialModel);

  const [catalog, setCatalog] = useState<CatalogItem[]>(
    [...FALLBACK_MODELS].sort((a, b) => a.label.localeCompare(b.label, "es"))
  );
  const [productMeta, setProductMeta] = useState<Record<string, CatalogProduct>>({});

  const [slug, setSlug] = useState<string>(() => {
    const found = FALLBACK_MODELS.find((m) => m.slug === normalizedInitial)?.slug;
    return found || "vesa-adapter";
  });

  const [modelParams, setModelParams] = useState<Record<string, any>>(() => ({
    ...((DEFAULT_PARAMS as any)[normalizedInitial || "vesa-adapter"] || {}),
    ...(initialParams || {}),
  }));

  useEffect(() => {
    (async () => {
      try {
        const base = (
          process.env.NEXT_PUBLIC_FORGE_API_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_FORGE_URL ||
          ""
        ).replace(/\/+$/, "");

        if (!base) return;

        const res = await fetch(`${base}/catalog/products`, { cache: "no-store" });
        if (!res.ok) return;

        const j: { products?: unknown } = await res.json();
        const products: CatalogProduct[] = Array.isArray(j?.products)
          ? (j.products as any[])
              .map((p) => ({
                slug: canonicalize(String(p?.slug || "")),
                name: String(p?.name || ""),
                version: p?.version ? String(p.version) : undefined,
                stage: p?.stage ? String(p.stage) : undefined,
                capabilities:
                  p?.capabilities && typeof p.capabilities === "object"
                    ? p.capabilities
                    : {},
                defaults:
                  p?.defaults && typeof p.defaults === "object"
                    ? p.defaults
                    : {},
              }))
              .filter((p) => !!p.slug)
          : [];

        if (!products.length) return;

        const meta = Object.fromEntries(products.map((p) => [p.slug, p]));
        const mapped: CatalogItem[] = products
          .map((p) => ({
            slug: p.slug,
            label: p.name || NICE[p.slug] || humanizeParameter(p.slug),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es"));

        setProductMeta(meta);
        setCatalog(mapped);
        setSlug((prev) => {
          const slugs = new Set(products.map((p) => p.slug));
          const prefer =
            normalizedInitial && slugs.has(normalizedInitial)
              ? normalizedInitial
              : prev;
          return slugs.has(prefer) ? prefer : mapped[0].slug;
        });
      } catch {
        // Mantener catálogo local como fallback.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [lengthMm, setLengthMm] = useState<number>(
    n(initialParams?.length_mm, DEFAULTS.length_mm)
  );
  const [widthMm, setWidthMm] = useState<number>(
    n(initialParams?.width_mm, DEFAULTS.width_mm)
  );
  const [heightMm, setHeightMm] = useState<number>(
    n(initialParams?.height_mm, DEFAULTS.height_mm)
  );
  const [thicknessMm, setThicknessMm] = useState<number>(
    n(initialParams?.thickness_mm, DEFAULTS.thickness_mm)
  );
  const [filletMm, setFilletMm] = useState<number>(
    n(initialParams?.fillet_mm, DEFAULTS.fillet_mm)
  );

  const modelSchema = useMemo(() => {
    const local = { ...(((FIELDS as any)[slug as ForgeModelSlug]) || {}) };
    const remoteDefaults = productMeta[slug]?.defaults || {};

    for (const [key, value] of Object.entries(remoteDefaults)) {
      if (local[key]) {
        local[key] = {
          ...local[key],
          defaultValue: value,
        };
      } else {
        local[key] = fallbackField(key, value);
      }
    }
    return local;
  }, [slug, productMeta]);

  const supportsFreeHoles =
    productMeta[slug]?.capabilities?.free_holes ?? slug === "qr-plate";

  useEffect(() => {
    const defaults = {
      ...(((DEFAULT_PARAMS as any)[slug]) || {}),
      ...(productMeta[slug]?.defaults || {}),
    };
    const schemaDefaults = Object.fromEntries(
      Object.entries(modelSchema).map(([key, cfg]: [string, any]) => [key, cfg.defaultValue])
    );
    setModelParams({ ...schemaDefaults, ...defaults });
  }, [slug, modelSchema, productMeta]);

  const [text, setText] = useState<string>(initialParams?.text ?? "");
  const [textMode, setTextMode] = useState<TextMode>(
    (initialParams?.text_mode ?? "engrave") as TextMode
  );
  const [anchor, setAnchor] = useState<Anchor>("front");
  const [textSize, setTextSize] = useState<number>(8);
  const [textDepth, setTextDepth] = useState<number>(1.2);
  const [textX, setTextX] = useState<number>(10);
  const [textY, setTextY] = useState<number>(10);

  const [holes, setHoles] = useState<Hole[]>([]);
  const [bulk, setBulk] = useState("");

  const [dimensionsOpen, setDimensionsOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [holesOpen, setHolesOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [lastDesign, setLastDesign] = useState<LastDesign | null>(null);
  const [access, setAccess] = useState<AccessState>({
    loading: false,
    authenticated: false,
    hasAccess: false,
  });

  function resetDimensions() {
    if (Object.keys(modelSchema).length) {
      const defaults = {
      ...(((DEFAULT_PARAMS as any)[slug]) || {}),
      ...(productMeta[slug]?.defaults || {}),
    };
      const schemaDefaults = Object.fromEntries(
        Object.entries(modelSchema).map(([key, cfg]: [string, any]) => [key, cfg.defaultValue])
      );
      setModelParams({ ...schemaDefaults, ...defaults });
      return;
    }
    setLengthMm(DEFAULTS.length_mm);
    setWidthMm(DEFAULTS.width_mm);
    setHeightMm(DEFAULTS.height_mm);
    setThicknessMm(DEFAULTS.thickness_mm);
    setFilletMm(DEFAULTS.fillet_mm);
  }

  function addHole() {
    setHoles((prev) => [...prev, { x: 0, y: 0, diameter_mm: 4 }]);
    setHolesOpen(true);
  }

  function updateHole(i: number, key: keyof Hole, val: number) {
    setHoles((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, [key]: val } : h))
    );
  }

  function removeHole(i: number) {
    setHoles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function clearHoles() {
    setHoles([]);
    setBulk("");
  }

  function importBulk() {
    const list = bulk
      .trim()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((triple) => triple.split(/[;,]/).map((s) => s.trim()))
      .filter((p) => p.length >= 3)
      .map(([xs, ys, ds]) => ({
        x: parseFloat(xs.replace(",", ".")),
        y: parseFloat(ys.replace(",", ".")),
        diameter_mm: parseFloat(ds.replace(",", ".")),
      }))
      .filter(
        (h) =>
          Number.isFinite(h.x) &&
          Number.isFinite(h.y) &&
          Number.isFinite(h.diameter_mm)
      );

    if (list.length) {
      setHoles(list);
      setFeedback({ type: "success", message: `${list.length} agujeros importados.` });
    } else {
      setFeedback({
        type: "error",
        message: "No se ha reconocido ningún agujero. Usa x,y,Ø separados por espacios.",
      });
    }
  }

  const params = useMemo(() => {
    if (Object.keys(modelSchema).length) {
      const out: Record<string, any> = {};
      for (const [key, cfg] of Object.entries(modelSchema) as Array<[string, any]>) {
        const raw = modelParams[key] ?? cfg.defaultValue;
        const value = Number(raw);
        out[key] = Number.isFinite(value) ? value : cfg.defaultValue;
      }
      return out;
    }

    const L = n(lengthMm, DEFAULTS.length_mm);
    const W = n(widthMm, DEFAULTS.width_mm);
    const H = n(heightMm, DEFAULTS.height_mm);
    const T = n(thicknessMm, DEFAULTS.thickness_mm);
    const Rraw = n(filletMm, DEFAULTS.fillet_mm);
    const R = Math.max(0, Math.min(Rraw, Math.min(L, W) * 0.25));

    return {
      length_mm: L,
      width_mm: W,
      height_mm: H,
      thickness_mm: T,
      fillet_mm: R,
    };
  }, [modelSchema, modelParams, lengthMm, widthMm, heightMm, thicknessMm, filletMm]);

  const text_ops = useMemo(() => {
    if (!text?.trim()) return undefined;

    return [
      {
        text: text.trim(),
        size: textSize,
        depth: textDepth,
        mode: textMode,
        anchor,
        pos: [textX, textY, 0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
      },
    ];
  }, [text, textMode, anchor, textSize, textDepth, textX, textY]);

  async function refreshAccess(designId: string) {
    if (!designId) return;
    setAccess((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch(
        `/api/entitlements?design_id=${encodeURIComponent(designId)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));

      setAccess({
        loading: false,
        authenticated: !!data?.authenticated,
        hasAccess: !!data?.hasAccess,
        plan: data?.plan,
      });
    } catch {
      setAccess({
        loading: false,
        authenticated: false,
        hasAccess: false,
      });
    }
  }

  async function startOneoffPurchase(designId: string) {
    if (!designId) return;

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          price: "oneoff",
          design_id: designId,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && data?.login_url) {
        window.location.href = data.login_url;
        return;
      }

      if (!res.ok || !data?.url) {
        throw new Error(data?.detail || data?.error || "No se pudo iniciar el pago");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: e?.message || "No se pudo iniciar el pago",
      });
    }
  }

  useEffect(() => {
    if (!pendingBuyDesignId) return;
    void startOneoffPurchase(pendingBuyDesignId);
    // El parámetro ?buy= solo existe para reanudar una compra iniciada antes del login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBuyDesignId]);

  async function handleGenerate() {
    try {
      setLoading(true);
      setFeedback(null);
      setLastDesign(null);

      const finalSlug = canonicalize(slug);
      const model = finalSlug.replace(/-/g, "_");
      const payload = { slug: finalSlug, model, params, holes, text_ops };
      const data = await forgeGenerate(payload);
      const link = data?.signed_url || data?.url || "";

      if (!link) {
        setFeedback({
          type: "error",
          message: "El backend ha respondido, pero no ha devuelto una URL de STL.",
        });
        return;
      }

      onGenerated?.(link);
      setLastDesign({
        designId: data.design_id,
        productName: data.product_name,
        version: data.product_version,
        stage: data.product_stage,
        manifestUrl: data.manifest_signed_url,
        sha256: data.sha256,
      });

      if (data.design_id) {
        await refreshAccess(data.design_id);
      }

      setFeedback({
        type: "success",
        message: "Diseño generado correctamente. El visor se ha actualizado.",
      });
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: e?.message || "Error generando STL",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Configurador paramétrico
            </p>
            <h1 className="mt-1 text-lg font-semibold text-neutral-900">
              Teknovashop Forge
            </h1>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Define medidas reales y genera una pieza lista para impresión 3D.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            mm
          </span>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
            Modelo
          </label>
          <select
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setFeedback(null);
              setLastDesign(null);
              setHoles([]);
              setBulk("");
            }}
          >
            {catalog.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-neutral-200">
        <PanelSection
          title="Dimensiones"
          subtitle="Geometría principal de la pieza"
          open={dimensionsOpen}
          onToggle={() => setDimensionsOpen((v) => !v)}
          action={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetDimensions();
              }}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900"
            >
              Restablecer
            </button>
          }
        >
          {Object.keys(modelSchema).length ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(modelSchema).map(([key, cfg]: [string, any]) => (
                  <ModelMetricField
                    key={key}
                    label={cfg.label}
                    value={Number(modelParams[key] ?? cfg.defaultValue)}
                    step={cfg.step}
                    min={cfg.min}
                    max={cfg.max}
                    onChange={(value) =>
                      setModelParams((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] leading-5 text-neutral-500">
                {Object.keys(modelSchema).length} parámetros específicos para {NICE[slug] || slug}.
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MetricField label="Largo" value={lengthMm} onChange={setLengthMm} />
                <MetricField label="Ancho" value={widthMm} onChange={setWidthMm} />
                <MetricField label="Altura" value={heightMm} onChange={setHeightMm} />
                <MetricField
                  label="Espesor"
                  value={thicknessMm}
                  onChange={setThicknessMm}
                  step={0.1}
                />
                <MetricField
                  label="Redondeo"
                  value={filletMm}
                  onChange={setFilletMm}
                  step={0.1}
                />
              </div>

              <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] leading-5 text-neutral-500">
                Volumen de referencia: {params.length_mm} × {params.width_mm} ×{" "}
                {params.height_mm} mm · espesor {params.thickness_mm} mm
              </div>
            </>
          )}
        </PanelSection>

        <PanelSection
          title="Texto"
          subtitle={text.trim() ? `“${text.trim()}” · ${textMode === "engrave" ? "grabado" : "relieve"}` : "Grabado o relieve opcional"}
          open={textOpen}
          onToggle={() => setTextOpen((v) => !v)}
        >
          <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
            Contenido
          </label>
          <input
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej.: VESA, Oficina, M4..."
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <SelectField
              label="Acabado"
              value={textMode}
              onChange={(v) => setTextMode(v as TextMode)}
              options={[
                ["engrave", "Grabado"],
                ["emboss", "Relieve"],
              ]}
            />
            <SelectField
              label="Cara"
              value={anchor}
              onChange={(v) => setAnchor(v as Anchor)}
              options={[
                ["front", "Frente"],
                ["back", "Dorso"],
                ["left", "Izquierda"],
                ["right", "Derecha"],
                ["top", "Arriba"],
                ["bottom", "Abajo"],
              ]}
            />

            <MetricField label="Tamaño" value={textSize} onChange={setTextSize} step={0.5} />
            <MetricField label="Profundidad" value={textDepth} onChange={setTextDepth} step={0.1} />
            <MetricField label="Posición X" value={textX} onChange={setTextX} step={0.5} />
            <MetricField label="Posición Y" value={textY} onChange={setTextY} step={0.5} />
          </div>
        </PanelSection>

        {supportsFreeHoles && (
        <PanelSection
          title="Agujeros"
          subtitle={
            holes.length
              ? `${holes.length} ${holes.length === 1 ? "agujero definido" : "agujeros definidos"}`
              : "Sin perforaciones adicionales"
          }
          open={holesOpen}
          onToggle={() => setHolesOpen((v) => !v)}
          action={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addHole();
              }}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              + Añadir
            </button>
          }
        >
          {holes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center">
              <p className="text-xs font-medium text-neutral-700">Sin agujeros personalizados</p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                Añádelos manualmente o pega varias coordenadas de una vez.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {holes.map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-600">
                      Agujero #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHole(i)}
                      className="text-[11px] font-medium text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <CompactMetricField
                      label="X"
                      value={h.x}
                      onChange={(v) => updateHole(i, "x", v)}
                    />
                    <CompactMetricField
                      label="Y"
                      value={h.y}
                      onChange={(v) => updateHole(i, "y", v)}
                    />
                    <CompactMetricField
                      label="Ø"
                      value={h.diameter_mm}
                      onChange={(v) => updateHole(i, "diameter_mm", v)}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={clearHoles}
                className="text-[11px] font-medium text-neutral-500 hover:text-red-600"
              >
                Limpiar todos
              </button>
            </div>
          )}

          <div className="mt-3 border-t border-neutral-200 pt-3">
            <label className="mb-1.5 block text-[11px] font-semibold text-neutral-600">
              Pegado rápido
            </label>
            <p className="mb-2 text-[10px] leading-4 text-neutral-500">
              Formato: <code>x,y,Ø x,y,Ø</code>. Ejemplo:{" "}
              <code>5,5,5 30,5,3.2</code>
            </p>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="5,5,5 30,5,3.2"
              />
              <button
                type="button"
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                onClick={importBulk}
              >
                Importar
              </button>
            </div>
          </div>
        </PanelSection>
        )}
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 p-4">
        {feedback && (
          <div
            className={`mb-3 rounded-xl border px-3 py-2 text-xs leading-5 ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {lastDesign?.designId && (
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Diseño trazable
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-neutral-900">
                  {lastDesign.productName || NICE[slug] || slug}
                  {lastDesign.version ? ` · v${lastDesign.version}` : ""}
                </div>
                <div className="mt-1 font-mono text-[10px] text-neutral-600">
                  ID {lastDesign.designId}
                </div>
                {lastDesign.sha256 && (
                  <div
                    className="mt-0.5 truncate font-mono text-[9px] text-neutral-500"
                    title={lastDesign.sha256}
                  >
                    SHA-256 {lastDesign.sha256}
                  </div>
                )}
              </div>
              {lastDesign.manifestUrl && (
                <a
                  href={lastDesign.manifestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Ficha técnica
                </a>
              )}
            </div>

            <div className="mt-3 border-t border-blue-200/70 pt-3">
              {access.loading ? (
                <div className="text-[11px] text-neutral-500">
                  Comprobando licencia…
                </div>
              ) : access.hasAccess ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-emerald-700">
                    Licencia activa{access.plan ? ` · ${access.plan}` : ""}
                  </div>
                  <a
                    href={`/api/download/${encodeURIComponent(lastDesign.designId)}`}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  >
                    Descargar paquete
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] leading-4 text-neutral-600">
                    Compra esta configuración concreta o usa una suscripción activa.
                  </div>
                  <button
                    type="button"
                    onClick={() => startOneoffPurchase(lastDesign.designId!)}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-700"
                  >
                    Comprar pieza
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Generando STL...
            </>
          ) : (
            "Generar y actualizar visor"
          )}
        </button>

        <p className="mt-2 text-center text-[10px] text-neutral-500">
          El STL se genera en milímetros y se muestra a escala en el visor.
        </p>
      </div>
    </aside>
  );
}

function PanelSection({
  title,
  subtitle,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-xs text-neutral-500 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-neutral-900">{title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
            {subtitle}
          </span>
        </span>
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
      </button>

      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

function MetricField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-neutral-600">
        {label}
      </span>
      <span className="flex overflow-hidden rounded-xl border border-neutral-300 bg-white transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          step={step}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none"
          value={Number.isFinite(value as any) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="flex items-center border-l border-neutral-200 bg-neutral-50 px-2 text-[10px] font-medium text-neutral-500">
          mm
        </span>
      </span>
    </label>
  );
}

function ModelMetricField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const unit = label.includes("°")
    ? "°"
    : /Nº|número|refuerzos/i.test(label)
      ? ""
      : "mm";

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-neutral-600">
        {label.replace(/\s*\((mm|°)\)\s*$/i, "")}
      </span>
      <span className="flex overflow-hidden rounded-xl border border-neutral-300 bg-white transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        {unit && (
          <span className="flex items-center border-l border-neutral-200 bg-neutral-50 px-2 text-[10px] font-medium text-neutral-500">
            {unit}
          </span>
        )}
      </span>
    </label>
  );
}

function CompactMetricField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-neutral-500">{label}</span>
      <span className="flex overflow-hidden rounded-lg border border-neutral-300 bg-white">
        <input
          type="number"
          step="any"
          className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
          value={Number.isFinite(value as any) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="flex items-center bg-neutral-50 px-1.5 text-[9px] text-neutral-400">
          mm
        </span>
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-neutral-600">
        {label}
      </span>
      <select
        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
