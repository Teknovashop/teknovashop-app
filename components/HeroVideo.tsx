'use client';

type Props = {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean; // activa si quieres mostrar controles
};

export default function HeroVideo({ src, poster, className = '', controls = false }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/60 shadow-sm ${className}`}
    >
      {/* fondo cuadriculado suave */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#edf2f7_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* wrapper con relación 16:9 para mantener proporción y centrar */}
      <div className="relative w-full aspect-[16/9]">
        <video
          className="absolute inset-0 h-full w-full object-contain object-center"
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
    </div>
  );
}
