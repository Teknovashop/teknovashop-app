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

/** -------- VESA Adapter -------- */
export type VesaAdapterPayload = {
  model: "vesa_adapter";
  vesa_mm: number;            // 75 / 100 / 200, etc.
  thickness_mm: number;
  hole_diameter_mm: number;
  clearance_mm: number;
};

/** -------- Router Mount -------- */
export type RouterMountPayload = {
  model: "router_mount";
  router_width_mm: number;
  router_depth_mm: number;
  thickness_mm: number;
  strap_slots: boolean;
  hole_diameter_mm: number;
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
