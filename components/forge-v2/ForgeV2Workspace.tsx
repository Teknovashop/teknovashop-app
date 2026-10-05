"use client";

import Link from "next/link";
import ForgeV2ProductRail from "@/components/forge-v2/ForgeV2ProductRail";
import { useEffect, useMemo, useRef, useState } from "react";
import STLViewerPro from "@/components/STLViewerPro";
import { DEFAULT_PARAMS, FIELDS } from "@/lib/forge-config";
import { isCadV2Product } from "@/lib/forge-v2/cad-products";
import { isCadV2Enclosure } from "@/lib/forge-v2/cad-enclosures";
import {
  FORGE_V2_PILOTS,
  forgeV2Capabilities,
} from "@/lib/forge-v2/capabilities";
import {
  createOperationId,
  type ForgeV2Operation,
  type ForgeV2OperationType,
} from "@/lib/forge-v2/spec";

type OpKind =
  | "hole"
  | "slot"
  | "cutout_rect"
  | "cutout_circle"
  | "counterbore"
  | "pocket_rect"
  | "hole_pattern"
  | "vesa_pattern"
  | "vent_linear"
  | "vent_hex"
  | "scallop_pattern"
  | "cable_channel"
  | "rib"
  | "boss"
  | "wave_ribs";

type Params = Record<string, number | string | boolean>;

type CloudDraft = {
  id: string;
  name: string;
  product_slug: string;
  params: Params;
  operations: ForgeV2Operation[];
  text_ops?: Array<{
    text?: string;
    mode?: "engrave" | "emboss";
    size?: number;
    depth?: number;
    pos?: [number, number, number];
    anchor?: "top" | "bottom";
  }>;
  updated_at: string;
};

const LABELS: Record<OpKind, string> = {
  hole: "Agujero",
  slot: "Ranura",
  cutout_rect: "Corte rectangular",
  cutout_circle: "Corte circular",
  counterbore: "Agujero con rebaje",
  pocket_rect: "Rebaje rectangular",
  hole_pattern: "Patrón de agujeros",
  vesa_pattern: "Patrón VESA",
  vent_linear: "Ventilación lineal",
  vent_hex: "Rejilla hexagonal",
  scallop_pattern: "Patrón de muescas",
  cable_channel: "Canal de cable",
  rib: "Refuerzo",
  boss: "Boss cilíndrico",
  wave_ribs: "Ondulación estructural",
};

const PRESETS: Record<string, Array<{ name: string; copy: string; params: Params }>> = {
  "cable-tray": [
    { name: "Minimal", copy: "Compacta y ligera", params: { width: 180, depth: 60, height: 40, wall: 3 } },
    { name: "Office", copy: "Equilibrada para escritorio", params: { width: 220, depth: 80, height: 50, wall: 4 } },
    { name: "Heavy", copy: "Más volumen y pared", params: { width: 280, depth: 95, height: 60, wall: 5 } },
  ],
  "vesa-adapter": [
    { name: "75 → 100", copy: "Adaptación habitual", params: { width: 120, height: 120, thickness: 5, pattern_from: 75, pattern_to: 100, hole_d: 5 } },
    { name: "100 → 200", copy: "Placa reforzada", params: { width: 220, height: 220, thickness: 6, pattern_from: 100, pattern_to: 200, hole_d: 5 } },
  ],
  "enclosure-ip65": [
    { name: "Compact", copy: "Electrónica pequeña", params: { length: 100, width: 60, height: 38, wall: 3, lid_thickness: 3, lid_gap: 2 } },
    { name: "Standard", copy: "Uso general", params: { length: 120, width: 68, height: 45, wall: 3, lid_thickness: 3, lid_gap: 2 } },
    { name: "Workshop", copy: "Más espacio interior", params: { length: 160, width: 90, height: 60, wall: 4, lid_thickness: 4, lid_gap: 2 } },
  ],

};

