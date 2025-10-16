// components/ModelSelector.tsx
"use client";

type Option = { label: string; value: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  label?: string;
};

export default function ModelSelector({
  value,
  onChange,
  options,
  className = "",
  label = "Modelo",
}: Props) {
  return (
    <label className={`flex w-full flex-col gap-1 text-sm ${className}`}>
      <span className="text-neutral-600">{label}</span>
      <select
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
