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

/** -------- VESA Adapter (placeholder) -------- */
export type VesaAdapterPayload = {
  model: "vesa_adapter";
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  pattern: "75x75" | "100x100" | "100x200" | "200x200";
};

/** -------- Router Mount (placeholder) -------- */
export type RouterMountPayload = {
  model: "router_mount";
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  thickness_mm: number;
  vent_slots?: boolean;
};

/** Payload unificado para /generate */
export type ForgePayload =
  | CableTrayPayload
  | VesaAdapterPayload
  | RouterMountPayload;

/** Respuesta estrictamente tipada */
export type GenerateOk = { status: "ok"; stl_url: string };
export type GenerateError = { status: "error"; detail?: string; message?: string };
export type GenerateResponse = GenerateOk | GenerateError;
