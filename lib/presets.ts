// /lib/presets.ts
export type ExamplePreset = {
  slug: string;
  title: string;
  caption: string;
  payload: {
    model: string;
    params: {
      length_mm: number;
      width_mm: number;
      height_mm: number;
      thickness_mm?: number;
      fillet_mm?: number;
    };
    holes?: Array<{ x_mm: number; y_mm: number; d_mm: number }>;
  };
};

/**
 * He elegido sólo modelos que sé que tienes en el backend:
 * cable_tray, vesa_adapter, router_mount, camera_mount, wall_bracket
 * (Si añades más modelos al backend, aquí podemos sumar más cards.)
 */
export const PRESETS: ExamplePreset[] = [
  {
    slug: "vesa-100-plate",
    title: "Placa VESA 100×100",
    caption:
      "Universal 120×120×4 mm con patrón VESA 100. Lista para monitores y brazos.",
    payload: {
      model: "vesa_adapter",
      params: { length_mm: 120, width_mm: 120, height_mm: 4, thickness_mm: 4, fillet_mm: 1 },
      holes: [
        { x_mm: 10, y_mm: 10, d_mm: 5 },
        { x_mm: 110, y_mm: 10, d_mm: 5 },
        { x_mm: 10, y_mm: 110, d_mm: 5 },
        { x_mm: 110, y_mm: 110, d_mm: 5 },
      ],
    },
  },
  {
    slug: "vesa-75-plate",
    title: "Placa VESA 75×75",
    caption:
      "Compacta 100×100×3.5 mm; ideal para pantallas pequeñas o montajes ligeros.",
    payload: {
      model: "vesa_adapter",
      params: { length_mm: 100, width_mm: 100, height_mm: 3.5, thickness_mm: 3.5, fillet_mm: 1 },
      holes: [
        { x_mm: 12.5, y_mm: 12.5, d_mm: 4.5 },
        { x_mm: 87.5, y_mm: 12.5, d_mm: 4.5 },
        { x_mm: 12.5, y_mm: 87.5, d_mm: 4.5 },
        { x_mm: 87.5, y_mm: 87.5, d_mm: 4.5 },
      ],
    },
  },
  {
    slug: "cable-tray-wide",
    title: "Bandeja de cables 220×100×60",
    caption:
      "Canaleta abierta, pared 3 mm. Perfecta para dejar el escritorio limpio.",
    payload: {
      model: "cable_tray",
      params: { length_mm: 220, width_mm: 100, height_mm: 60, thickness_mm: 3, fillet_mm: 1.5 },
      holes: [
        { x_mm: 30, y_mm: 20, d_mm: 4 },
        { x_mm: 190, y_mm: 20, d_mm: 4 },
      ],
    },
  },
  {
    slug: "cable-tray-slim",
    title: "Canaleta slim 180×60×50",
    caption:
      "Perfil fino (2.5 mm) y discreto. Para cables USB y hubs ligeros.",
    payload: {
      model: "cable_tray",
      params: { length_mm: 180, width_mm: 60, height_mm: 50, thickness_mm: 2.5, fillet_mm: 1 },
      holes: [
        { x_mm: 30, y_mm: 15, d_mm: 3.5 },
        { x_mm: 150, y_mm: 15, d_mm: 3.5 },
      ],
    },
  },
  {
    slug: "router-mount-l",
    title: "Soporte Router en L",
    caption:
      "Base 140×90×4 con aleta vertical 120 mm. Monta tu router en pared o bajo mesa.",
    payload: {
      model: "router_mount",
      params: { length_mm: 140, width_mm: 90, height_mm: 120, thickness_mm: 4, fillet_mm: 1 },
      holes: [
        { x_mm: 20, y_mm: 15, d_mm: 5 },
        { x_mm: 120, y_mm: 15, d_mm: 5 },
      ],
    },
  },
  {
    slug: "wall-bracket-heavy",
    title: "Escuadra mural reforzada",
    caption:
      "Horizontal 160×60×5 + vertical 100 mm. Tres puntos de anclaje para cargas medias.",
    payload: {
      model: "wall_bracket",
      params: { length_mm: 160, width_mm: 60, height_mm: 100, thickness_mm: 5, fillet_mm: 1 },
      holes: [
        { x_mm: 20, y_mm: 30, d_mm: 6 },
        { x_mm: 80, y_mm: 30, d_mm: 6 },
        { x_mm: 140, y_mm: 30, d_mm: 6 },
      ],
    },
  },
  {
    slug: "camera-base",
    title: "Base para cámara",
    caption:
      "Plataforma 120×80×4 con columna y taladro 1/4\". Para trípodes y rigs.",
    payload: {
      model: "camera_mount",
      params: { length_mm: 120, width_mm: 80, height_mm: 60, thickness_mm: 4, fillet_mm: 1 },
      holes: [{ x_mm: 60, y_mm: 40, d_mm: 6.35 }],
    },
  },
  {
    slug: "wall-bracket-mini",
    title: "Escuadra mini",
    caption:
      "Formato 100×40×70 con 2 anclajes. Perfecta para estantes ligeros y sensores.",
    payload: {
      model: "wall_bracket",
      params: { length_mm: 100, width_mm: 40, height_mm: 70, thickness_mm: 4, fillet_mm: 0.8 },
      holes: [
        { x_mm: 20, y_mm: 20, d_mm: 5 },
        { x_mm: 80, y_mm: 20, d_mm: 5 },
      ],
    },
  },
];
