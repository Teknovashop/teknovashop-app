// teknovashop-app/types/forge.ts

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
  /**
   * Agujeros personalizados: cilindros que atraviesan en Y.
   * Coordenadas en el plano XZ, respecto al centro de la pieza.
   */
  holes?: HoleSpec[];
}

/** Adaptador VESA */
export interface VesaAdapterPayload {
  model: "vesa_adapter";
  /** Patrón VESA en mm (75, 100, 200…) */
  vesa_mm: number;
  /** Espesor placa */
  thickness_mm: number;
  /** Diámetro de agujero estándar VESA */
  hole_diameter_mm: number;
  /** Holgura adicional perimetral */
  clearance_mm: number;
  /** Agujeros personalizados opcionales */
  holes?: HoleSpec[];
}

/** Soporte de router/ONT */
export interface RouterMountPayload {
  model: "router_mount";
  /** Ancho del dispositivo (X) */
  router_width_mm: number;
  /** Fondo del dispositivo (Z) */
  router_depth_mm: number;
  /** Espesor material */
  thickness_mm: number;
  /** Ranuras para bridas/velcro */
  strap_slots: boolean;
  /** Ø de agujero de anclaje (si se usa) */
  hole_diameter_mm: number;
  /** Agujeros personalizados opcionales */
  holes?: HoleSpec[];
}

/** Payload total que acepta /generate */
export type ForgePayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;

/** Respuestas de /generate */
export type GenerateOk = {
  status: "ok";
  stl_url: string;
  model?: ModelKind;
};

export type GenerateErr =
  | { status: "error"; message?: string; detail?: string }
  | { status: "_"; message?: string; detail?: string };

/** Respuesta de /generate (union) */
export type GenerateResponse = GenerateOk | GenerateErr;
