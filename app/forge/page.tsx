// app/forge/page.tsx
"use client";

import dynamic from "next/dynamic";
import ForgeForm from "@/components/ForgeForm";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

export default function ForgePage({ searchParams }: { searchParams?: Record<string, string> }) {
  // Normaliza slug a snake_case para evitar el bug cable-tray vs cable_tray
  const initialModel = (searchParams?.model || "vesa-adapter").replace(/-/g, "_");

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ForgeForm initialModel={initialModel} />
        {/* El visor ya incluye su propia barra de controles alineada al borde superior derecho */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white/60 p-3 shadow-sm backdrop-blur md:bg-white/40">
          <STLViewer />
        </div>
      </div>
    </main>
  );
}
