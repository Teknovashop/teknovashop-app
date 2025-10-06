// app/api/files/signed-url/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

// Resuelve lo que venga en `key` a una ruta real de STL dentro del bucket.
// - Si viene un slug simple: "vesa-adapter" -> "vesa-adapter/forge-output.stl"
// - Si viene carpeta:       "vesa-adapter/" -> "vesa-adapter/forge-output.stl"
// - Si viene ruta directa:  "vesa-adapter/forge-output.stl" -> se respeta.
function resolvePath(keyRaw: string) {
  let key = keyRaw.trim().replace(/^\/+/, "");
  if (!key) return null;

  // Si ya apunta a un STL dentro de alguna carpeta, devolver tal cual
  if (key.endsWith(".stl")) return key;

  // Si es slug o carpeta, siempre apuntamos al output por defecto
  key = key.replace(/\/+$/, ""); // quitar barra final si la hay
  return `${key}/forge-output.stl`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    if (!keyParam) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }

    const path = resolvePath(keyParam);
    if (!path) {
      return NextResponse.json({ error: "Invalid 'key' query param" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Comprobación ligera: listar 1 elemento exacto
    // (si no existe, Supabase firmará igual pero la URL 404 confunde al usuario)
    const folder = path.split("/").slice(0, -1).join("/");
    const fileName = path.split("/").pop();

    const { data: listData, error: listErr } = await supabase
      .storage
      .from(BUCKET)
      .list(folder || "", { search: fileName, limit: 1000 });

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }
    const exists = (listData || []).some(f => f.name === fileName);
    if (!exists) {
      return NextResponse.json({ error: `Object not found for '${keyParam}'` }, { status: 404 });
    }

    // Firmar URL de descarga (1 hora)
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60, {
        download: fileName, // sugerir nombre
      });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Could not sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
