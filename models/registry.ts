// models/registry.ts

// ——— Tipos base
export type ModelId =
  | "cable_tray"
  | "vesa_adapter"
  | "router_mount"
  | "phone_stand"
  | "qr_plate"
  | "enclosure_ip65"
  | "cable_clip";

export type SliderDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type Marker = { x_mm: number; z_mm: number; d_mm: number };

export type ModelDef<State> = {
  id: ModelId;
  label: string;
  // sliders que renderiza el panel
  sliders: SliderDef[];
  // estado inicial
  defaults: State;
  // ¿se pueden poner agujeros libres con Shift+clic?
  allowFreeHoles: boolean;
  // marcadores calculados automáticamente (p. ej., patrón VESA)
  autoMarkers?: (s: State) => Marker[];
  // caja (L x H x W + thickness) que requiere el visor
  toBox: (s: State) => { length: number; height: number; width: number; thickness?: number };
  // payload que espera el backend CAD
  toPayload: (s: State) => any;
};

// ——— Modelos existentes

// 1) Cable Tray
export type CableTrayState = {
  width: number;
  height: number;
  length: number;
  thickness: number;
  ventilated: boolean;
  holes: Marker[];
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

// 2) VESA Adapter
export type VesaPattern = 75 | 100 | 200;

export type VesaAdapterState = {
  plateWidth: number;    // tamaño placa cuadrada
  plateHeight: number;   // solo para visor (espesor visual)
  thickness: number;
  pattern: VesaPattern;  // 75, 100 o 200
  holeDiameter: number;  // diámetro de los agujeros del patrón
  extraHoles: Marker[];  // agujeros libres extra
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
    const p = s.pattern;
    const d = s.holeDiameter;
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
    holes: [...(VesaAdapter.autoMarkers!(s)), ...s.extraHoles],
  }),
};

