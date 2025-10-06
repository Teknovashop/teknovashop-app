// lib/forge-spec.ts
export type ForgeModelSlug =
  | "vesa-adapter"
  | "router-mount"
  | "cable-tray"
  | "headset-stand"
  | "phone-dock"
  | "tablet-stand"
  | "ssd-holder"
  | "cable-clip"
  | "raspi-case"
  | "go-pro-mount"
  | "wall-hook"
  | "monitor-stand"
  | "laptop-stand"
  | "mic-arm-clip"
  | "camera-plate"
  | "hub-holder";

export type ForgeParams = Record<string, number | boolean | string>;
export type ForgeRequest = { model: ForgeModelSlug; params: ForgeParams };
