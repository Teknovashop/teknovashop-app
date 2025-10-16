// components/ModelSelector.tsx
"use client";

type Option = { label: string; value: string };

export default function ModelSelector({
  value,
  onChange,
  options,
  placeholder = "Selecciona modelo…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">Modelo</span>
      <select
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {value ? null : (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

