// app/forge/page.tsx
"use client";

import { useEffect } from "react";
import ForgeForm from "@/components/ForgeForm";
import ViewerHUD from "@/components/ViewerHUD";

export default function ForgePage() {
  // Montamos la HUD dentro del slot del layout
  useEffect(() => {
    const slot = document.getElementById("viewer-hud-slot");
    if (!slot) return;
    // ya está en layout: solo aseguramos que exista; la HUD se renderiza como parte de esta página
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <ForgeForm />
      </div>

      {/* Contenedor del visor; tu canvas/three ya escucha los mismos eventos */}
      <div className="rounded-2xl border bg-white p-2">
        <div id="forge-view" className="h-[70vh] w-full rounded-lg bg-neutral-100" />
      </div>

      {/* HUD bajo el header */}
      <ViewerHUD />
    </div>
  );
}
