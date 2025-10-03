// app/api/files/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'path requerido' }, { status: 400 });
    }

    const backend =
      process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (!backend) {
      return NextResponse.json(
        { error: 'Configura NEXT_PUBLIC_BACKEND_URL con tu Render' },
        { status: 500 }
      );
    }

    const r = await fetch(`${backend.replace(/\/$/, '')}/signed-url?path=${encodeURIComponent(path)}`, {
      cache: 'no-store',
      headers: { 'x-from': 'teknovashop-app' },
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: `Backend: ${text}` }, { status: 502 });
    }

    const data = await r.json(); // { signed_url: string }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
