import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = (process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl').trim();

/**
 * Firma una clave exacta si existe (retorna null si no existe)
 */
async function trySignExactPath(supabase: any, key: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 60);
  if (!error && data?.signedUrl) return data.signedUrl;
  return null;
}

/**
 * Lista un prefijo (carpeta) y devuelve el primer .stl firmado si existe
 */
async function trySignFirstStlInFolder(supabase: any, prefix: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !Array.isArray(data)) return null;

  // Prioridad: forge-output.stl, luego cualquier .stl
  const byName = (n: string) => data.find((f: any) => f.name.toLowerCase() === n);
  const forge = byName('forge-output.stl');
  const anyStl = forge || data.find((f: any) => f.name.toLowerCase().endsWith('.stl'));

  if (!anyStl) return null;
  const key = `${prefix.replace(/\/+$/, '')}/${anyStl.name}`;
  return await trySignExactPath(supabase, key);
}

/**
 * Busca varias variantes (raíz y carpetas con guiones/guiones_bajos)
 */
async function resolveAndSign(supabase: any, slugOrPath: string): Promise<{ url?: string, looked: string[] }> {
  const looked: string[] = [];

  // Si ya parece una ruta explícita (contiene '/' o termina en .stl) probamos tal cual
  if (slugOrPath.includes('/') || slugOrPath.toLowerCase().endsWith('.stl')) {
    const key = slugOrPath.replace(/^\/+/, '');
    looked.push(key);
    const url = await trySignExactPath(supabase, key);
    if (url) return { url, looked };
  }

  // Derivamos slug sin extensión
  const stem = slugOrPath.replace(/^\/+/, '').replace(/\.stl$/i, '');
  const stemUnd = stem.replace(/-/g, '_');

  // 1) raíz: `${stem}.stl`
  looked.push(`${stem}.stl`);
  let url = await trySignExactPath(supabase, `${stem}.stl`);
  if (url) return { url, looked };

  // 2) carpeta `${stem}` -> forge-output.stl o primer .stl
  looked.push(`${stem}/forge-output.stl`);
  url = await trySignFirstStlInFolder(supabase, stem);
  if (url) return { url, looked };

  // 3) carpeta `${stem}` -> `${stem}.stl`
  looked.push(`${stem}/${stem}.stl`);
  url = await trySignExactPath(supabase, `${stem}/${stem}.stl`);
  if (url) return { url, looked };

  // 4) carpeta con guiones bajos `${stemUnd}`
  looked.push(`${stemUnd}/forge-output.stl`);
  url = await trySignFirstStlInFolder(supabase, stemUnd);
  if (url) return { url, looked };

  // 5) carpeta `${stemUnd}` -> `${stemUnd}.stl`
  looked.push(`${stemUnd}/${stemUnd}.stl`);
  url = await trySignExactPath(supabase, `${stemUnd}/${stemUnd}.stl`);
  if (url) return { url, looked };

  // 6) por si hay <algo>.stl en raíz que empiece por stem (fallback)
  const root = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  if (Array.isArray(root.data)) {
    const cand = root.data.find((f: any) =>
      f.name.toLowerCase().startsWith(stem.toLowerCase()) && f.name.toLowerCase().endsWith('.stl')
    );
    if (cand) {
      looked.push(cand.name);
      url = await trySignExactPath(supabase, cand.name);
      if (url) return { url, looked };
    }
  }

  return { looked };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { url: signed, looked } = await resolveAndSign(supabase, key);
    if (!signed) {
      return NextResponse.json(
        { error: `Object not found for '${key}'`, looked },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: signed }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
