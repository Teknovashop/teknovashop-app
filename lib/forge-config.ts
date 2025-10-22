// lib/forge-config.ts
// Tipos opcionales (si ya los tienes en ./forge-spec puedes seguir importándolos)
import type { ForgeModelSlug, ForgeParams, Fields } from "./forge-spec";

/**
 * Parámetros por modelo (defaults para el UI específico de cada pieza).
 * No los usa el backend; son sólo para el formulario.
 */
export const DEFAULT_PARAMS: Record<ForgeModelSlug, ForgeParams> = {
  "vesa-adapter": {
    width: 120,
    height: 120,
    thickness: 5,
    pattern_from: 75,
    pattern_to: 100,
    hole_d: 5,
  },
  "router-mount": {
    base_w: 80,
    base_h: 100,
    depth: 60,
    thickness: 4,
    hole_d: 4,
  },
  "cable-tray": {
    width: 220,
    depth: 80,
    height: 50,
    wall: 4,
  },
  "headset-stand": {
    base_w: 120,
    base_d: 120,
    stem_h: 260,
    stem_w: 30,
    hook_r: 40,
    wall: 4,
  },
  "phone-dock": {
    base_w: 90,
    base_d: 110,
    angle_deg: 62,
    slot_w: 12,
    slot_d: 12,
    usb_clear_h: 6,
    wall: 4,
  },
  "tablet-stand": {
    width: 160,
    depth: 140,
    angle_deg: 65,
    lip_h: 10,
    wall: 4,
  },
  "ssd-holder": {
    drive_w: 69.85,
    drive_l: 100.0,
    bay_w: 101.6,
    wall: 3,
    hole_d: 3.2,
    tolerance: 0.5,
  },
  "cable-clip": {
    cable_d: 4.0,
    length: 24,
    gap: 0.4,
    wall: 2.4,
    adhesive_w: 12,
    adhesive_l: 18,
  },
  "raspi-case": {
    board_w: 85.0,
    board_l: 56.0,
    board_h: 17.0,
    port_clear: 1.0,
    wall: 2.2,
    has_vents: true,
  },
  "go-pro-mount": {
    fork_pitch: 17.5,
    ear_t: 3.2,
    hole_d: 5.2,
    base_w: 30,
    base_l: 35,
    wall: 3,
  },
  "wall-hook": {
    base_w: 40,
    base_h: 60,
    hook_depth: 35,
    hook_height: 35,
    hook_t: 8,
    hole_d: 4.5,
    wall: 3.5,
  },
  "monitor-stand": {
    width: 400,
    depth: 200,
    height: 70,
    wall: 4.0,
  },
  "laptop-stand": {
    width: 260,
    depth: 240,
    angle_deg: 18,
    lip_h: 8,
    vent_slot: 12,
    wall: 4,
  },
  "mic-arm-clip": {
    arm_d: 20.0,
    opening: 0.6,
    clip_t: 3.0,
    width: 14.0,
    wall: 3,
  },
  "camera-plate": {
    width: 45,
    depth: 50,
    thickness: 6,
    screw_d: 6.35,
    slot_len: 18,
    chamfer: 0.8,
  },
  "hub-holder": {
    hub_w: 100,
    hub_h: 28,
    hub_d: 30,
    tolerance: 0.5,
    wall: 3,
  },
};

/**
 * Metadatos de campos para el UI (labels, steps, mínimos, etc)
 */
