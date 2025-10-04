// app/api/files/signed-url/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { FileObject } from "@supabase/storage-js";

// Lee variables (usa tus nombres actuales en Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "forge-stl";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[signed-url] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = (searchParams.get("key") || "").trim();

    if (!keyParam) {
      return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
    }

    // normalizamos: quitamos "public/" y "/" iniciales
    const key = keyParam.replace(/^\/+/, "").replace(/^public\//, "");
    // ejemplo: "vesa-adapter.stl" o "vesa-adapter/vesa-adapter.stl"
    const stem = key.replace(/\.stl$/i, "").split("/").pop() || "";
    const parentDir = key.includes("/") ? key.split("/")[0] : stem;
    const candidates: string[] = [];

    // helper: primer fichero .stl que empiece por "stem-" o igual a "stem.stl"
    const findMatch = (arr: FileObject[]) => {
      const byExact = arr.find((f) => f.name.toLowerCase() === `${stem}.stl`.toLowerCase());
      if (byExact) return byExact.name;
      const byPrefix = arr.find(
        (f) => f.name.toLowerCase().startsWith(`${stem}-`) && f.name.toLowerCase().endsWith(".stl")
      );
      return byPrefix?.name;
    };

    // a) buscar en raíz
    const rootList = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
    let foundKey = findMatch(rootList.data ?? []);

    // b) buscar en carpeta con guiones (p. ej. "router-mount/")
    if (!foundKey) {
      const listDash = await supabase.storage.from(BUCKET).list(stem, { limit: 1000 });
      const matchDash = findMatch(listDash.data ?? []);
      if (matchDash) foundKey = `${stem}/${matchDash}`;
    }

    // c) buscar en carpeta con guiones bajos (p. ej. "router_mount/")
    if (!foundKey) {
      const alt = stem.replace(/-/g, "_");
      const listUnd = await supabase.storage.from(BUCKET).list(alt, { limit: 1000 });
      const matchUnd = findMatch(listUnd.data ?? []);
      if (matchUnd) foundKey = `${alt}/${matchUnd}`;
    }

    // d) si el key venía ya con subcarpeta, intentamos exacto
    if (!foundKey && key.includes("/")) {
      // ejemplo: "vesa-adapter/vesa-adapter.stl"
      const parts = key.split("/");
      const dir = parts.slice(0, -1).join("/");
      const fname = parts[parts.length - 1];
      const listDir = await supabase.storage.from(BUCKET).list(dir, { limit: 1000 });
      const ok = (listDir.data ?? []).some((f) => f.name.toLowerCase() === fname.toLowerCase());
      if (ok) foundKey = key;
    }

    // e) último intento: buscar en carpeta parentDir cuando stem y parent difieren
    if (!foundKey && parentDir && parentDir !== stem) {
      const listParent = await supabase.storage.from(BUCKET).list(parentDir, { limit: 1000 });
      const matchParent = findMatch(listParent.data ?? []);
      if (matchParent) foundKey = `${parentDir}/${matchParent}`;
    }

    if (!foundKey) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 });
    }

    const sign = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(foundKey, 60 /*segundos*/);

    if (!sign.data?.signedUrl) {
      return NextResponse.json(
        { error: sign.error?.message || "Cannot sign URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: sign.data.signedUrl, key: foundKey });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
