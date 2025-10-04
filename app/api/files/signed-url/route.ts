import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "forge-stl";

function normalizeKey(k: string) {
  return k.replace(/^\/+/, "").replace(/^public\//, "");
}

export async function GET(req: Request) {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get("key") || "";
    const key = normalizeKey(rawKey);
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // --- 1) Intento directo tal cual (raíz o path dado) ---
    const direct = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60, { download: key.split("/").pop() });

    if (direct.data?.signedUrl) {
      return NextResponse.json({ url: direct.data.signedUrl });
    }

    // --- 2) Fallbacks por patrón ---
    // key típico que viene del front: "vesa-adapter.stl" o "router-mount.stl"
    const requestedName = key.split("/").pop() || key;         // vesa-adapter.stl
    const stem = requestedName.replace(/\.stl$/i, "");         // vesa-adapter
    const stemUS = stem.replace(/-/g, "_");                    // vesa_adapter

    // candidatos de carpetas (raíz, con guiones, con guiones bajos)
    const candidates: string[] = ["", `${stem}/`, `${stemUS}/`];

    // Función de ayuda para buscar una coincidencia .stl por lista
    const findMatch = (items: { name: string }[], folderPrefix = "") => {
      const match = items.find(
        (it) =>
          it.name === requestedName ||
          (it.name.toLowerCase().endsWith(".stl") &&
            (it.name.startsWith(`${stem}-`) ||
             it.name.startsWith(`${stemUS}-`) ||
             it.name === `${stem}.stl` ||
             it.name === `${stemUS}.stl`))
      );
      return match ? (folderPrefix ? `${folderPrefix}${match.name}` : match.name) : null;
    };

    // a) buscar en raíz
    const rootList = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
    let foundKey = findMatch(rootList.data || "");
    // b) buscar en carpeta con guiones
    if (!foundKey) {
      const listDash = await supabase.storage.from(BUCKET).list(stem, { limit: 1000 });
      foundKey = findMatch(listDash.data || [], `${stem}/`);
    }
    // c) buscar en carpeta con guiones bajos
    if (!foundKey) {
      const listUS = await supabase.storage.from(BUCKET).list(stemUS, { limit: 1000 });
      foundKey = findMatch(listUS.data || [], `${stemUS}/`);
    }

    if (!foundKey) {
      const msg = direct.error?.message || "Object not found";
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const alt = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(foundKey, 60, { download: requestedName });
    if (!alt.data?.signedUrl) {
      const msg = alt.error?.message || "No se pudo firmar el objeto";
      const code = /not found/i.test(msg) ? 404 : 500;
      return NextResponse.json({ error: msg }, { status: code });
    }

    return NextResponse.json({ url: alt.data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