export const FIELDS: Partial<Record<ForgeModelSlug, Fields>> = {
  "vesa-adapter": {
    width:        { label: "Ancho placa (mm)",   type: "number", step: 1,   min: 60, defaultValue: 120 },
    height:       { label: "Alto placa (mm)",    type: "number", step: 1,   min: 60, defaultValue: 120 },
    thickness:    { label: "Grosor (mm)",        type: "number", step: 0.5, min: 2,  defaultValue: 5 },
    pattern_from: { label: "Patrón desde (mm)",  type: "number", step: 25,  min: 50, defaultValue: 75 },
    pattern_to:   { label: "Patrón hasta (mm)",  type: "number", step: 25,  min: 75, defaultValue: 100 },
    hole_d:       { label: "Ø agujero (mm)",     type: "number", step: 0.5, min: 3,  defaultValue: 5 },
  },
  "router-mount": {
    base_w:     { label: "Ancho base (mm)",   type: "number", step: 1,   min: 40, defaultValue: 80 },
    base_h:     { label: "Alto placa (mm)",   type: "number", step: 1,   min: 60, defaultValue: 100 },
    depth:      { label: "Fondo repisa (mm)", type: "number", step: 1,   min: 30, defaultValue: 60 },
    thickness:  { label: "Grosor (mm)",       type: "number", step: 0.5, min: 3,  defaultValue: 4 },
    hole_d:     { label: "Ø tornillo (mm)",   type: "number", step: 0.5, min: 3,  defaultValue: 4 },
  },
  "cable-tray": {
    width:  { label: "Ancho (mm)",          type: "number", step: 1,   min: 100, defaultValue: 220 },
    depth:  { label: "Fondo (mm)",          type: "number", step: 1,   min: 40,  defaultValue: 80 },
    height: { label: "Altura (mm)",         type: "number", step: 1,   min: 30,  defaultValue: 50 },
    wall:   { label: "Espesor pared (mm)",  type: "number", step: 0.5, min: 3,   defaultValue: 4 },
  },
  "headset-stand": {
    base_w:  { label: "Ancho base (mm)",      type: "number", step: 1,   min: 80,  defaultValue: 120 },
    base_d:  { label: "Fondo base (mm)",      type: "number", step: 1,   min: 80,  defaultValue: 120 },
    stem_h:  { label: "Altura mástil (mm)",   type: "number", step: 1,   min: 200, defaultValue: 260 },
    stem_w:  { label: "Ancho mástil (mm)",    type: "number", step: 1,   min: 20,  defaultValue: 30 },
    hook_r:  { label: "Radio apoyo (mm)",     type: "number", step: 1,   min: 20,  defaultValue: 40 },
    wall:    { label: "Grosor (mm)",          type: "number", step: 0.5, min: 3,   defaultValue: 4 },
  },
  "phone-dock": {
    base_w:      { label: "Ancho base (mm)",  type: "number", step: 1,   min: 60, defaultValue: 90 },
    base_d:      { label: "Fondo base (mm)",  type: "number", step: 1,   min: 80, defaultValue: 110 },
    angle_deg:   { label: "Ángulo (°)",       type: "number", step: 1,   min: 45, defaultValue: 62 },
    slot_w:      { label: "Ancho ranura (mm)",type: "number", step: 0.5, min: 8,  defaultValue: 12 },
    slot_d:      { label: "Prof. ranura (mm)",type: "number", step: 0.5, min: 8,  defaultValue: 12 },
    usb_clear_h: { label: "Holgura USB (mm)", type: "number", step: 0.5, min: 4,  defaultValue: 6 },
    wall:        { label: "Grosor (mm)",      type: "number", step: 0.5, min: 3,  defaultValue: 4 },
  },
  "tablet-stand": {
    width:     { label: "Ancho (mm)",          type: "number", step: 1,   min: 120, defaultValue: 160 },
    depth:     { label: "Fondo (mm)",          type: "number", step: 1,   min: 120, defaultValue: 140 },
    angle_deg: { label: "Ángulo (°)",          type: "number", step: 1,   min: 45,  defaultValue: 65 },
    lip_h:     { label: "Pestaña (mm)",        type: "number", step: 0.5, min: 6,   defaultValue: 10 },
    wall:      { label: "Grosor (mm)",         type: "number", step: 0.5, min: 3,   defaultValue: 4 },
  },
  "ssd-holder": {
    drive_w:   { label: "Ancho SSD 2.5\" (mm)", type: "number", step: 0.05, min: 69.7, defaultValue: 69.85 },
    drive_l:   { label: "Largo SSD 2.5\" (mm)", type: "number", step: 0.1,  min: 99.8, defaultValue: 100.0 },
    bay_w:     { label: "Ancho bahía 3.5\" (mm)",type: "number", step: 0.1, min: 101.2, defaultValue: 101.6 },
    wall:      { label: "Grosor (mm)",          type: "number", step: 0.2, min: 2.4,  defaultValue: 3 },
    hole_d:    { label: "Ø tornillo M3 (mm)",   type: "number", step: 0.1, min: 3.0,  defaultValue: 3.2 },
    tolerance: { label: "Holgura (mm)",         type: "number", step: 0.1, min: 0.2,  defaultValue: 0.5 },
  },
  "cable-clip": {
    cable_d:    { label: "Ø cable (mm)",        type: "number", step: 0.1, min: 3.0, defaultValue: 4.0 },
    length:     { label: "Largo clip (mm)",     type: "number", step: 1,   min: 16,  defaultValue: 24 },
    gap:        { label: "Holgura (mm)",        type: "number", step: 0.1, min: 0.2, defaultValue: 0.4 },
    wall:       { label: "Grosor (mm)",         type: "number", step: 0.2, min: 2,   defaultValue: 2.4 },
    adhesive_w: { label: "Ancho cinta (mm)",    type: "number", step: 1,   min: 8,   defaultValue: 12 },
    adhesive_l: { label: "Largo cinta (mm)",    type: "number", step: 1,   min: 12,  defaultValue: 18 },
  },
  "raspi-case": {
    board_w:  { label: "Ancho placa (mm)", type: "number", step: 0.5, min: 80, defaultValue: 85.0 },
    board_l:  { label: "Largo placa (mm)", type: "number", step: 0.5, min: 50, defaultValue: 56.0 },
    board_h:  { label: "Alto placa (mm)",  type: "number", step: 0.5, min: 14, defaultValue: 17.0 },
    port_clear:{ label: "Holgura puertos (mm)", type: "number", step: 0.5, min: 0, defaultValue: 1.0 },
    wall:     { label: "Grosor (mm)",      type: "number", step: 0.2, min: 2, defaultValue: 2.2 },
  },
  "go-pro-mount": {
    fork_pitch: { label: "Separación orejas (mm)", type: "number", step: 0.5, min: 15, defaultValue: 17.5 },
    ear_t:      { label: "Grosor oreja (mm)",      type: "number", step: 0.2, min: 2.6, defaultValue: 3.2 },
    hole_d:     { label: "Ø pasador (mm)",         type: "number", step: 0.1, min: 4.8, defaultValue: 5.2 },
    base_w:     { label: "Ancho base (mm)",        type: "number", step: 1,   min: 24,  defaultValue: 30 },
    base_l:     { label: "Largo base (mm)",        type: "number", step: 1,   min: 28,  defaultValue: 35 },
    wall:       { label: "Grosor (mm)",            type: "number", step: 0.2, min: 2.4, defaultValue: 3 },
  },
  "wall-hook": {
    base_w:     { label: "Ancho base (mm)",    type: "number", step: 1,   min: 30, defaultValue: 40 },
    base_h:     { label: "Alto base (mm)",     type: "number", step: 1,   min: 40, defaultValue: 60 },
    hook_depth: { label: "Prof. gancho (mm)",  type: "number", step: 1,   min: 20, defaultValue: 35 },
    hook_height:{ label: "Altura gancho (mm)", type: "number", step: 1,   min: 20, defaultValue: 35 },
    hook_t:     { label: "Grosor gancho (mm)", type: "number", step: 0.5, min: 6,  defaultValue: 8 },
    hole_d:     { label: "Ø tornillo (mm)",    type: "number", step: 0.1, min: 3.5, defaultValue: 4.5 },
    wall:       { label: "Grosor placa (mm)",  type: "number", step: 0.2, min: 3,  defaultValue: 3.5 },
  },
  "monitor-stand": {
    width:  { label: "Ancho (mm)",  type: "number", step: 5, min: 320, defaultValue: 400 },
    depth:  { label: "Fondo (mm)",  type: "number", step: 5, min: 160, defaultValue: 200 },
    height: { label: "Altura (mm)", type: "number", step: 1, min: 60,  defaultValue: 70 },
    wall:   { label: "Grosor (mm)", type: "number", step: 0.5, min: 3, defaultValue: 4.0 },
  },
  "laptop-stand": {
    width:    { label: "Ancho (mm)",       type: "number", step: 2,   min: 220, defaultValue: 260 },
    depth:    { label: "Fondo (mm)",       type: "number", step: 2,   min: 200, defaultValue: 240 },
    angle_deg:{ label: "Ángulo (°)",       type: "number", step: 1,   min: 10,  defaultValue: 18 },
    lip_h:    { label: "Pestaña (mm)",     type: "number", step: 0.5, min: 6,   defaultValue: 8 },
    vent_slot:{ label: "Ranura (mm)",      type: "number", step: 1,   min: 8,   defaultValue: 12 },
    wall:     { label: "Grosor (mm)",      type: "number", step: 0.5, min: 3,   defaultValue: 4 },
  },
  "mic-arm-clip": {
    arm_d:  { label: "Ø brazo (mm)",     type: "number", step: 0.1, min: 10, defaultValue: 20.0 },
    opening:{ label: "Apertura (mm)",    type: "number", step: 0.1, min: 0,  defaultValue: 0.6 },
    clip_t: { label: "Grosor clip (mm)", type: "number", step: 0.2, min: 2,  defaultValue: 3.0 },
    width:  { label: "Ancho clip (mm)",  type: "number", step: 0.5, min: 8,  defaultValue: 14.0 },
    wall:   { label: "Grosor extra (mm)",type: "number", step: 0.2, min: 2,  defaultValue: 3 },
  },
  "camera-plate": {
    width:    { label: "Ancho (mm)",         type: "number", step: 1,   min: 36, defaultValue: 45 },
    depth:    { label: "Fondo (mm)",         type: "number", step: 1,   min: 40, defaultValue: 50 },
    thickness:{ label: "Grosor (mm)",        type: "number", step: 0.5, min: 4,  defaultValue: 6 },
    screw_d:  { label: "Ø tornillo 1/4\" (mm)", type: "number", step: 0.05, min: 6.2, defaultValue: 6.35 },
    slot_len: { label: "Ranura (mm)",        type: "number", step: 1,   min: 10, defaultValue: 18 },
    chamfer:  { label: "Chaflán (mm)",       type: "number", step: 0.1, min: 0,  defaultValue: 0.8 },
  },
  "hub-holder": {
    hub_w:     { label: "Ancho hub (mm)",     type: "number", step: 1,   min: 70, defaultValue: 100 },
    hub_h:     { label: "Alto hub (mm)",      type: "number", step: 0.5, min: 18, defaultValue: 28 },
    hub_d:     { label: "Fondo hub (mm)",     type: "number", step: 1,   min: 20, defaultValue: 30 },
    tolerance: { label: "Holgura (mm)",       type: "number", step: 0.1, min: 0,  defaultValue: 0.5 },
    wall:      { label: "Grosor (mm)",        type: "number", step: 0.5, min: 2,  defaultValue: 3 },
  },
};

