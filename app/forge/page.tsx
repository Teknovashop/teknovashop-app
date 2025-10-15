// app/forge/page.tsx
"use client";

import dynamic from "next/dynamic";
import ForgeForm from "@/components/ForgeForm";

const STLViewer = dynamic(() => import("@/components/STLViewer"), { ssr: false });

export default function ForgePage({ searchParams }: { searchParams?: Record<string, string> }) {
  const initialModel = (searchParams?.model || "vesa-adapter").replace(/-/g, "_");

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ✅ ForgeForm acepta la prop initialModel, tipada en ForgeFormProps */}
        <ForgeForm initialModel={initialModel} />

        <div className="rounded-2xl border border-neutral-200/70 bg-white/60 p-3 shadow-sm backdrop-blur md:bg-white/40">
          <STLViewer />
        </div>
      </div>
    </main>
  );
}
