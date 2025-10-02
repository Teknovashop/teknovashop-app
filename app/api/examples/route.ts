import { NextResponse } from "next/server";

// Lista de ejemplos estáticos (10 piezas con imágenes y params reales)
const examples = [
  {
    id: "vesa-100",
    model: "vesa_adapter",
    title: "Placa VESA 100×100",
    description: "Universal 120×120×4 mm con patrón VESA 100. Lista para monitores y brazos.",
    tip: "Cambia el grosor si el brazo es pesado.",
    params: { length_mm: 120, width_mm: 120, height_mm: 4, thickness_mm: 4 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 5 },
      { x_mm: 100, y_mm: 20, d_mm: 5 },
      { x_mm: 20, y_mm: 100, d_mm: 5 },
      { x_mm: 100, y_mm: 100, d_mm: 5 },
    ],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/vesa-100.png",
  },
  {
    id: "vesa-75",
    model: "vesa_adapter",
    title: "Placa VESA 75×75",
    description: "Compacta 100×100×3.5 mm; ideal para pantallas pequeñas o montajes ligeros.",
    tip: "Añade fillet 2–3 mm para bordes suaves.",
    params: { length_mm: 100, width_mm: 100, height_mm: 3.5, thickness_mm: 3.5 },
    holes: [
      { x_mm: 15, y_mm: 15, d_mm: 4 },
      { x_mm: 85, y_mm: 15, d_mm: 4 },
      { x_mm: 15, y_mm: 85, d_mm: 4 },
      { x_mm: 85, y_mm: 85, d_mm: 4 },
    ],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/vesa-75.png",
  },
  {
    id: "cable-220",
    model: "cable_tray",
    title: "Bandeja de cables 220×100×60",
    description: "Canaleta abierta, pared 3 mm. Perfecta para dejar el escritorio limpio.",
    tip: "Usa agujeros Ø4 para tornillos a pared.",
    params: { length_mm: 220, width_mm: 100, height_mm: 60, thickness_mm: 3 },
    holes: [],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/cable-220.png",
  },
  {
    id: "router-stand",
    model: "router_mount",
    title: "Soporte de router",
    description: "Soporte en L 150×80×120 mm para sujetar routers de sobremesa.",
    tip: "Ajusta ancho según tu dispositivo.",
    params: { length_mm: 150, width_mm: 80, height_mm: 120, thickness_mm: 4 },
    holes: [{ x_mm: 75, y_mm: 40, d_mm: 6 }],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/router-stand.png",
  },
  {
    id: "camera-base",
    model: "camera_mount",
    title: "Soporte de cámara",
    description: "Base 60×60×80 mm con columna para cámaras compactas.",
    tip: "Agujero central M6 para tornillo universal.",
    params: { length_mm: 60, width_mm: 60, height_mm: 80, thickness_mm: 4 },
    holes: [{ x_mm: 30, y_mm: 30, d_mm: 6 }],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/camera-base.png",
  },
  {
    id: "bracket-100",
    model: "wall_bracket",
    title: "Escuadra 100×100",
    description: "Escuadra de pared, grosor 4 mm. Multiusos para estantes ligeros.",
    tip: "Refuerza con 2 agujeros por brazo.",
    params: { length_mm: 100, width_mm: 40, height_mm: 100, thickness_mm: 4 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 5 },
      { x_mm: 80, y_mm: 20, d_mm: 5 },
    ],
    thumb_url: "https://YOUR-SUPABASE-URL/storage/v1/object/public/forge-stl/examples/bracket-100.png",
  },
  // 👉 Añade 5–6 ejemplos más en la misma línea
];

export async function GET() {
  try {
    return NextResponse.json(examples);
  } catch (e: any) {
    return new NextResponse("Error al cargar ejemplos", { status: 500 });
  }
}
