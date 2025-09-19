"use client";

import type { ModelId } from "@/models/registry";

export default function ModelSelector({
  value,
  onChange,
}: { value: ModelId; onChange: (m: ModelId) => void }) {
  const items: { id: ModelId; label: string }[] = [
    { id: "cable_tray", label: "Cable Tray" },
    { id: "vesa_adapter", label: "VESA Adapter" },
    { id: "router_mount", label: "Router Mount" },
  ];

  return (
    <div className="mb-3 flex gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${value === it.id ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
