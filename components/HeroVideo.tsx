'use client';

type Props = {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean; // por si quieres activar controles en el futuro
};

export default function HeroVideo({ src, poster, className = '', controls = false }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/60 shadow-sm ${className}`}>
      {/* fondo cuadriculado suave */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#edf2f7_1px,transparent_1px)] [background-size:20px_20px]" />
      <video
        className="relative z-10 block h-full w-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        controls={controls}
      />
    </div>
  );
}
