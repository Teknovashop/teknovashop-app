"use client";

import React, { useMemo } from "react";

type Props = {
  url?: string;               // URL firmada de Supabase
  height?: number;            // alto del visor (px)
  background?: string;        // color de fondo
  className?: string;
};

export default function STLPreview({
  url,
  height = 460,
  background = "#ffffff",
  className,
}: Props) {
  // Construimos src del iframe: /stl-viewer.html?src=<url>
  const iframeSrc = useMemo(() => {
    if (!url) return "/stl-viewer.html";
    const u = new URL("/stl-viewer.html", location.origin);
    u.searchParams.set("src", url);
    // cache-bust por si la URL firmada se reutiliza
    u.searchParams.set("_", Date.now().toString());
    return u.toString();
  }, [url]);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        background,
      }}
    >
      <iframe
        key={iframeSrc}        // fuerza remonte al cambiar url
        src={iframeSrc}
        title="STL Viewer"
        style={{ width: "100%", height: "100%", border: "0" }}
        allow="accelerometer; gyroscope"
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );
}
