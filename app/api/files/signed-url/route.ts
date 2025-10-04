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

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Intento directo
    const direct = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60, { download: key.split("/").pop() });

    if (direct.data?.signedUrl) {
      return NextResponse.json({ url: direct.data.signedUrl });
    }

    // 2) Fallback: buscar por prefijo en la raíz (e.g. router-mount-xxxx.stl)
    const requestedName = key.split("/").pop() || key;
    const stem = requestedName.replace(/\.stl$/i, "");

    const listRes = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
    const alt = (listRes.data || []).find(
      (it) =>
        it.name === requestedName ||
        (it.name.toLowerCase().endsWith(".stl") &&
          (it.name.startsWith(`${stem}-`) || it.name.startsWith(`${stem}/`)))
    );

    if (!alt) {
      const msg = direct.error?.message || "Object not found";
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const altSigned = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(alt.name, 60, { download: requestedName });

    if (!altSigned.data?.signedUrl) {
      const msg = altSigned.error?.message || "No se pudo firmar el objeto";
      const code = /not found/i.test(msg) ? 404 : 500;
      return NextResponse.json({ error: msg }, { status: code });
    }

    return NextResponse.json({ url: altSigned.data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
