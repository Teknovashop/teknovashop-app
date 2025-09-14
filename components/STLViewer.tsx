"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const ReactSTLViewer = dynamic(() => import("react-stl-viewer"), { ssr: false });

type Props = { url?: string; height?: number };

export default function STLViewer({ url, height = 420 }: Props) {
  const style = useMemo<React.CSSProperties>(
    () => ({ width: "100%", height, background: "transparent" }),
    [height]
  );

  if (!url) {
    return (
      <div className="w-full h-[420px] grid place-items-center rounded-2xl border border-gray-200">
        <p className="text-sm text-gray-500">Genera un STL para previsualizarlo aquí</p>
      </div>
    );
  }

  // @ts-expect-error tipos del paquete
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200">
      <ReactSTLViewer url={url} style={style} orbitControls shadows={false} ground />
    </div>
  );
}
