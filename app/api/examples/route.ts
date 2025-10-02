// /app/api/examples/route.ts
import { NextResponse } from "next/server";

type Params = {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  thickness_mm?: number;
  fillet_mm?: number;
};
type Hole = { x_mm: number; y_mm: number; d_mm: number };

type Example = {
  id: string;
  model: "cable_tray" | "vesa_adapter" | "router_mount" | "camera_mount" | "wall_bracket";
  title: string;
  description: string;
  tip?: string;
  params: Params;
  holes?: Hole[];
};

const FORGE_API =
  process.env.NEXT_PUBLIC_FORGE_API_URL?.replace(/\/+$/, "") ||
  ""; // ← OBLIGATORIO configurarlo en Vercel

// 12 ejemplos (todos modelos existentes en tu backend)
const EXAMPLES: Example[] = [
  {
    id: "vesa-100",
    model: "vesa_adapter",
    title: "Placa VESA 100×100",
    description: "Universal 120×120×4 mm con patrón VESA 100. Lista para monitores y brazos.",
    tip: "Cambia el grosor si el brazo es pesado.",
    params: { length_mm: 120, width_mm: 120, height_mm: 4, thickness_mm: 4, fillet_mm: 2 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 5 },
      { x_mm: 100, y_mm: 20, d_mm: 5 },
      { x_mm: 20, y_mm: 100, d_mm: 5 },
      { x_mm: 100, y_mm: 100, d_mm: 5 },
    ],
  },
  {
    id: "vesa-75",
    model: "vesa_adapter",
    title: "Placa VESA 75×75",
    description: "Compacta 100×100×3.5 mm; ideal para pantallas pequeñas o montajes ligeros.",
    tip: "Añade fillet 2–3 mm para bordes suaves.",
    params: { length_mm: 100, width_mm: 100, height_mm: 3.5, thickness_mm: 3.5, fillet_mm: 2 },
    holes: [
      { x_mm: 12.5, y_mm: 12.5, d_mm: 4.2 },
      { x_mm: 87.5, y_mm: 12.5, d_mm: 4.2 },
      { x_mm: 12.5, y_mm: 87.5, d_mm: 4.2 },
      { x_mm: 87.5, y_mm: 87.5, d_mm: 4.2 },
    ],
  },
  {
    id: "tray-220-100-60",
    model: "cable_tray",
    title: "Bandeja de cables 220×100×60",
    description: "Canaleta abierta, pared 3 mm. Perfecta para dejar el escritorio limpio.",
    tip: "Usa agujeros Ø4 para tornillos a pared.",
    params: { length_mm: 220, width_mm: 100, height_mm: 60, thickness_mm: 3, fillet_mm: 1.5 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 4 },
      { x_mm: 200, y_mm: 80, d_mm: 4 },
    ],
  },
  {
    id: "tray-180-80-50",
    model: "cable_tray",
    title: "Bandeja compacta 180×80×50",
    description: "Gestión de cables ligera para setups minimalistas.",
    params: { length_mm: 180, width_mm: 80, height_mm: 50, thickness_mm: 2.5, fillet_mm: 1.2 },
  },
  {
    id: "router-mount-200x120x80",
    model: "router_mount",
    title: "Soporte router 200×120×80",
    description: "Soporte en L para routers/modems, base firme y vertical de 80 mm.",
    tip: "Sube el grosor si tu equipo es pesado.",
    params: { length_mm: 200, width_mm: 120, height_mm: 80, thickness_mm: 4, fillet_mm: 2 },
    holes: [{ x_mm: 40, y_mm: 20, d_mm: 4 }, { x_mm: 160, y_mm: 100, d_mm: 4 }],
  },
  {
    id: "router-mount-160x100x70",
    model: "router_mount",
    title: "Soporte router 160×100×70",
    description: "Formato reducido para estanterías estrechas.",
    params: { length_mm: 160, width_mm: 100, height_mm: 70, thickness_mm: 3, fillet_mm: 1.5 },
  },
  {
    id: "camera-base-100x80x40",
    model: "camera_mount",
    title: "Base cámara 100×80×40",
    description: "Base con columna central para cámaras ligeras.",
    tip: "Agujero central Ø6 para tornillo 1/4\" con adaptador.",
    params: { length_mm: 100, width_mm: 80, height_mm: 40, thickness_mm: 3, fillet_mm: 2 },
    holes: [{ x_mm: 50, y_mm: 40, d_mm: 6 }],
  },
  {
    id: "camera-base-120x90x50",
    model: "camera_mount",
    title: "Base cámara 120×90×50",
    description: "Superficie mayor y columna más alta para mayor estabilidad.",
    params: { length_mm: 120, width_mm: 90, height_mm: 50, thickness_mm: 3.5, fillet_mm: 2 },
  },
  {
    id: "wall-bracket-150x60x80",
    model: "wall_bracket",
    title: "Escuadra pared 150×60×80",
    description: "Placa vertical + horizontal; ideal para baldas o cajas.",
    tip: "Añade dos agujeros Ø5 para fijación segura.",
    params: { length_mm: 150, width_mm: 60, height_mm: 80, thickness_mm: 4, fillet_mm: 1.5 },
    holes: [
      { x_mm: 30, y_mm: 20, d_mm: 5 },
      { x_mm: 120, y_mm: 20, d_mm: 5 },
    ],
  },
  {
    id: "wall-bracket-120x50x70",
    model: "wall_bracket",
    title: "Escuadra pared 120×50×70",
    description: "Compacta y robusta con pared 4 mm.",
    params: { length_mm: 120, width_mm: 50, height_mm: 70, thickness_mm: 4, fillet_mm: 1.5 },
  },
  {
    id: "tray-300-120-80-heavy",
    model: "cable_tray",
    title: "Bandeja XL 300×120×80 (reforzada)",
    description: "Para tiradas largas de cables. Pared 4 mm.",
    params: { length_mm: 300, width_mm: 120, height_mm: 80, thickness_mm: 4, fillet_mm: 2 },
  },
  {
    id: "vesa-100-slim",
    model: "vesa_adapter",
    title: "VESA 100×100 slim",
    description: "Perfil bajo 120×120×3 mm para monitores ligeros.",
    params: { length_mm: 120, width_mm: 120, height_mm: 3, thickness_mm: 3, fillet_mm: 1.2 },
    holes: [
      { x_mm: 20, y_mm: 20, d_mm: 4.2 },
      { x_mm: 100, y_mm: 20, d_mm: 4.2 },
      { x_mm: 20, y_mm: 100, d_mm: 4.2 },
      { x_mm: 100, y_mm: 100, d_mm: 4.2 },
    ],
  },
];

