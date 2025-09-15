// teknovashop-app/app/forge/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { generateSTL } from "@/lib/api";
import type {
  GenerateResponse,
  ModelKind,
  CableTrayPayload,
  VesaAdapterPayload,
  RouterMountPayload,
  ForgePayload,
} from "@/types/forge";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ForgePage() {
  const [model, setModel] = useState<ModelKind>("cable_tray");

  // Cable tray
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(25);
  const [length, setLength] = useState(180);
  const [thickness, setThickness] = useState(3);
  const [ventilated, setVentilated] = useState(true);

  // VESA
  const [vesa, setVesa] = useState(100);
  const [vesaThk, setVesaThk] = useState(4);
  const [vesaHole, setVesaHole] = useState(5);
  const [vesaClear, setVesaClear] = useState(1);

  // Router mount
  const [rWidth, setRWidth] = useState(120);
  const [rDepth, setRDepth] = useState(80);
  const [rThk, setRThk] = useState(4);
  const [rSlots, setRSlots] = useState(true);
  const [rHole, setRHole] = useState(4);

  const [busy, setBusy] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const stlUrl = useMemo(() => {
    return result && result.status === "ok" ? result.stl_url : undefined;
  }, [result]);

  const applyPreset = (kind: "S" | "M" | "L") => {
    if (kind === "S") {
      setWidth(40); setHeight(20); setLength(120); setThickness(2);
    } else if (kind === "M") {
      setWidth(60); setHeight(25); setLength(180); setThickness(3);
    } else {
      setWidth(80); setHeight(35); setLength(240); setThickness(4);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setResult(null);
    try {
      let payload: ForgePayload;

      if (model === "cable_tray") {
        payload = {
          model: "cable_tray",
          width_mm: clamp(width, 10, 500),
          height_mm: clamp(height, 5, 300),
          length_mm: clamp(length, 30, 2000),
          thickness_mm: clamp(thickness, 1, 20),
          ventilated,
        } satisfies CableTrayPayload;
      } else if (model === "vesa_adapter") {
        payload = {
          model: "vesa_adapter",
          vesa_mm: clamp(vesa, 50, 400),
          thickness_mm: clamp(vesaThk, 2, 10),
          hole_diameter_mm: clamp(vesaHole, 3, 10),
          clearance_mm: clamp(vesaClear, 0, 5),
        } satisfies VesaAdapterPayload;
      } else {
        payload = {
          model: "router_mount",
          router_width_mm: clamp(rWidth, 50, 400),
          router_de_
