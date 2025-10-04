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

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 60, { download: key.split("/").pop() });

    if (error || !data?.signedUrl) {
      const msg = error?.message || "Object not found";
      const code = /not found/i.test(msg) ? 404 : 500;
      return NextResponse.json({ error: msg }, { status: code });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