function humanizeParam(key: string) {
  return key
    .replace(/_mm$/i, "")
    .replace(/_deg$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function genericFieldsFromDefaults(defaults: Params) {
  return Object.fromEntries(
    Object.entries(defaults)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => {
        const numeric = Number(value);
        const isCount = /(count|rows|cols|rib_count)$/i.test(key);
        const isAngle = /deg|angle/i.test(key);
        const unit = isAngle ? "°" : isCount ? "" : "mm";
        const magnitude = Math.max(Math.abs(numeric), 1);
        return [
          key,
          {
            label: humanizeParam(key),
            min: isAngle ? 0 : 0,
            max: isAngle ? 180 : Math.max(20, Math.ceil(magnitude * 4)),
            step: isCount ? 1 : isAngle ? 1 : 0.5,
            defaultValue: numeric,
            unit,
          },
        ];
      })
  );
}

function defaultOperation(type: OpKind): ForgeV2Operation {
  const base = {
    id: createOperationId(),
    type: type as ForgeV2OperationType,
    version: 1 as const,
    enabled: true,
    target: { face: "top" as const },
    placement: { x: 0, y: 0, rotation_deg: 0 },
  };

  switch (type) {
    case "hole":
      return { ...base, params: { diameter_mm: 6 } };
    case "slot":
      return { ...base, params: { length_mm: 24, width_mm: 6 } };
    case "cutout_rect":
      return { ...base, params: { width_mm: 24, height_mm: 14 } };
    case "cutout_circle":
      return { ...base, params: { diameter_mm: 18 } };
    case "counterbore":
      return {
        ...base,
        params: {
          through_diameter_mm: 5,
          bore_diameter_mm: 10,
          bore_depth_mm: 2,
        },
      };
    case "pocket_rect":
      return { ...base, params: { width_mm: 28, height_mm: 18, depth_mm: 1.2 } };
    case "hole_pattern":
      return {
        ...base,
        params: {
          diameter_mm: 4,
          rows: 2,
          cols: 2,
          spacing_x_mm: 18,
          spacing_y_mm: 18,
        },
      };
    case "vesa_pattern":
      return { ...base, params: { pitch_mm: 75, diameter_mm: 5 } };
    case "vent_linear":
      return {
        ...base,
        params: { count: 5, length_mm: 32, width_mm: 3, spacing_mm: 7 },
      };
    case "vent_hex":
      return {
        ...base,
        params: { rows: 2, cols: 3, radius_mm: 3, gap_mm: 2 },
      };
    case "scallop_pattern":
      return {
        ...base,
        params: { count: 3, diameter_mm: 6, spacing_mm: 9 },
      };
    case "cable_channel":
      return { ...base, params: { length_mm: 28, width_mm: 7 } };
    case "rib":
      return { ...base, params: { length_mm: 30, width_mm: 4, height_mm: 4 } };
    case "boss":
      return { ...base, params: { diameter_mm: 14, height_mm: 4 } };
    case "wave_ribs":
      return {
        ...base,
        params: {
          length_mm: 36,
          rib_width_mm: 2,
          amplitude_mm: 4,
          count: 5,
          spacing_mm: 5,
        },
      };
  }
}

function ToolButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-bold transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
    >
      <span>{label}</span>
      <span className="text-cyan-300 transition group-hover:translate-x-0.5">＋</span>
    </button>
  );
}


function capabilitiesFromBackend(product: any, fallback: Record<string, any>) {
  const ops = new Set<string>(
    Array.isArray(product?.v2_capabilities) ? product.v2_capabilities : []
  );
  const vents: string[] = [];
  if (ops.has("vent_linear")) vents.push("linear");
  if (ops.has("vent_hex")) vents.push("hex");

  return {
    ...fallback,
    text: product?.capabilities?.text !== false,
    holes:
      ops.has("hole") ||
      ops.has("counterbore") ||
      ops.has("hole_pattern") ||
      undefined,
    slots: ops.has("slot") || undefined,
    cutouts:
      ops.has("cutout_rect") ||
      ops.has("cutout_circle") ||
      ops.has("pocket_rect") ||
      undefined,
    holePatterns: ops.has("hole_pattern") || undefined,
    cableChannels: ops.has("cable_channel") || undefined,
    vents: vents.length ? vents : undefined,
    waves:
      ops.has("wave_ribs") || ops.has("scallop_pattern") || undefined,
    ribs: ops.has("rib") || ops.has("boss") || undefined,
    mountingPatterns: ops.has("vesa_pattern") ? ["vesa"] : undefined,
  };
}

