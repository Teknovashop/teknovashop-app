// components/ModelSelector.tsx
"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { label: string; value: string };

const OPTIONS: Option[] = [
  { label: "Cable Tray (bandeja)", value: "cable_tray" },
  { label: "VESA Adapter", value: "vesa_adapter" },
  { label: "Router Mount (L)", value: "router_mount" },
  // el resto apuntan al fallback hasta que el “real” esté listo:
  { label: "Cable Clip", value: "Cable Clip" },
  { label: "Headset Stand", value: "Headset Stand" },
  { label: "Phone Dock (USB-C)", value: "Phone Dock (USB-C)" },
  { label: "Tablet Stand", value: "Tablet Stand" },
  { label: "SSD Holder (2.5\")", value: "SSD Holder (2.5\")" },
  { label: "Raspberry Pi Case", value: "Raspberry Pi Case" },
  { label: "GoPro Mount", value: "GoPro Mount" },
  { label: "Wall Hook", value: "Wall Hook" },
  { label: "Monitor Stand", value: "Monitor Stand" },
  { label: "Laptop Stand", value: "Laptop Stand" },
  { label: "Mic Arm Clip", value: "Mic Arm Clip" },
  { label: "Camera Plate 1/4\"", value: "Camera Plate 1/4\"" },
  { label: "USB Hub Holder", value: "USB Hub Holder" },
];

export function ModelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger>
      <SelectContent>
        {OPTIONS.map(o => <SelectItem key={o.label} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
