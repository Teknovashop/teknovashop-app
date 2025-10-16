// components/ModelSelector.tsx
"use client";

type Option = { label: string; value: string };

export default function ModelSelector({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
}) {
  return (
    <select
      className={className || "w-full rounded-md border border-neutral-300 bg-white px-3 py-2"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
