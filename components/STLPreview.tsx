"use client";
import React from "react";

type Props = {
  url?: string;   // URL firmada de Supabase
  height?: number;
  background?: string; // ej. "#ffffff"
};

export default function STLPreview({ url, height = 420, background = "#ffffff" }: Props) {
  if (!url) {
    return (
      <div
        style={{
          height,
          border: "1px dashed #ddd",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        Genera o selecciona un STL para previsualizarlo
      </div>
    );
  }

  // Pasamos la URL del STL por query param a la página estática del viewer
  const src = `/stl-viewer.html?src=${encodeURIComponent(url)}&bg=${encodeURIComponent(background)}`;

  return (
    <iframe
      src={src}
      width="100%"
      height={height}
      style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
      allow="fullscreen"
    />
  );
}