/* ===============================
 *  Cliente del servicio de FORGE
 * =============================== */

export const FORGE_BASE =
  (process.env.NEXT_PUBLIC_FORGE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://teknovashop-forge.onrender.com")
    .replace(/\/+$/, "");

/** Utilidades internas */
function num(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

// Intento opcional de obtener user_id desde Supabase Auth si está instalado.
// Si no usas Supabase en el front, esto devuelve null y no rompe.
async function tryGetUserId(): Promise<string | null> {
  try {
    const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs");
    const supabase = createClientComponentClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

type HoleIn =
  | { x: number; y: number; diameter_mm?: number; diam_mm?: number; d?: number; diameter?: number };

function normalizePayload(body: {
  slug: string;
  params: any;
  holes?: Array<HoleIn>;
  text_ops?: Array<{
    text: string;
    size?: number;
    depth?: number;
    mode?: "engrave" | "emboss";
    pos?: [number, number, number];
    rot?: [number, number, number];
    font?: string;
  }>;
  user_id?: string | null;
}) {
  const slug = (body.slug || "").toLowerCase();

  // holes: diameter_mm (UI) -> diam_mm (API)
  const holes =
    (body.holes || [])
      .map((h) => ({
        x: num(h.x),
        y: num(h.y),
        diam_mm: num((h as any).diam_mm ?? h.diameter_mm ?? h.diameter ?? h.d),
      }))
      .filter(
        (h) =>
          h.x !== undefined && h.y !== undefined && h.diam_mm !== undefined && (h.diam_mm as number) > 0
      ) as Array<{ x: number; y: number; diam_mm: number }>;

  // saneo simple de numéricos comunes; el backend también tolera strings
  const params = { ...(body.params || {}) };
  ["length_mm", "width_mm", "height_mm", "thickness_mm", "fillet_mm"].forEach((k) => {
    if (k in params) {
      const v = num(params[k]);
      if (v !== undefined) params[k] = v;
    }
  });

  return { slug, params, holes, text_ops: body.text_ops, user_id: body.user_id ?? null };
}

/**
 * Llama al endpoint de generación:
 * 1) Intenta /api/forge/generate (Next server)
 * 2) Fallback a BACKEND /generate (Render)
 * En ambos casos, envía x-user-id (si lo tenemos) y maneja 402 Payment Required.
 */
export async function forgeGenerate(body: {
  slug: string;
  params: any;
  holes?: Array<{ x: number; y: number; diameter_mm: number }>;
  text_ops?: Array<{
    text: string;
    size?: number;
    depth?: number;
    mode?: "engrave" | "emboss";
    pos?: [number, number, number];
    rot?: [number, number, number];
    font?: string;
  }>;
  user_id?: string | null;
}) {
  const payload = normalizePayload(body);

  // intenta sacar el UID automáticamente si no viene
  let userId = payload.user_id ?? (await tryGetUserId()).catch(() => null);

  // 1) Next API (preferido si existe y aplica tu lógica de SSR)
  try {
    const r = await fetch("/api/forge/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-user-id": String(userId) } : {}),
      },
      body: JSON.stringify({ ...payload, user_id: userId }),
    });
    if (r.status === 402) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.detail || "Pago requerido para generar este modelo.");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.detail || data?.message || "Forge generate failed");
    return data as {
      ok: boolean;
      slug: string;
      path: string;
      url?: string;
      signed_url?: string;
    };
  } catch (err) {
    // 2) Fallback directo al backend
    const r2 = await fetch(`${FORGE_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-user-id": String(userId) } : {}),
      },
      body: JSON.stringify({ ...payload, user_id: userId }),
    });
    if (r2.status === 402) {
      const j = await r2.json().catch(() => ({}));
      throw new Error(j?.detail || "Pago requerido para generar este modelo.");
    }
    const data2 = await r2.json().catch(() => ({}));
    if (!r2.ok) {
      throw new Error(data2?.detail || data2?.message || r2.statusText);
    }
    return data2 as {
      ok: boolean;
      slug: string;
      path: string;
      url?: string;
      signed_url?: string;
    };
  }
}
