// models/registry.ts

// ——— Tipos base// models/registry.ts
export type ModelId =
  | "cable_tray"
  | "vesa_adapter"
  | "router_mount"
  | "phone_stand"
  | "qr_plate"
  | "enclosure_ip65"
  | "cable_clip"
  | "vesa_shelf"; // y cualquier otro que veas en /models del backend

// … (estructura de sliders/defaults como ya la tienes)


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
  sliders: SliderDef[];
  defaults: State;
  allowFreeHoles: boolean;
  autoMarkers?: (s: State) => Marker[];
  toBox: (s: State) => { length: number; height: number; width: number; thickness?: number };
  toPayload: (s: State) => any;
};

// ——— 1) Cable Tray
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
    // variantes aceptadas por el backend
    width: s.width,
    height: s.height,
    length: s.length,
    thickness: s.thickness,
    width_mm: s.width,
    height_mm: s.height,
    length_mm: s.length,
    thickness_mm: s.thickness,
    ventilated: s.ventilated,
    holes: s.holes,
  }),
};

// ——— 2) VESA Adapter
export type VesaPattern = 75 | 100 | 200;

export type VesaAdapterState = {
  plateWidth: number;   // tamaño placa cuadrada (visual / opcional en backend)
  plateHeight: number;  // sólo para visor
  thickness: number;
  pattern: VesaPattern; // 75, 100 o 200
  holeDiameter: number; // Ø de los agujeros del patrón
  extraHoles: Marker[]; // agujeros libres extra
};

export const VesaAdapter: ModelDef<VesaAdapterState> = {
  id: "vesa_adapter",
  label: "VESA Adapter",
  allowFreeHoles: true,
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
    // variantes (logs del backend mostraban vesa_mm, thickness, clearance?, hole)
    vesa_mm: s.pattern,
    thickness: s.thickness,
    hole: s.holeDiameter,
    // duplicados habituales
    thickness_mm: s.thickness,
    vesa_pattern_mm: s.pattern,
    vesa_hole_d_mm: s.holeDiameter,
    plate_size_mm: s.plateWidth,
    // agujeros patrón + extra
    holes: [...(VesaAdapter.autoMarkers!(s)), ...s.extraHoles],
  }),
};

// ——— 3) Router Mount (balda en L)
export type RouterMountState = {
  width: number;     // ancho total
  depth: number;     // fondo de la balda
  flange: number;    // ala vertical
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
    // variantes vistas en logs: router_width, router_depth, thickness, holes
    router_width: s.width,
    router_depth: s.depth,
    thickness: s.thickness,
    // también enviamos las estándar
    width: s.width,
    depth: s.depth,
    flange: s.flange,
    width_mm: s.width,
    depth_mm: s.depth,
    flange_mm: s.flange,
    thickness_mm: s.thickness,
    holes: s.holes,
  }),
};

// ——— 4) Universal Phone Stand
export type PhoneStandState = {
  angle_deg: number;
  support_depth: number;
  width: number;
  thickness: number;
  anti_slip: boolean;
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
    support_depth: s.support_depth,
    width: s.width,
    thickness: s.thickness,
    support_depth_mm: s.support_depth,
    width_mm: s.width,
    thickness_mm: s.thickness,
    anti_slip: s.anti_slip,
  }),
};

// ——— 5) Quick-Release Plate
export type QRSystem = "arca" | "manfrotto";

export type QRPlateState = {
  system: QRSystem;
  length: number;
  width: number;
  thickness: number;
  screw_d: number;
  slot_len: number;
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
    width: 38,
    thickness: 8,
    screw_d: 6.5,
    slot_len: 22,
    extraHoles: [],
  },
  autoMarkers: (s) => {
    const d = s.screw_d;
    const L = s.length;
    return [
      { x_mm: 0, z_mm: 0, d_mm: d },
      { x_mm:  L / 4, z_mm: 0, d_mm: d },
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
    length: s.length,
    width: s.width,
    thickness: s.thickness,
    screw_d: s.screw_d,
    slot_len: s.slot_len,
    length_mm: s.length,
    width_mm: s.width,
    thickness_mm: s.thickness,
    screw_d_mm: s.screw_d,
    slot_len_mm: s.slot_len,
    holes: [...(QRPlate.autoMarkers!(s)), ...s.extraHoles],
  }),
};

