// lib/forge-spec.ts
export type ForgeModelSlug =
  | "vesa-adapter"
  | "router-mount"
  | "cable-tray"
  | "headset-stand"
  | "phone-dock"
  | "phone-stand"
  | "tablet-stand"
  | "ssd-holder"
  | "cable-clip"
  | "raspi-case"
  | "go-pro-mount"
  | "wall-hook"
  | "wall-bracket"
  | "vesa-shelf"
  | "enclosure-ip65"
  | "qr-plate"
  | "monitor-stand"
  | "laptop-stand"
  | "mic-arm-clip"
  | "camera-plate"
  | "hub-holder";

export type ForgeParams = Record<string, number | boolean | string>;

export type ForgeRequest = {
  model: ForgeModelSlug;
  params: ForgeParams;
};

// Config de UI
export type NumField = {
  label: string;
  type: "number";
  step?: number;
  min?: number;
  max?: number;
  defaultValue: number;
};

export type Fields = Record<string, NumField>;
