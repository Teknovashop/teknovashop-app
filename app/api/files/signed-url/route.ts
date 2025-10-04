import { NextResponse } from "next/server";

// Lee variables de entorno (desde Vercel)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

// Carga dinámica para no romper el build en Edge
async function getSupabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Normaliza un texto para comparar: minúsculas, sin espacios extras.
 */
function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

/**
 * Busca en un listado el primer archivo .stl que contenga el "stem".
 */
function findMatchByStem(list: any[] | null | undefined, stem: string) {
  if (!Array.isArray(list)) return null;
  const nstem = norm(stem).replace(/[_\s]+/g, "-");
  const candidates = list
    .filter((f) => f && f.name && /\.stl$/i.test(f.name))
    .filter((f) => norm(f.name).includes(nstem) || norm(f.name).includes(nstem.replace(/-/g, "_")));

  if (candidates.length === 0) return null;

  // Ordena por created_at (si existe) o por nombre, y coge el "más reciente"
  candidates.sort((a, b) => {
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (cb !== ca) return cb - ca;
    return norm(b.name).localeCompare(norm(a.name));
  });

  return candidates[0]?.name || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");

    if (!keyParam) {
      return NextResponse.json({ error: `Missing 'key' query param` }, { status: 400 });
    }

    const supabase = await getSupabase();

    // Si viene una key con extensión .stl o contiene '/', intentamos firmarla tal cual
    const rawKey = keyParam.replace(/^\/+/, "");
    const looksLikeFullKey = /\.stl$/i.test(rawKey) || rawKey.includes("/");

    let finalKey = rawKey;

    if (!looksLikeFullKey) {
      // Tratamos 'key' como "stem" (slug). Buscamos en:
      // a) raíz del bucket
      // b) carpeta 'stem' (con guiones)
      // c) carpeta 'stem' (con underscores)
      const stem = rawKey;

      // (a) root
      const rootList = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
      if (rootList.error) {
        return NextResponse.json(
          { error: `Supabase list root error: ${rootList.error.message}` },
          { status: 500 }
        );
      }
      const rootMatch = findMatchByStem(rootList.data, stem);
      if (rootMatch) {
        finalKey = rootMatch; // ej: 'vesa-adapter.stl'
      } else {
        // (b) carpeta con guiones
        const dashFolder = stem.replace(/[_\s]+/g, "-");
        const listDash = await supabase.storage.from(BUCKET).list(dashFolder, { limit: 1000 });
        if (!listDash.error) {
          const matchDash = findMatchByStem(listDash.data, stem);
          if (matchDash) finalKey = `${dashFolder}/${matchDash}`;
        }

        // (c) carpeta con underscores, si aún no encontramos
        if (finalKey === rawKey) {
          const underFolder = stem.replace(/[-\s]+/g, "_");
          const listUnder = await supabase.storage.from(BUCKET).list(underFolder, { limit: 1000 });
          if (!listUnder.error) {
            const matchUnder = findMatchByStem(listUnder.data, stem);
            if (matchUnder) finalKey = `${underFolder}/${matchUnder}`;
          }
        }
      }
    }

    // Si aún es el slug original, no encontramos nada
    if (finalKey === rawKey && !looksLikeFullKey) {
      return NextResponse.json(
        { error: `Object not found for stem '${rawKey}'` },
        { status: 404 }
      );
    }

    // Firmamos la URL por 60 segundos. Si el bucket es público, también podrías usar getPublicUrl.
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
