// app/data/examples.ts
export type ExampleParams = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};

export type Hole = { x_mm: number; y_mm: number; d_mm: number };

export type ExampleItem = {
  id: string;
  model: "cable_tray" | "vesa_adapter" | "router_mount" | "camera_mount" | "wall_bracket";
  title: string;
  desc: string;
  tip?: string;
  params: ExampleParams;
  holes?: Hole[];
  thumb?: string; // opcional (si no hay, se genera SVG)
};

export function encodeParams(p: ExampleParams) {
  return JSON.stringify(p);
}

export function makeThumbCacheKey(ex: ExampleItem) {
  return `forge-thumb:${ex.model}:${encodeParams(ex.params)}:${JSON.stringify(ex.holes ?? [])}`;
}

// 12 ejemplos profesionales (solo modelos soportados por tu backend)
export const EXAMPLES: ExampleItem[] = [
  // VESA
  {
    id: "vesa100",
    model: "vesa_adapter",
    title: "Placa VESA 100×100",
    desc: "Universal 120×120×4 mm. Lista para monitores y brazos VESA 100.",
    tip: "Tip: sube el grosor si usas tornillos largos.",
    params: { length_mm: 120, width_mm: 120, height_mm: 4, thickness_mm: 4, fillet_mm: 0 },
  },
  {
    id: "vesa75",
    model: "vesa_adapter",
    title: "Placa VESA 75×75",
    desc: "Compacta 100×100×3.5 mm; ideal para pantallas ligeras.",
    tip: "Tip: añade fillet 2–3 mm para evitar cantos vivos.",
    params: { length_mm: 100, width_mm: 100, height_mm: 3.5, thickness_mm: 3, fillet_mm: 2 },
  },
  {
    id: "vesa100-slim",
    model: "vesa_adapter",
    title: "VESA 100 Slim",
    desc: "Perfil bajo, 120×120×3 mm para setups minimalistas.",
    params: { length_mm: 120, width_mm: 120, height_mm: 3, thickness_mm: 3, fillet_mm: 1.5 },
  },

  // Cable trays
  {
    id: "tray-220-100-60",
    model: "cable_tray",
    title: "Bandeja de cables 220×100×60",
    desc: "Canaleta abierta, pared 3 mm. Escritorio limpio garantizado.",
    tip: "Tip: añade agujeros Ø4 para fijar a pared o mesa.",
    params: { length_mm: 220, width_mm: 100, height_mm: 60, thickness_mm: 3, fillet_mm: 0 },
    holes: [
      { x_mm: 30, y_mm: 50, d_mm: 4 },
      { x_mm: 190, y_mm: 50, d_mm: 4 },
    ],
  },
  {
    id: "tray-300-80-50",
    model: "cable_tray",
    title: "Bandeja 300×80×50",
    desc: "Perfil estrecho y largo, ideal para zócalos.",
    params: { length_mm: 300, width_mm: 80, height_mm: 50, thickness_mm: 3, fillet_mm: 2 },
  },

  // Router mounts
  {
    id: "router-150-90-100",
    model: "router_mount",
    title: "Soporte router 150×90×100",
    desc: "Escuadra en L para alojar routers o hubs pequeños.",
    tip: "Tip: usa pared ≥3 mm para más rigidez.",
    params: { length_mm: 150, width_mm: 90, height_mm: 100, thickness_mm: 3, fillet_mm: 2 },
    holes: [{ x_mm: 75, y_mm: 45, d_mm: 4 }],
  },
  {
    id: "router-200-120-120",
    model: "router_mount",
    title: "Soporte router 200×120×120",
    desc: "Formato ancho con ala de 120 mm para cajas medias.",
    params: { length_mm: 200, width_mm: 120, height_mm: 120, thickness_mm: 4, fillet_mm: 3 },
  },

  // Camera mounts
  {
    id: "cam-base-100-80-40",
    model: "camera_mount",
    title: "Base cámara 100×80×40",
    desc: "Base estable con columna corta para cámaras ligeras.",
    params: { length_mm: 100, width_mm: 80, height_mm: 40, thickness_mm: 3, fillet_mm: 2 },
  },
  {
    id: "cam-plate-120-100-60",
    model: "camera_mount",
    title: "Plataforma cámara 120×100×60",
    desc: "Plataforma más robusta y versátil.",
    params: { length_mm: 120, width_mm: 100, height_mm: 60, thickness_mm: 4, fillet_mm: 2 },
    holes: [{ x_mm: 60, y_mm: 50, d_mm: 6 }],
  },

  // Wall brackets
  {
    id: "bracket-160-40-120",
    model: "wall_bracket",
    title: "Escuadra pared 160×40×120",
    desc: "Escuadra compacta. Ideal para estantes ligeros.",
    params: { length_mm: 160, width_mm: 40, height_mm: 120, thickness_mm: 4, fillet_mm: 2 },
  },
  {
    id: "bracket-220-60-160",
    model: "wall_bracket",
    title: "Escuadra 220×60×160",
    desc: "Más brazo y altura para cargas moderadas.",
    params: { length_mm: 220, width_mm: 60, height_mm: 160, thickness_mm: 5, fillet_mm: 3 },
  },

  // Extra combinaciones
  {
    id: "tray-180-120-70",
    model: "cable_tray",
    title: "Bandeja 180×120×70",
    desc: "Volumen alto para cables y regletas.",
    params: { length_mm: 180, width_mm: 120, height_mm: 70, thickness_mm: 3, fillet_mm: 2 },
  },
  {
    id: "vesa100-rounded",
    model: "vesa_adapter",
    title: "VESA 100 redondeada",
    desc: "Bordes suaves y grosor 5 mm para máxima rigidez.",
    params: { length_mm: 120, width_mm: 120, height_mm: 5, thickness_mm: 5, fillet_mm: 3 },
  },
];