// 3) Router Mount (balda en L simple)
export type RouterMountState = {
  width: number;      // ancho total
  depth: number;      // fondo de la balda
  flange: number;     // ala vertical
  thickness: number;
  holes: Marker[];
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

// ——— NUEVOS MODELOS

// 4) Universal Phone Stand
export type PhoneStandState = {
  angle_deg: number;    // ángulo de apoyo
  support_depth: number;
  width: number;
  thickness: number;
  anti_slip: boolean;   // goma antideslizante (por defecto true)
};

export const PhoneStand: ModelDef<PhoneStandState> = {
  id: "phone_stand",
  label: "Phone Stand",
  allowFreeHoles: false,
  sliders: [
    { key: "angle_deg", label: "Ángulo (°)", min: 15, max: 70, step: 1 },
    { key: "support_depth", label: "Fondo soporte (mm)", min: 70, max: 160, step: 1 },
    { key: "width", label: "Ancho (mm)", min: 60, max: 100, step: 1 },
    { key: "thickness", label: "Espesor (mm)", min: 2.5, max: 8, step: 0.5 },
  ],
  defaults: {
    angle_deg: 60,
    support_depth: 110,
    width: 80,
    thickness: 4,
    anti_slip: true,
  },
  toBox: (s) => ({
    length: s.support_depth,
    height: s.thickness,
    width: s.width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "phone_stand",
    angle_deg: s.angle_deg,
    support_depth_mm: s.support_depth,
    width_mm: s.width,
    thickness_mm: s.thickness,
    anti_slip: s.anti_slip,
  }),
};

// 5) Quick-Release Plate (Arca/Manfrotto)
export type QRSystem = "arca" | "manfrotto";

export type QRPlateState = {
  system: QRSystem;
  length: number;
  width: number;
  thickness: number;
  screw_d: number;     // diámetro para 1/4"-20 u otros
  slot_len: number;    // longitud de ranuras
  extraHoles: Marker[];
};

export const QRPlate: ModelDef<QRPlateState> = {
  id: "qr_plate",
  label: "QR Plate",
  allowFreeHoles: true,
  sliders: [
    { key: "length", label: "Longitud (mm)", min: 60, max: 130, step: 1 },
    { key: "width", label: "Ancho (mm)", min: 35, max: 55, step: 0.5 },
    { key: "thickness", label: "Espesor (mm)", min: 4, max: 12, step: 0.5 },
    { key: "screw_d", label: "Ø tornillo (mm)", min: 4, max: 8, step: 0.5 },
    { key: "slot_len", label: "Ranura (mm)", min: 10, max: 40, step: 1 },
  ],
  defaults: {
    system: "arca",
    length: 90,
    width: 38,          // estándar Arca ~38 mm
    thickness: 8,
    screw_d: 6.5,
    slot_len: 22,
    extraHoles: [],
  },
  autoMarkers: (s) => {
    // patrón sencillo: agujero central + dos taladros/ranuras a ±L/4
    const d = s.screw_d;
    const L = s.length;
    return [
      { x_mm: 0, z_mm: 0, d_mm: d },
      { x_mm: L / 4, z_mm: 0, d_mm: d },
      { x_mm: -L / 4, z_mm: 0, d_mm: d },
    ];
  },
  toBox: (s) => ({
    length: s.length,
    height: s.thickness,
    width: s.width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "qr_plate",
    system: s.system,
    length_mm: s.length,
    width_mm: s.width,
    thickness_mm: s.thickness,
    screw_d_mm: s.screw_d,
    slot_len_mm: s.slot_len,
    holes: [...(QRPlate.autoMarkers!(s)), ...s.extraHoles],
  }),
};

// 6) Electronics Enclosure IP65
export type EnclosureState = {
  length: number;
  width: number;
  height: number;
  wall: number;          // espesor
  pcb_standoffs: boolean;
  pcb_grid_mm: number;   // rejilla para tetones PCB
  holes: Marker[];
};

export const EnclosureIP65: ModelDef<EnclosureState> = {
  id: "enclosure_ip65",
  label: "Enclosure IP65",
  allowFreeHoles: true,
  sliders: [
    { key: "length", label: "Longitud (mm)", min: 60, max: 220, step: 1 },
    { key: "width", label: "Ancho (mm)", min: 40, max: 180, step: 1 },
    { key: "height", label: "Alto (mm)", min: 25, max: 120, step: 1 },
    { key: "wall", label: "Espesor pared (mm)", min: 2.5, max: 6, step: 0.5 },
    { key: "pcb_grid_mm", label: "Rejilla PCB (mm)", min: 10, max: 30, step: 1 },
  ],
  defaults: {
    length: 120,
    width: 80,
    height: 45,
    wall: 3,
    pcb_standoffs: true,
    pcb_grid_mm: 20,
    holes: [],
  },
  toBox: (s) => ({
    length: s.length,
    height: s.height,
    width: s.width,
    thickness: s.wall,
  }),
  toPayload: (s) => ({
    model: "enclosure_ip65",
    length_mm: s.length,
    width_mm: s.width,
    height_mm: s.height,
    wall_mm: s.wall,
    pcb_standoffs: s.pcb_standoffs,
    pcb_grid_mm: s.pcb_grid_mm,
    holes: s.holes,
  }),
};

// 7) Cable Clip
export type ClipType = "C" | "U";

export type CableClipState = {
  diameter: number;
  width: number;
  thickness: number;
  clip_type: ClipType;
  tab: boolean; // pestaña
};

export const CableClip: ModelDef<CableClipState> = {
  id: "cable_clip",
  label: "Cable Clip",
  allowFreeHoles: false,
  sliders: [
    { key: "diameter", label: "Ø cable (mm)", min: 3, max: 20, step: 0.5 },
    { key: "width", label: "Ancho (mm)", min: 6, max: 24, step: 0.5 },
    { key: "thickness", label: "Espesor (mm)", min: 1.8, max: 4, step: 0.2 },
  ],
  defaults: {
    diameter: 8,
    width: 12,
    thickness: 2.4,
    clip_type: "C",
    tab: true,
  },
  toBox: (s) => ({
    length: Math.max(20, s.diameter * 1.2),
    height: s.thickness,
    width: s.width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "cable_clip",
    diameter_mm: s.diameter,
    width_mm: s.width,
    thickness_mm: s.thickness,
    clip_type: s.clip_type,
    tab: s.tab,
  }),
};

// ——— Registry export
export const MODELS = {
  cable_tray: CableTray,
  vesa_adapter: VesaAdapter,
  router_mount: RouterMount,
  phone_stand: PhoneStand,
  qr_plate: QRPlate,
  enclosure_ip65: EnclosureIP65,
  cable_clip: CableClip,
} as const;
