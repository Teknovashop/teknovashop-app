// models/registry.ts

// ——— Tipos base
export type ModelId = "cable_tray" | "vesa_adapter" | "router_mount";

export type SliderDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type ModelDef<State> = {
  id: ModelId;
  label: string;
  // sliders que renderiza el panel
  sliders: SliderDef[];
  // estado inicial
  defaults: State;
  // ¿se pueden poner agujeros libres con Shift+clic?
  allowFreeHoles: boolean;
  // markers calculados automáticamente (p. ej., patrón VESA)
  autoMarkers?: (s: State) => { x_mm: number; z_mm: number; d_mm: number }[];
  // caja (L x H x W + thickness) que requiere el visor
  toBox: (s: State) => { length: number; height: number; width: number; thickness?: number };
  // ✅ payload que espera el backend CAD (cada modelo decide qué campos manda)
  toPayload: (s: State) => any;
};

// ——— Modelos

// 1) Cable Tray (bandeja pasa-cables)
export type CableTrayState = {
  width: number;
  height: number;
  length: number;
  thickness: number;
  ventilated: boolean;
  holes: { x_mm: number; z_mm: number; d_mm: number }[];
};

export const CableTray: ModelDef<CableTrayState> = {
  id: "cable_tray",
  label: "Cable Tray",
  allowFreeHoles: true,
  sliders: [
    { key: "width", label: "Ancho (mm)", min: 40, max: 200, step: 1 },
    { key: "height", label: "Alto (mm)", min: 15, max: 120, step: 1 },
    { key: "length", label: "Longitud (mm)", min: 80, max: 400, step: 1 },
    { key: "thickness", label: "Espesor (mm)", min: 2, max: 8, step: 0.5 },
  ],
  defaults: {
    width: 60,
    height: 25,
    length: 180,
    thickness: 3,
    ventilated: true,
    holes: [],
  },
  toBox: (s) => ({
    length: s.length,
    height: s.height,
    width: s.width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "cable_tray",
    width_mm: s.width,
    height_mm: s.height,
    length_mm: s.length,
    thickness_mm: s.thickness,
    ventilated: s.ventilated,
    holes: s.holes,
  }),
};

// 2) VESA Adapter (placa con patrón estándar)
export type VesaPattern = 75 | 100 | 200;

export type VesaAdapterState = {
  plateWidth: number;    // tamaño placa cuadrada
  plateHeight: number;   // para visor (no usado en payload CAD)
  thickness: number;
  pattern: VesaPattern;  // 75, 100 o 200
  holeDiameter: number;  // diámetro de los agujeros del patrón
  extraHoles: { x_mm: number; z_mm: number; d_mm: number }[]; // agujeros libres extra
};

export const VesaAdapter: ModelDef<VesaAdapterState> = {
  id: "vesa_adapter",
  label: "VESA Adapter",
  allowFreeHoles: true, // permitimos extras además del patrón
  sliders: [
    { key: "plateWidth", label: "Ancho placa (mm)", min: 80, max: 260, step: 1 },
    { key: "thickness", label: "Espesor (mm)", min: 2, max: 8, step: 0.5 },
    { key: "holeDiameter", label: "Ø agujero VESA (mm)", min: 3, max: 8, step: 0.5 },
  ],
  defaults: {
    plateWidth: 120,
    plateHeight: 5,
    thickness: 5,
    pattern: 100,
    holeDiameter: 5,
    extraHoles: [],
  },
  autoMarkers: (s) => {
    const p = s.pattern; // distancia entre centros (en mm)
    const d = s.holeDiameter;
    // cuatro agujeros en las esquinas del patrón
    return [
      { x_mm:  p / 2, z_mm:  p / 2, d_mm: d },
      { x_mm: -p / 2, z_mm:  p / 2, d_mm: d },
      { x_mm:  p / 2, z_mm: -p / 2, d_mm: d },
      { x_mm: -p / 2, z_mm: -p / 2, d_mm: d },
    ];
  },
  toBox: (s) => ({
    length: s.plateWidth,
    height: s.thickness,
    width: s.plateWidth,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "vesa_adapter",
    plate_size_mm: s.plateWidth,
    thickness_mm: s.thickness,
    vesa_pattern_mm: s.pattern,
    vesa_hole_d_mm: s.holeDiameter,
    // combina patrón auto con extras libres:
    holes: [...(VesaAdapter.autoMarkers!(s)), ...s.extraHoles],
  }),
};

// 3) Router Mount (balda en L simple)
export type RouterMountState = {
  width: number;      // ancho total
  depth: number;      // fondo de la balda
  flange: number;     // ala vertical para atornillar a pared
  thickness: number;
  holes: { x_mm: number; z_mm: number; d_mm: number }[];
};

export const RouterMount: ModelDef<RouterMountState> = {
  id: "router_mount",
  label: "Router Mount",
  allowFreeHoles: true,
  sliders: [
    { key: "width", label: "Ancho (mm)", min: 80, max: 320, step: 1 },
    { key: "depth", label: "Fondo (mm)", min: 60, max: 240, step: 1 },
    { key: "flange", label: "Ala (mm)", min: 20, max: 120, step: 1 },
    { key: "thickness", label: "Espesor (mm)", min: 2, max: 8, step: 0.5 },
  ],
  defaults: {
    width: 180,
    depth: 120,
    flange: 60,
    thickness: 4,
    holes: [],
  },
  // Para el visor usamos la base como placa principal (depth x width)
  toBox: (s) => ({
    length: s.depth,
    height: s.thickness,
    width: s.width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "router_mount",
    width_mm: s.width,
    depth_mm: s.depth,
    flange_mm: s.flange,
    thickness_mm: s.thickness,
    holes: s.holes,
  }),
};

// ——— Registry export
export const MODELS = {
  cable_tray: CableTray,
  vesa_adapter: VesaAdapter,
  router_mount: RouterMount,
} as const;

export type AnyState = CableTrayState | VesaAdapterState | RouterMountState;