type GenResponse = {
  stl_url: string;
  object_key: string;
  thumb_url?: string | null;
};

const memCache = new Map<string, GenResponse>();

export async function GET() {
  try {
    if (!FORGE_API) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_FORGE_API_URL no configurada" },
        { status: 500 }
      );
    }

    // Genera/recupera miniaturas
    const out = await Promise.all(
      EXAMPLES.map(async (ex) => {
        const cacheKey = ex.id;
        if (memCache.has(cacheKey)) {
          const cached = memCache.get(cacheKey)!;
          return { ...ex, ...cached };
        }

        const body = {
          model: ex.model,
          params: ex.params,
          holes: ex.holes || [],
        };

        let gen: GenResponse = { stl_url: "", object_key: "", thumb_url: null };

        try {
          const r = await fetch(`${FORGE_API}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          gen = (await r.json()) as GenResponse;
          memCache.set(cacheKey, gen);
        } catch (e) {
          // Seguimos pero sin thumb (mostrará placeholder)
          gen = { stl_url: "", object_key: "", thumb_url: null };
        }

        // Link al visor con payload en la query
        const hrefForge = `/forge?model=${encodeURIComponent(
          ex.model
        )}&params=${encodeURIComponent(JSON.stringify(ex.params))}${
          ex.holes ? `&holes=${encodeURIComponent(JSON.stringify(ex.holes))}` : ""
        }&autogenerate=1`;

        return {
          ...ex,
          ...gen,
          hrefForge,
        };
      })
    );

    return NextResponse.json({ items: out }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
