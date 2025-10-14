// /components/HeroPreview.tsx
export default function HeroPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
      {/* grid sutil */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="p-6 md:p-10">
        <div className="mx-auto aspect-video w-full max-w-3xl rounded-xl bg-neutral-100 dark:bg-neutral-800 grid place-items-center">
          {/* Pieza “falsa” minimalista */}
          <div className="rounded-xl bg-neutral-300/70 dark:bg-neutral-600/60 p-4 shadow-inner">
            <div className="h-24 w-40 rounded-lg bg-neutral-200 dark:bg-neutral-700 relative">
              {/* 4 “agujeros” */}
              {[
                ["12%", "18%"],
                ["70%", "18%"],
                ["12%", "66%"],
                ["70%", "66%"],
              ].map(([x, y], i) => (
                <span
                  key={i}
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400/80 dark:bg-neutral-500"
                  style={{ left: x, top: y }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
