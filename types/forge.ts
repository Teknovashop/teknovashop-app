// /types/forge.ts

/** Modelos soportados por la UI (el backend puede ir activándolos) */
export type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

/** Respuesta del backend al generar el STL */
export type GenerateStatus = "ok" | "error" | "_";

export type GenerateResponse = {
  status: GenerateStatus;
  stl_url?: string;
  message?: string;
};

/** ---- Payloads por modelo (discriminated unions) ---- */

/** Bandeja de cables */
export type CableTrayPayload = {
  model: "cable_tray";
  width_mm: number;      // 10..500
  height_mm: number;     // 5..300
  length_mm: number;     // 30..2000
  thickness_mm: number;  // 1..20
  ventilated: boolean;
};

/** Adaptador VESA (UI lista; backend puede activarse luego) */
export type VesaAdapterPayload = {
  model: "vesa_adapter";
  /** Tamaño VESA en mm (p.ej. 75, 100, 200). Se usa patrón cuadrado. */
  vesa_mm: number;          // 50..400 típico
  thickness_mm: number;     // 2..10
  hole_diameter_mm: number; // 4..8
  /** Separación extra para tornillería, si se requiere */
  clearance_mm: number;     // 0..5
};

/** Soporte para router (UI lista; backend puede activarse luego) */
export type RouterMountPayload = {
  model: "router_mount";
  router_width_mm: number;    // 50..400
  router_depth_mm: number;    // 30..300
  thickness_mm: number;       // 2..10
  strap_slots: boolean;       // ranuras para bridas/velcro
  hole_diameter_mm: number;   // 3..8 (anclaje)
};

export type ForgePayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;
