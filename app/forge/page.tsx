// app/forge/page.tsx
"use client";

import ForgeForm from "@/components/ForgeForm";

export default function ForgePage({ searchParams }: { searchParams?: Record<string, string> }) {
  const initialModel = (searchParams?.model || "vesa-adapter").replace(/-/g, "_");
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <ForgeForm initialModel={initialModel} />
    </main>
  );
}
