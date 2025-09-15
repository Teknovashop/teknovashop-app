// teknovashop-app/types/forge.ts

/** Modelos soportados por la UI */
export type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

/** -------- Cable Tray -------- */
export type CableTrayPayload = {
  model: "cable_tray";
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated: boolean;
};

/** -------- VESA Adapter (placeholder para UI; backend próximamente) --------
 * Dejamos un shape razonable para compilar y poder previsualizar en la UI.
 * Cuando el backend esté listo, ajustamos nombres/tipos a lo que exponga.
 */
export type VesaAdapterPayload = {
  model: "vesa_adapter";
  /** Distancia entre centros de taladros VESA (p. ej., 75, 100, 200) */
  vesa_mm: number;
  /** Espesor de la placa adaptadora */
  plate_thickness_mm: number;
  /** Diámetro de los agujeros */
  hole_diameter_mm: number;
  /** Ancho/alto de la placa (opcional por ahora) */
  plate_width_mm?: number;
  plate_height_mm?: number;
};

/** -------- Router Mount (placeholder para UI; backend próximamente) -------- */
export type RouterMountPayload = {
  model: "router_mount";
  width_mm: number;   // ancho del router
  height_mm: number;  // alto/hueco útil
  depth_mm: number;   // fondo del soporte
  thickness_mm: number;
  vent_slots?: boolean;
};

/** Payload unificado que acepta el API /generate */
export type ForgePayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;

/** Respuesta estrictamente tipada */
export type GenerateOk = { status: "ok"; stl_url: string };
export type GenerateError = { status: "error"; detail?: string; message?: string };
export type GenerateResponse = GenerateOk | GenerateError;
