import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

/**
 * Normaliza la key que llega del front.
 * Si viene 'vesa-adapter' -> devuelve 'vesa-adapter/forge-output.stl'
 */
function resolvePath(key: string) {
  const clean = key.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (clean.endsWith(".stl")) return clean;
  return `${clean}/forge-output.stl`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }

    const path = resolvePath(key);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Verificamos si existe el fichero exacto
    const folder = path.split("/").slice(0, -1).join("/");
    const file = path.split("/").pop()!;
    const { data: files, error: listErr } = await supabase
      .storage
      .from(BUCKET)
      .list(folder, { search: file });

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const exists = files?.some((f) => f.name === file);
    if (!exists) {
      return NextResponse.json({ error: `Object not found for '${key}'` }, { status: 404 });
    }

    // Creamos URL firmada
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(path, 3600, { download: file });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Unable to sign URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
