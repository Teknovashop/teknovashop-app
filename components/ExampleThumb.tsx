// components/ExampleThumb.tsx
"use client";

type ExampleThumbProps = {
  kind:
    | "cable_tray"
    | "vesa_adapter"
    | "router_mount"
    | "camera_mount"
    | "wall_bracket"
    | "desk_hook"
    | "fan_guard";
  className?: string;
};

export default function ExampleThumb({ kind, className }: ExampleThumbProps) {
  // Paleta neutra tipo CAD
  const bg = "#0f0f11";
  const face = "#d5d8dc";
  const edge = "#a9afb7";
  const accent = "#6ee7b7";

  return (
    <svg
      viewBox="0 0 320 200"
      width="100%"
      height="100%"
      className={className}
      role="img"
      aria-label={kind}
    >
      {/* Fondo y grid suave */}
      <defs>
        <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#1e1f22" strokeWidth="1" />
        </pattern>
        <linearGradient id="sh" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#111214" />
          <stop offset="100%" stopColor="#0a0b0c" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="200" fill="url(#sh)" />
      <rect x="0" y="0" width="320" height="200" fill="url(#grid)" />

      {/* Piezas estilizadas por tipo */}
      {kind === "cable_tray" && (
        <>
          <rect x="50" y="60" width="220" height="80" rx="10" fill={face} stroke={edge} />
          <rect x="62" y="72" width="196" height="56" rx="8" fill={bg} opacity="0.9" />
          {/* agujeros laterales */}
          <circle cx="90" cy="100" r="4" fill={bg} stroke={edge} />
          <circle cx="230" cy="100" r="4" fill={bg} stroke={edge} />
        </>
      )}

      {kind === "vesa_adapter" && (
        <>
          <rect x="80" y="45" width="160" height="110" rx="10" fill={face} stroke={edge} />
          {/* patrón 100x100 */}
          <circle cx="120" cy="85" r="6" fill={bg} stroke={edge} />
          <circle cx="200" cy="85" r="6" fill={bg} stroke={edge} />
          <circle cx="120" cy="115" r="6" fill={bg} stroke={edge} />
          <circle cx="200" cy="115" r="6" fill={bg} stroke={edge} />
        </>
      )}

      {kind === "router_mount" && (
        <>
          <rect x="50" y="120" width="220" height="24" rx="6" fill={face} stroke={edge} />
          <rect x="70" y="60" width="24" height="84" rx="6" fill={face} stroke={edge} />
          <circle cx="90" cy="130" r="4" fill={bg} stroke={edge} />
          <circle cx="250" cy="130" r="4" fill={bg} stroke={edge} />
        </>
      )}

      {kind === "camera_mount" && (
        <>
          <rect x="70" y="120" width="180" height="24" rx="6" fill={face} stroke={edge} />
          <rect x="150" y="78" width="40" height="44" rx="8" fill={face} stroke={edge} />
          <circle cx="110" cy="132" r="4" fill={bg} stroke={edge} />
          <circle cx="210" cy="132" r="4" fill={bg} stroke={edge} />
        </>
      )}

      {kind === "wall_bracket" && (
        <>
          <rect x="60" y="120" width="160" height="24" rx="6" fill={face} stroke={edge} />
          <rect x="200" y="60" width="24" height="84" rx="6" fill={face} stroke={edge} />
          <circle cx="90" cy="132" r="4" fill={bg} stroke={edge} />
          <circle cx="170" cy="132" r="4" fill={bg} stroke={edge} />
        </>
      )}

      {kind === "desk_hook" && (
        <>
          <rect x="70" y="130" width="140" height="18" rx="9" fill={face} stroke={edge} />
          <path
            d="M210,130 Q210,90 240,90 Q270,90 270,120"
            fill="none"
            stroke={face}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M210,130 Q210,90 240,90 Q270,90 270,120"
            fill="none"
            stroke={edge}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}

      {kind === "fan_guard" && (
        <>
          <circle cx="160" cy="100" r="56" fill={face} stroke={edge} />
          <circle cx="160" cy="100" r="28" fill={bg} stroke={edge} />
          {/* radios */}
          <line x1="160" y1="44" x2="160" y2="156" stroke={edge} strokeWidth="2" />
          <line x1="104" y1="100" x2="216" y2="100" stroke={edge} strokeWidth="2" />
          <line x1="124" y1="64" x2="196" y2="136" stroke={edge} strokeWidth="2" />
          <line x1="196" y1="64" x2="124" y2="136" stroke={edge} strokeWidth="2" />
        </>
      )}

      {/* acento */}
      <circle cx="24" cy="24" r="4" fill={accent} />
    </svg>
  );
}
