// teknovashop-app/types/forge.ts

// Modelos soportados (UI ya contempla los futuros)
export type ModelKind = "cable_tray" | "vesa_adapter" | "router_mount";

// Payload Cable Tray
export type CableTrayPayload = {
  model: "cable_tray";
  width_mm: number;
  height_mm: number;
  length_mm: number;
  thickness_mm: number;
  ventilated: boolean;
};

// Si luego añadimos VESA o Router, unimos sus payloads aquí
export type GeneratePayload = CableTrayPayload;

// Respuesta estrictamente tipada
export type GenerateOk = { status: "ok"; stl_url: string };
export type GenerateError = { status: "error"; detail?: string; message?: string };
export type GenerateResponse = GenerateOk | GenerateError;