export default function ForgeV2Workspace({
  slug,
  premiumSurface = false,
}: {
  slug: string;
  premiumSurface?: boolean;
}) {
  const product = FORGE_V2_PILOTS[slug];
  const fallbackCapabilities = useMemo(() => forgeV2Capabilities(slug), [slug]);
  const [capabilities, setCapabilities] = useState<Record<string, any>>(
    fallbackCapabilities
  );
  const [catalogVariant, setCatalogVariant] = useState<Params>({});
  const staticFields = useMemo(
    () => ((FIELDS as unknown as Record<string, Record<string, any>>)[slug] || {}),
    [slug]
  );
  const staticBaseParams = useMemo(
    () => ({ ...((DEFAULT_PARAMS as unknown as Record<string, Params>)[slug] || {}) }),
    [slug]
  );

  const [fields, setFields] = useState<Record<string, any>>(staticFields);
  const [baseParams, setBaseParams] = useState<Params>(staticBaseParams);
  const [params, setParams] = useState<Params>(staticBaseParams);
  const [operations, setOperations] = useState<ForgeV2Operation[]>([]);
  const [history, setHistory] = useState<ForgeV2Operation[][]>([]);
  const [future, setFuture] = useState<ForgeV2Operation[][]>([]);
  const [issues, setIssues] = useState<
    Array<{ code: string; message: string; level: string }>
  >([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [textValue, setTextValue] = useState("");
  const [textMode, setTextMode] = useState<"engrave" | "emboss">("engrave");
  const [textAnchor, setTextAnchor] = useState<"top" | "bottom">("top");
  const [textSize, setTextSize] = useState(8);
  const [textDepth, setTextDepth] = useState(1.2);
  const [textX, setTextX] = useState(0);
  const [textY, setTextY] = useState(0);
  const [feedback, setFeedback] = useState(
    "Forge V2 Beta · tu flujo estable V1 permanece disponible"
  );
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<CloudDraft[]>([]);
  const [draftName, setDraftName] = useState("Mi diseño");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [placingId, setPlacingId] = useState<string | null>(null);
  const validationSeq = useRef(0);

  function currentTextOps() {
    return textValue.trim()
      ? [{
          text: textValue.trim().slice(0, 40),
          mode: textMode,
          size: textSize,
          depth: textDepth,
          pos: [textX, textY, 0] as [number, number, number],
          rot: [0, 0, 0] as [number, number, number],
          anchor: textAnchor,
        }]
      : [];
  }

  async function refreshDrafts() {
    try {
      const response = await fetch("/api/forge/v2/drafts", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      setDrafts(Array.isArray(data?.drafts) ? data.drafts : []);
    } catch {
      // Cloud drafts are optional and must never block geometry editing.
    }
  }

  useEffect(() => {
    void refreshDrafts();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCanonicalProduct() {
      try {
        const response = await fetch("/api/forge/v2/catalog", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const product = Array.isArray(data?.products)
          ? data.products.find((item: any) => item?.slug === slug)
          : null;
        if (!product || cancelled) return;

        const canonicalDefaults =
          product.defaults && typeof product.defaults === "object"
            ? (product.defaults as Params)
            : {};

        const nextBase = {
          ...canonicalDefaults,
          ...staticBaseParams,
        };
        const nextFields = Object.keys(staticFields).length
          ? staticFields
          : genericFieldsFromDefaults(canonicalDefaults);

        setBaseParams(nextBase);
        setFields(nextFields);
        setCatalogVariant(
          product.variant && typeof product.variant === "object"
            ? (product.variant as Params)
            : {}
        );
        setCapabilities(capabilitiesFromBackend(product, fallbackCapabilities));
        setParams((current) =>
          Object.keys(current).length ? { ...nextBase, ...current } : nextBase
        );
      } catch {
        // Static frontend metadata remains a safe fallback.
      }
    }

    void hydrateCanonicalProduct();
    return () => {
      cancelled = true;
    };
  }, [slug, staticBaseParams, staticFields, fallbackCapabilities]);

  async function saveDraft() {
    setDraftBusy(true);
    setDraftMessage("");
    try {
      const response = await fetch("/api/forge/v2/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          product_slug: slug,
          product_version: "1.0.0-beta.1",
          params,
          operations,
          text_ops: currentTextOps(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/forge-v2/" + slug)}`;
        return;
      }
      if (!response.ok) throw new Error(data?.error || "No se pudo guardar");
      setDraftMessage("Guardado en tu cuenta");
      await refreshDrafts();
    } catch (error: any) {
      setDraftMessage(error?.message || "No se pudo guardar");
    } finally {
      setDraftBusy(false);
    }
  }

  function loadDraft(draft: CloudDraft) {
    if (draft.product_slug !== slug) return;
    setParams({ ...baseParams, ...(draft.params || {}) });
    setOperations(Array.isArray(draft.operations) ? draft.operations : []);
    setHistory([]);
    setFuture([]);
    const text = draft.text_ops?.[0];
    setTextValue(String(text?.text || ""));
    setTextMode(text?.mode === "emboss" ? "emboss" : "engrave");
    setTextAnchor(text?.anchor === "bottom" ? "bottom" : "top");
    setTextSize(Number(text?.size || 8));
    setTextDepth(Number(text?.depth || 1.2));
    setTextX(Number(text?.pos?.[0] || 0));
    setTextY(Number(text?.pos?.[1] || 0));
    setDraftName(draft.name);
    setPreviewUrl(undefined);
    setDraftMessage("Borrador cargado · genera una nueva preview para validar");
  }

  function commit(next: ForgeV2Operation[]) {
    setHistory((items) => [...items.slice(-29), operations]);
    setFuture([]);
    setOperations(next);
  }

  function add(type: OpKind) {
    commit([...operations, defaultOperation(type)]);
  }

  function remove(id: string) {
    commit(operations.filter((op) => op.id !== id));
  }

  function duplicate(id: string) {
    const source = operations.find((op) => op.id === id);
    if (!source) return;
    const copy: ForgeV2Operation = {
      ...source,
      id: createOperationId(),
      placement: {
        ...(source.placement || {}),
        x: Number(source.placement?.x || 0) + 5,
      },
      params: { ...source.params },
    };
    const index = operations.findIndex((op) => op.id === id);
    const next = [...operations];
    next.splice(index + 1, 0, copy);
    commit(next);
  }

  function toggle(id: string) {
    commit(
      operations.map((op) =>
        op.id === id ? { ...op, enabled: !op.enabled } : op
      )
    );
  }

  function move(id: string, delta: number) {
    const index = operations.findIndex((op) => op.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= operations.length) return;
    const next = [...operations];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  }

  function undo() {
    const previous = history.length ? history[history.length - 1] : undefined;
    if (!previous) return;
    setFuture((items) => [operations, ...items].slice(0, 30));
    setOperations(previous);
    setHistory((items) => items.slice(0, -1));
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items.slice(-29), operations]);
    setOperations(next);
    setFuture((items) => items.slice(1));
  }

  function patchTarget(id: string, face: "top" | "bottom") {
    commit(
      operations.map((op) =>
        op.id === id
          ? { ...op, target: { ...(op.target || {}), face } }
          : op
      )
    );
  }

  function placeOperation(id: string, x: number, y: number) {
    commit(
      operations.map((op) =>
        op.id === id
          ? {
              ...op,
              placement: {
                ...(op.placement || {}),
                x: Number(x.toFixed(1)),
                y: Number(y.toFixed(1)),
              },
            }
          : op
      )
    );
    setPreviewUrl(undefined);
  }

  function patchPlacement(
    id: string,
    field: "x" | "y" | "rotation_deg",
    value: number
  ) {
    commit(
      operations.map((op) =>
        op.id === id
          ? {
              ...op,
              placement: { ...(op.placement || {}), [field]: value },
            }
          : op
      )
    );
  }

  function patchParam(id: string, key: string, value: number) {
    commit(
      operations.map((op) =>
        op.id === id
          ? { ...op, params: { ...op.params, [key]: value } }
          : op
      )
    );
  }

  function applyPreset(preset: { params: Params }) {
    setParams((current) => ({ ...current, ...preset.params }));
    setPreviewUrl(undefined);
    setFeedback("Preset aplicado · genera para validar la geometría final");
  }

  useEffect(() => {
    const seq = ++validationSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/forge/v2/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, params, operations }),
        });
        const data = await response.json().catch(() => ({}));
        if (seq !== validationSeq.current) return;
        setIssues(Array.isArray(data?.issues) ? data.issues : []);
      } catch {
        if (seq === validationSeq.current) {
          setIssues([
            {
              code: "validation",
              message: "Validación temporalmente no disponible",
              level: "warning",
            },
          ]);
        }
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [operations, params, slug]);

  async function generate() {
    setBusy(true);
    setFeedback("Validando y generando…");
    try {
      const response = await fetch("/api/forge/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          params,
          operations,
          text_ops: currentTextOps(),
          engine_version: "mesh-v2",
          schema_version: 2,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data?.detail || data?.error || "Error V2");
      setPreviewUrl(data.preview_url || data.url);
      setFeedback("V2 generado · artefacto trazable registrado");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar V2");
    } finally {
      setBusy(false);
    }
  }


  async function generateCadPreview() {
    if (!isCadV2Product(slug)) return;
    setBusy(true);
    setFeedback("Generando B-Rep real con CadQuery…");
    try {
      const response = await fetch(
        "/api/forge/cad/product/" + encodeURIComponent(slug),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            params,
            operations,
            format: "stl",
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.detail || data?.error || "No se pudo generar CAD V2"
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return url;
      });
      setFeedback("CAD B-Rep generado · STL listo para comparar en el visor");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar CAD V2");
    } finally {
      setBusy(false);
    }
  }

  async function downloadCadStep() {
    if (!isCadV2Product(slug)) return;
    setBusy(true);
    setFeedback("Exportando STEP desde B-Rep…");
    try {
      const response = await fetch(
        "/api/forge/cad/product/" + encodeURIComponent(slug),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            params,
            operations,
            format: "step",
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.detail || data?.error || "No se pudo exportar STEP"
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = slug + ".step";
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("STEP CAD exportado correctamente");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo exportar STEP");
    } finally {
      setBusy(false);
    }
  }


  async function generateCadEnclosurePart(part: "body-stl" | "lid-stl") {
    if (!isCadV2Enclosure(slug)) return;
    setBusy(true);
    setFeedback(
      part === "body-stl"
        ? "Generando cuerpo hueco B-Rep…"
        : "Generando tapa CAD con operaciones…"
    );
    try {
      const response = await fetch(
        "/api/forge/cad/enclosure/" +
          encodeURIComponent(slug) +
          "/" +
          part,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ params, operations }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.detail || data?.error || "No se pudo generar la caja CAD"
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return url;
      });
      setFeedback(
        part === "body-stl"
          ? "Cuerpo hueco CAD generado"
          : "Tapa CAD generada con operaciones"
      );
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo generar la caja CAD");
    } finally {
      setBusy(false);
    }
  }

  async function downloadCadEnclosureStep() {
    if (!isCadV2Enclosure(slug)) return;
    setBusy(true);
    setFeedback("Exportando tapa STEP desde B-Rep…");
    try {
      const response = await fetch(
        "/api/forge/cad/enclosure/" +
          encodeURIComponent(slug) +
          "/lid-step",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ params, operations }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.detail || data?.error || "No se pudo exportar la tapa STEP"
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = slug + "-lid.step";
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Tapa STEP exportada correctamente");
    } catch (error: any) {
      setFeedback(error?.message || "No se pudo exportar la tapa STEP");
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = issues.some((issue) => issue.level === "error");
  const presets = useMemo(() => {
    const explicit = PRESETS[slug] || [];
    const hasVariant = Object.keys(catalogVariant).length > 0;
    if (!hasVariant) return explicit;
    return [
      ...explicit,
      {
        name: "Variante técnica",
        copy: "Configuración alternativa validada por el contrato canónico del producto.",
        params: catalogVariant,
      },
    ];
  }, [slug, catalogVariant]);

  return (
    <main className="min-h-screen bg-[#06111d] text-white">
      <header className="border-b border-white/10 bg-[#071321]/95 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Teknovashop Forge · V2 Lab
            </div>
            <h1 className="mt-1 text-xl font-black">{product.label}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <Link
              href={"/forge/" + slug}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10"
            >
              ← Volver a Forge estable
            </Link>
            <Link
              href="/catalog"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10"
            >
              Catálogo
            </Link>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              mesh-v2 · schema 2
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-amber-200">
              Beta aislada · V1 intacto
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <button
            disabled={!history.length}
            onClick={undo}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
          >
            ↶ Undo
          </button>
          <button
            disabled={!future.length}
            onClick={redo}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-30"
          >
            ↷ Redo
          </button>
        </div>
        <div
          className={
            "rounded-full px-3 py-1.5 text-[11px] font-black " +
            (hasErrors
              ? "bg-rose-400/10 text-rose-200"
              : "bg-emerald-400/10 text-emerald-200")
          }
        >
          {hasErrors ? `${issues.length} incidencias` : "Geometría válida"}
        </div>
      </div>

      <div
        className={
          "mx-auto grid gap-4 p-4 " +
          (premiumSurface
            ? "max-w-[1920px] xl:grid-cols-[300px_minmax(0,1fr)_390px] 2xl:grid-cols-[220px_300px_minmax(0,1fr)_390px]"
            : "max-w-[1680px] xl:grid-cols-[300px_minmax(0,1fr)_390px]")
        }
      >
        {premiumSurface && <ForgeV2ProductRail currentSlug={slug} />}

        <aside className="max-h-[calc(100vh-132px)] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <details className="group rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Dimensiones
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="border-t border-white/10 p-3">
              <div className="grid gap-3">
                {Object.entries(fields).map(([key, field]) => (
                  <label
                    key={key}
                    className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    {field.label || key}
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={Number(params[key] ?? field.defaultValue ?? 0)}
                        onChange={(event) =>
                          setParams((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
                      />
                      <span className="text-[10px] text-slate-600">{field.unit ?? "mm"}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </details>

          {presets.length > 0 && (
            <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
                <span className="flex items-center justify-between">
                  Presets
                  <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/5"
                  >
                    <div className="text-xs font-black text-white">{preset.name}</div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">
                      {preset.copy}
                    </div>
                  </button>
                ))}
              </div>
            </details>
          )}

          <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Agujeros y cortes
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="grid gap-2 border-t border-white/10 p-3">
              {capabilities.holes && (
                <ToolButton label="Agujero" onClick={() => add("hole")} />
              )}
              {capabilities.slots && (
                <ToolButton label="Ranura" onClick={() => add("slot")} />
              )}
              {capabilities.cutouts && (
                <>
                  <ToolButton
                    label="Corte rectangular"
                    onClick={() => add("cutout_rect")}
                  />
                  <ToolButton
                    label="Corte circular"
                    onClick={() => add("cutout_circle")}
                  />
                  <ToolButton
                    label="Rebaje rectangular"
                    onClick={() => add("pocket_rect")}
                  />
                </>
              )}
              {capabilities.holes && (
                <ToolButton
                  label="Agujero con rebaje"
                  onClick={() => add("counterbore")}
                />
              )}
              {capabilities.holePatterns && (
                <ToolButton
                  label="Patrón de agujeros"
                  onClick={() => add("hole_pattern")}
                />
              )}
              {Array.isArray(capabilities.mountingPatterns) &&
                capabilities.mountingPatterns.includes("vesa") && (
                  <ToolButton
                    label="Patrón VESA"
                    onClick={() => add("vesa_pattern")}
                  />
                )}
            </div>
          </details>

          {(capabilities.vents || capabilities.cableChannels || capabilities.ribs) && (
            <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
                <span className="flex items-center justify-between">
                  Funciones avanzadas
                  <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-3">
                {Array.isArray(capabilities.vents) &&
                  capabilities.vents.includes("linear") && (
                    <ToolButton
                      label="Ventilación lineal"
                      onClick={() => add("vent_linear")}
                    />
                  )}
                {Array.isArray(capabilities.vents) &&
                  capabilities.vents.includes("hex") && (
                    <ToolButton
                      label="Rejilla hexagonal"
                      onClick={() => add("vent_hex")}
                    />
                  )}
                {capabilities.cableChannels && (
                  <ToolButton
                    label="Canal de cable"
                    onClick={() => add("cable_channel")}
                  />
                )}
                {capabilities.holePatterns && (
                  <ToolButton
                    label="Patrón de muescas"
                    onClick={() => add("scallop_pattern")}
                  />
                )}
                {capabilities.ribs && (
                  <>
                    <ToolButton label="Refuerzo" onClick={() => add("rib")} />
                    <ToolButton label="Boss cilíndrico" onClick={() => add("boss")} />
                  </>
                )}
                {capabilities.waves && (
                  <ToolButton
                    label="Ondulación estructural"
                    onClick={() => add("wave_ribs")}
                  />
                )}
              </div>
            </details>
          )}

          {capabilities.text && (
            <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
                <span className="flex items-center justify-between">
                  Texto y marcado
                  <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="grid gap-3 border-t border-white/10 p-3">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Texto
                  <input
                    type="text"
                    value={textValue}
                    maxLength={40}
                    onChange={(event) => {
                      setTextValue(event.target.value);
                      setPreviewUrl(undefined);
                    }}
                    placeholder="Nombre, referencia, versión…"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Modo
                    <select
                      value={textMode}
                      onChange={(event) => setTextMode(event.target.value as "engrave" | "emboss")}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white"
                    >
                      <option value="engrave">Grabado</option>
                      <option value="emboss">Relieve</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Cara
                    <select
                      value={textAnchor}
                      onChange={(event) => setTextAnchor(event.target.value as "top" | "bottom")}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white"
                    >
                      <option value="top">Superior</option>
                      <option value="bottom">Inferior</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Tamaño mm", textSize, setTextSize, 3, 30, 0.5],
                    ["Profundidad mm", textDepth, setTextDepth, 0.4, 4, 0.1],
                    ["X mm", textX, setTextX, -100, 100, 1],
                    ["Y mm", textY, setTextY, -100, 100, 1],
                  ].map(([label, value, setter, min, max, step]) => (
                    <label key={String(label)} className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {String(label)}
                      <input
                        type="number"
                        value={Number(value)}
                        min={Number(min)}
                        max={Number(max)}
                        step={Number(step)}
                        onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                      />
                    </label>
                  ))}
                </div>
                <p className="text-[10px] leading-4 text-slate-500">
                  La personalización se procesa en el backend y queda registrada en el manifiesto del diseño.
                </p>
              </div>
            </details>
          )}

          <details className="group mt-3 rounded-2xl border border-white/10 bg-[#0b1d30]">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black">
              <span className="flex items-center justify-between">
                Borradores en la nube
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </span>
            </summary>
            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  value={draftName}
                  maxLength={100}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#071321] px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                  placeholder="Nombre del diseño"
                />
                <button
                  type="button"
                  disabled={draftBusy || !draftName.trim()}
                  onClick={() => void saveDraft()}
                  className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-[#071321] transition hover:bg-cyan-200 disabled:opacity-50"
                >
                  {draftBusy ? "Guardando…" : "Guardar"}
                </button>
              </div>
              {draftMessage && (
                <p className="mt-2 text-[10px] leading-4 text-cyan-100/75">{draftMessage}</p>
              )}
              {drafts.filter((draft) => draft.product_slug === slug).length > 0 && (
                <div className="mt-3 grid gap-2">
                  {drafts
                    .filter((draft) => draft.product_slug === slug)
                    .slice(0, 5)
                    .map((draft) => (
                      <button
                        key={draft.id}
                        type="button"
                        onClick={() => loadDraft(draft)}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left transition hover:bg-white/[0.07]"
                      >
                        <span>
                          <span className="block text-xs font-bold text-white">{draft.name}</span>
                          <span className="mt-0.5 block text-[9px] text-slate-500">
                            {new Date(draft.updated_at).toLocaleString("es-ES")}
                          </span>
                        </span>
                        <span className="text-[10px] font-black text-cyan-300">Cargar</span>
                      </button>
                    ))}
                </div>
              )}
              <p className="mt-3 text-[9px] leading-4 text-slate-500">
                Parámetros, operaciones y personalización se guardan asociados únicamente a tu cuenta.
              </p>
            </div>
          </details>

          <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3 text-[11px] leading-5 text-slate-400">
            Todas las secciones se mantienen cerradas al entrar. Solo aparecen
            herramientas que el contrato de esta pieza declara compatibles.
          </div>
        </aside>

        <section className="relative min-w-0 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#071321] shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          {premiumSurface && (
            <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-3">
              <div className="rounded-full border border-cyan-200/15 bg-[#06111d]/75 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200 backdrop-blur-xl">
                Live parametric viewport
              </div>
              <div
                className={
                  "rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] backdrop-blur-xl " +
                  (hasErrors
                    ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                    : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200")
                }
              >
                {hasErrors ? "Revisar geometría" : "Modelo válido"} · {operations.length} ops
              </div>
            </div>
          )}
          <STLViewerPro
            url={previewUrl}
            className="h-[720px] border-0 bg-[#071321] shadow-none"
          />
          {premiumSurface && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-center justify-between gap-2">
              <div className="rounded-xl border border-white/10 bg-[#06111d]/75 px-3 py-2 text-[9px] font-bold text-slate-400 backdrop-blur-xl">
                mm · mesh-v2 · schema 2
              </div>
              <div className="rounded-xl border border-white/10 bg-[#06111d]/75 px-3 py-2 text-[9px] font-bold text-slate-400 backdrop-blur-xl">
                Undo {history.length} · Redo {future.length}
              </div>
            </div>
          )}
        </section>

        <aside className="max-h-[calc(100vh-132px)] overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Pila de operaciones
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              {operations.length}/24
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {operations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs leading-5 text-slate-500">
                Abre una sección de herramientas y añade una operación. La
                configuración seguirá siendo editable y reversible.
              </div>
            )}
            {operations.map((op, index) => (
              <details
                key={op.id}
                className="group rounded-2xl border border-white/10 bg-[#0b1d30]"
              >
                <summary className="cursor-pointer list-none p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black">
                      {index + 1}. {LABELS[op.type as OpKind] || op.type}
                    </span>
                    <span
                      className={
                        "h-2 w-2 rounded-full " +
                        (op.enabled ? "bg-emerald-300" : "bg-slate-600")
                      }
                    />
                  </span>
                </summary>
                <div className="border-t border-white/10 p-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => move(op.id, -1)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(op.id, 1)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(op.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-cyan-300"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(op.id)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs text-rose-300"
                    >
                      Eliminar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPlacingId((current) => (current === op.id ? null : op.id))
                    }
                    className={
                      "mt-3 w-full rounded-lg border px-3 py-2 text-xs font-black transition " +
                      (placingId === op.id
                        ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]")
                    }
                  >
                    {placingId === op.id ? "Cancelar colocación" : "⌖ Colocar en visor"}
                  </button>

                  <label className="mt-3 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Cara objetivo
                    <select
                      value={op.target?.face || "top"}
                      onChange={(event) =>
                        patchTarget(op.id, event.target.value as "top" | "bottom")
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs normal-case tracking-normal text-white"
                    >
                      <option value="top">Superior</option>
                      <option value="bottom">Inferior</option>
                    </select>
                  </label>

                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={op.enabled}
                      onChange={() => toggle(op.id)}
                      className="accent-cyan-300"
                    />
                    Operación activa
                  </label>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["x", "y", "rotation_deg"] as const).map((key) => (
                      <label
                        key={key}
                        className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
                      >
                        {key === "rotation_deg" ? "Rotación" : `${key} mm`}
                        <input
                          type="number"
                          value={Number(op.placement?.[key] || 0)}
                          onChange={(event) =>
                            patchPlacement(op.id, key, Number(event.target.value))
                          }
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(op.params)
                      .filter(([, value]) => typeof value === "number")
                      .map(([key, value]) => (
                        <label
                          key={key}
                          className="text-[9px] font-bold uppercase tracking-wide text-slate-500"
                        >
                          {key.split("_").join(" ")}
                          <input
                            type="number"
                            value={Number(value)}
                            min={0}
                            step={0.5}
                            onChange={(event) =>
                              patchParam(op.id, key, Number(event.target.value))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-[#071321] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/50"
                          />
                        </label>
                      ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          {issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={issue.code + index}
                  className={
                    "rounded-xl border px-3 py-2 text-xs leading-5 " +
                    (issue.level === "error"
                      ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                      : "border-amber-300/20 bg-amber-400/10 text-amber-200")
                  }
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={busy || hasErrors}
            className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-[#04101d] transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy ? "Generando…" : "Validar y generar V2"}
          </button>

          {premiumSurface && isCadV2Product(slug) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void generateCadPreview()}
                disabled={busy || hasErrors}
                className="rounded-xl border border-violet-300/25 bg-violet-300/10 px-3 py-2.5 text-[11px] font-black text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50"
              >
                CAD B-Rep
              </button>
              <button
                type="button"
                onClick={() => void downloadCadStep()}
                disabled={busy || hasErrors}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.09] disabled:opacity-50"
              >
                Exportar STEP
              </button>
            </div>
          )}

          {premiumSurface && isCadV2Product(slug) && (
            <div className="mt-2 rounded-xl border border-violet-300/10 bg-violet-300/[0.04] px-3 py-2 text-[9px] leading-4 text-violet-100/70">
              Piloto CAD aislado · compara el resultado B-Rep con mesh-v2 sin sustituir el flujo estable.
            </div>
          )}

          {premiumSurface && isCadV2Enclosure(slug) && (
            <>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void generateCadEnclosurePart("body-stl")}
                  disabled={busy || hasErrors}
                  className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-2.5 text-[10px] font-black text-fuchsia-100 transition hover:bg-fuchsia-300/15 disabled:opacity-50"
                >
                  Cuerpo CAD
                </button>
                <button
                  type="button"
                  onClick={() => void generateCadEnclosurePart("lid-stl")}
                  disabled={busy || hasErrors}
                  className="rounded-xl border border-violet-300/20 bg-violet-300/10 px-2 py-2.5 text-[10px] font-black text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50"
                >
                  Tapa CAD
                </button>
                <button
                  type="button"
                  onClick={() => void downloadCadEnclosureStep()}
                  disabled={busy || hasErrors}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-2 py-2.5 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.09] disabled:opacity-50"
                >
                  STEP tapa
                </button>
              </div>
              <div className="mt-2 rounded-xl border border-fuchsia-300/10 bg-fuchsia-300/[0.04] px-3 py-2 text-[9px] leading-4 text-fuchsia-100/70">
                Familia CAD de cajas · cuerpo hueco independiente + tapa operable.
              </div>
            </>
          )}

          <p className="mt-3 text-xs leading-5 text-slate-400">{feedback}</p>
        </aside>
      </div>
    </main>
  );
}
