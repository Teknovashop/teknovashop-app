/** Qué modelo se va a generar */
export type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

/** Marcador de agujero (coordenadas en mm en el plano XZ, perfora a lo largo del eje Y) */
export type HoleSpec = {
  /** Posición X (mm). En cable_tray X es la LONGITUD; en VESA/Router, X es el ancho. */
  x_mm: number;
  /** Posición Z (mm). En cable_tray Z es el ANCHO; en VESA/Router, Z es el fondo/alto de placa. */
  z_mm: number;
  /** Diámetro del agujero (mm) */
  d_mm: number;
};

/** Bandeja de cables */
export interface CableTrayPayload {
  model: "cable_tray";
  /** Longitud (eje X) */
  length_mm: number;
  /** Altura (paredes, eje Y) */
  height_mm: number;
  /** Ancho (eje Z) */
  width_mm: number;
  /** Espesor de material */
  thickness_mm: number;
  /** Ranuras/ventilación */
  ventilated: boolean;
  /** Agujeros personalizados (plano XZ, respecto al centro) */
  holes?: HoleSpec[];
}

/** Adaptador VESA (placeholder por ahora) */
export interface VesaAdapterPayload {
  model: "vesa_adapter";
  vesa_mm: number;
  thickness_mm: number;
  hole_diameter_mm: number;
  clearance_mm: number;
  holes?: HoleSpec[];
}

/** Soporte router (placeholder por ahora) */
export interface RouterMountPayload {
  model: "router_mount";
  router_width_mm: number;
  router_depth_mm: number;
  thickness_mm: number;
  strap_slots: boolean;
  hole_diameter_mm: number;
  holes?: HoleSpec[];
}

/** Payload total que acepta /generate */
export type ForgePayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;

/** Respuesta de /generate */
export type GenerateResponse =
  | { status: "ok"; stl_url: string }
  | { status: "error"; message: string }
  | { status: "_" };
