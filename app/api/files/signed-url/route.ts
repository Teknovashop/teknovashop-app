import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'forge-stl';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function trySign(key: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 60 * 60, { download: true });
  if (data?.signedUrl && !error) {
    return { url: data.signedUrl, key };
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stem = (searchParams.get('stem') || '').trim(); // ej. "cable-tray"
    if (!stem) {
      return NextResponse.json({ error: "Missing 'stem' query param" }, { status: 400 });
    }

    // Variantes reales de tu bucket (guiones y guiones_bajos, carpeta/raíz)
    const hyphen = stem;
    const underscore = stem.replace(/-/g, '_');

    const candidates = [
      `${hyphen}/forge-output.stl`,
      `${underscore}/forge-output.stl`,
      `${hyphen}/${hyphen}.stl`,
      `${underscore}/${hyphen}.stl`,
      `${underscore}/${underscore}.stl`,
      `${hyphen}.stl`,
      `${underscore}.stl`,
    ];

    for (const key of candidates) {
      const signed = await trySign(key);
      if (signed) {
        return NextResponse.json({ url: signed.url, key: signed.key });
      }
    }

    return NextResponse.json(
      { error: `Object not found for '${stem}'` },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