// ——— 6) Enclosure IP65
export type EnclosureState = {
  length: number;
  width: number;
  height: number;
  wall: number;
  pcb_standoffs: boolean;
  pcb_grid_mm: number;
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
    length: s.length,
    width: s.width,
    height: s.height,
    wall: s.wall,
    length_mm: s.length,
    width_mm: s.width,
    height_mm: s.height,
    wall_mm: s.wall,
    pcb_standoffs: s.pcb_standoffs,
    pcb_grid_mm: s.pcb_grid_mm,
    holes: s.holes,
  }),
};

// ——— 7) Cable Clip
export type ClipType = "C" | "U";

export type CableClipState = {
  diameter: number;
  width: number;
  thickness: number;
  clip_type: ClipType;
  tab: boolean;
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
    diameter: s.diameter,
    width: s.width,
    thickness: s.thickness,
    diameter_mm: s.diameter,
    width_mm: s.width,
    thickness_mm: s.thickness,
    clip_type: s.clip_type,
    tab: s.tab,
  }),
};

// ——— 8) VESA Shelf + Quick Release (NUEVO)
export type VesaShelfState = {
  vesa_mm: 75 | 100 | 200;
  thickness: number;
  shelf_width: number;
  shelf_depth: number;
  lip_height: number;
  vesa_hole_d: number;
  extraHoles: Marker[];
};

export const VesaShelf: ModelDef<VesaShelfState> = {
  id: "vesa_shelf",
  label: "VESA Shelf",
  allowFreeHoles: true,
  sliders: [
    { key: "vesa_mm", label: "Patrón VESA (mm)", min: 75, max: 200, step: 25 },
    { key: "shelf_width", label: "Ancho balda (mm)", min: 120, max: 400, step: 1 },
    { key: "shelf_depth", label: "Fondo balda (mm)", min: 80, max: 300, step: 1 },
    { key: "lip_height", label: "Pestaña frontal (mm)", min: 0, max: 30, step: 1 },
    { key: "thickness", label: "Espesor (mm)", min: 3, max: 8, step: 0.5 },
    { key: "vesa_hole_d", label: "Ø VESA (mm)", min: 3, max: 8, step: 0.5 },
  ],
  defaults: {
    vesa_mm: 100,
    thickness: 5,
    shelf_width: 220,
    shelf_depth: 160,
    lip_height: 10,
    vesa_hole_d: 5,
    extraHoles: [],
  },
  autoMarkers: (s) => {
    const p = s.vesa_mm;
    const d = s.vesa_hole_d;
    return [
      { x_mm:  p / 2, z_mm:  p / 2, d_mm: d },
      { x_mm: -p / 2, z_mm:  p / 2, d_mm: d },
      { x_mm:  p / 2, z_mm: -p / 2, d_mm: d },
      { x_mm: -p / 2, z_mm: -p / 2, d_mm: d },
    ];
  },
  toBox: (s) => ({
    length: s.shelf_depth,
    height: s.thickness,
    width: s.shelf_width,
    thickness: s.thickness,
  }),
  toPayload: (s) => ({
    model: "vesa_shelf",
    // claves sencillas
    vesa_mm: s.vesa_mm,
    thickness: s.thickness,
    shelf_width: s.shelf_width,
    shelf_depth: s.shelf_depth,
    lip_height: s.lip_height,
    vesa_hole_d: s.vesa_hole_d,
    // duplicados _mm por compatibilidad
    thickness_mm: s.thickness,
    shelf_width_mm: s.shelf_width,
    shelf_depth_mm: s.shelf_depth,
    lip_height_mm: s.lip_height,
    vesa_hole_d_mm: s.vesa_hole_d,
    holes: [...(VesaShelf.autoMarkers!(s)), ...s.extraHoles],
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
  vesa_shelf: VesaShelf,
} as const;
