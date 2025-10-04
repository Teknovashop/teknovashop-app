import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stem = (searchParams.get('stem') || '').trim(); // p.ej. "cable-tray"
    if (!stem) {
      return NextResponse.json({ error: "Missing 'stem' query param" }, { status: 400 });
    }

    // Variantes de carpeta y nombre de fichero que realmente existen en tu bucket
    // (según las capturas que has pasado).
    const hyphen = stem;
    const underscore = stem.replace(/-/g, '_');

    // Orden de búsqueda (primer match gana):
    const candidates = [
      // Carpeta con guiones → forge-output.stl
      `${hyphen}/forge-output.stl`,
      // Carpeta con guiones bajos → forge-output.stl
      `${underscore}/forge-output.stl`,

      // Carpeta con guiones → <stem>.stl
      `${hyphen}/${hyphen}.stl`,
      // Carpeta con guiones bajos → <stem>.stl (con guiones)
      `${underscore}/${hyphen}.stl`,
      // Carpeta con guiones bajos → <stem>.stl (con guiones bajos)
      `${underscore}/${underscore}.stl`,

      // Fichero suelto en raíz (hemos visto que tienes alguno como vesa-adapter.stl)
      `${hyphen}.stl`,
      `${underscore}.stl`,
    ];

    // Comprobamos cuál existe realmente
    let foundKey: string | null = null;
    for (const key of candidates) {
      const { data, error } = await supabase.storage.from(BUCKET).list(key.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: key.split('/').pop(),
      });
      if (error) continue;
      if (data && data.find((f: any) => f.name === key.split('/').pop())) {
        foundKey = key;
        break;
      }
    }

    if (!foundKey) {
      return NextResponse.json(
        { error: `Object not found for '${stem}'` },
        { status: 404 }
      );
    }

    // Firmamos URL de descarga (p.ej. 60 minutos)
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(foundKey, 60 * 60, { download: true });

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message || 'No se pudo firmar la URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signed.signedUrl, key: foundKey });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
