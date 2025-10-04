import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

function pickFirstStl(list: any[] | null | undefined) {
  if (!Array.isArray(list)) return null;
  const candidates = list.filter((f) => f && /\.stl$/i.test(f.name));
  if (candidates.length === 0) return null;
  // devuelve el más reciente o el primero
  candidates.sort((a, b) => {
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return cb - ca;
  });
  return candidates[0].name;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    if (!keyParam) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }

    const supabase = await getSupabase();
    let finalKey: string | null = null;

    // Si key viene con .stl, usarlo tal cual
    if (/\.stl$/i.test(keyParam)) {
      finalKey = keyParam;
    } else {
      // Buscar dentro de carpeta con slug (con guiones o underscores)
      const dashFolder = keyParam.replace(/[_\s]+/g, "-");
      const underFolder = keyParam.replace(/[-\s]+/g, "_");

      // a) carpeta con guiones
      const dashList = await supabase.storage.from(BUCKET).list(dashFolder, { limit: 1000 });
      if (!dashList.error) {
        const found = pickFirstStl(dashList.data);
        if (found) finalKey = `${dashFolder}/${found}`;
      }

      // b) si no hay nada, carpeta con underscores
      if (!finalKey) {
        const underList = await supabase.storage.from(BUCKET).list(underFolder, { limit: 1000 });
        if (!underList.error) {
          const found = pickFirstStl(underList.data);
          if (found) finalKey = `${underFolder}/${found}`;
        }
      }
    }

    if (!finalKey) {
      return NextResponse.json({ error: `Object not found for '${keyParam}'` }, { status: 404 });
    }

    // Firmar URL
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(finalKey, 60);
    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json(
        { error: signed.error?.message || "Could not create signed URL" },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: signed.data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
