"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

type GeometryTool = {
  id: string;
  icon: string;
  name: string;
  copy: string;
  detail: string;
  accent: string;
};

const TOOLS: GeometryTool[] = [
  { id: "holes", icon: "○", name: "Agujeros", copy: "Diámetro y posición", detail: "Perforaciones paramétricas colocadas con precisión sobre la cara seleccionada.", accent: "#67e8f9" },
  { id: "slots", icon: "▭", name: "Ranuras", copy: "Largo, ancho y giro", detail: "Ranuras técnicas con longitud, anchura y rotación controladas.", accent: "#60a5fa" },
  { id: "rebates", icon: "◉", name: "Rebajes", copy: "Counterbore técnico", detail: "Rebajes concéntricos para tornillería, cabezas y alojamientos.", accent: "#22d3ee" },
  { id: "patterns", icon: "⌗", name: "Patrones", copy: "Lineal, rejilla y VESA", detail: "Distribuciones repetibles y patrones de montaje listos para fabricación.", accent: "#38bdf8" },
  { id: "vents", icon: "≋", name: "Ventilación", copy: "Lineal y hexagonal", detail: "Aberturas repetidas para favorecer el flujo de aire sin perder control geométrico.", accent: "#2dd4bf" },
  { id: "waves", icon: "∿", name: "Ondulaciones", copy: "Relieve estructural", detail: "Relieves y nervaduras onduladas para rigidez, agarre y lenguaje visual.", accent: "#818cf8" },
  { id: "cuts", icon: "□", name: "Cortes", copy: "Rectangular y circular", detail: "Vacía zonas de la pieza con cortes limpios y dimensiones reproducibles.", accent: "#a78bfa" },
  { id: "channels", icon: "╱", name: "Canales", copy: "Paso de cable", detail: "Canales guiados para organizar cableado y recorridos funcionales.", accent: "#06b6d4" },
  { id: "ribs", icon: "▲", name: "Refuerzos", copy: "Nervios aditivos", detail: "Añade material solo donde aporta rigidez y soporte estructural.", accent: "#34d399" },
];

const TOOL_DURATION = 3500;

function GridPlane() {
  return (
    <>
      <defs>
        <linearGradient id="plane" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#0b1d30" />
          <stop offset="1" stopColor="#081421" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect x="42" y="64" width="436" height="202" rx="24" fill="url(#plane)" stroke="#1e3a56" />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={"v"+i} x1={74 + i * 48} y1="72" x2={74 + i * 48} y2="258" stroke="#16324c" strokeWidth="1" />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={"h"+i} x1="50" y1={96 + i * 36} x2="470" y2={96 + i * 36} stroke="#16324c" strokeWidth="1" />
      ))}
    </>
  );
}

function ToolAnimation({ tool }: { tool: GeometryTool }) {
  const reduceMotion = useReducedMotion();
  const loop = reduceMotion ? { duration: 0.01 } : { duration: 1.6, repeat: Infinity, repeatDelay: 0.35, ease: "easeInOut" as const };
  const accent = tool.accent;

  return (
    <svg viewBox="0 0 520 320" className="h-full w-full" role="img" aria-label={"Demostración de " + tool.name}>
      <GridPlane />
      <motion.g
        key={tool.id}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        {tool.id === "holes" && (
          <>
            <circle cx="260" cy="164" r="46" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.circle cx="260" cy="164" r="10" fill="none" stroke={accent} strokeWidth="4"
              animate={reduceMotion ? undefined : { r: [8, 30, 8], opacity: [1, 0.25, 1] }} transition={loop} filter="url(#glow)" />
            <motion.circle cx="260" cy="164" r="18" fill="#06111d" stroke={accent} strokeWidth="2"
              animate={reduceMotion ? undefined : { scale: [0.75, 1, 0.75] }} transition={loop} />
          </>
        )}

        {tool.id === "slots" && (
          <>
            <rect x="150" y="118" width="220" height="92" rx="20" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.rect x="192" y="150" width="136" height="28" rx="14" fill="#06111d" stroke={accent} strokeWidth="3"
              animate={reduceMotion ? undefined : { x: [192, 208, 192], width: [136, 104, 136] }} transition={loop} filter="url(#glow)" />
          </>
        )}

        {tool.id === "rebates" && (
          <>
            <circle cx="260" cy="164" r="64" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.circle cx="260" cy="164" r="36" fill="#0a1b2b" stroke={accent} strokeWidth="3"
              animate={reduceMotion ? undefined : { r: [24, 38, 24] }} transition={loop} />
            <circle cx="260" cy="164" r="15" fill="#06111d" stroke="#d5f8ff" strokeWidth="2" />
          </>
        )}

        {tool.id === "patterns" && (
          <>
            <rect x="150" y="104" width="220" height="120" rx="22" fill="#102840" stroke="#31516f" strokeWidth="2" />
            {[0,1,2].flatMap((row) => [0,1,2,3].map((col) => {
              const delay = (row * 4 + col) * 0.08;
              return <motion.circle key={row+"-"+col} cx={194 + col * 44} cy={136 + row * 32} r="7" fill="#06111d" stroke={accent} strokeWidth="2"
                animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.7, 1, 0.7] }}
                transition={{ ...loop, delay }} />;
            }))}
          </>
        )}

        {tool.id === "vents" && (
          <>
            <rect x="146" y="110" width="228" height="108" rx="22" fill="#102840" stroke="#31516f" strokeWidth="2" />
            {[0,1,2,3,4].map((i) => (
              <motion.rect key={i} x={174 + i * 35} y="142" width="20" height="44" rx="10" fill="#06111d" stroke={accent} strokeWidth="2"
                animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], y: [144, 138, 144] }}
                transition={{ ...loop, delay: i * 0.12 }} />
            ))}
          </>
        )}

        {tool.id === "waves" && (
          <>
            <rect x="136" y="116" width="248" height="96" rx="22" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.path d="M164 168 C190 124 216 212 242 168 S294 124 320 168 S346 212 360 168" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"
              animate={reduceMotion ? undefined : { pathLength: [0.15, 1, 0.15], opacity: [0.4, 1, 0.4] }} transition={loop} filter="url(#glow)" />
          </>
        )}

        {tool.id === "cuts" && (
          <>
            <rect x="150" y="110" width="220" height="112" rx="22" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.rect x="214" y="136" width="92" height="58" rx="8" fill="#06111d" stroke={accent} strokeWidth="3"
              animate={reduceMotion ? undefined : { scale: [0.72, 1, 0.72], opacity: [0.35, 1, 0.35] }} transition={loop} />
          </>
        )}

        {tool.id === "channels" && (
          <>
            <rect x="138" y="116" width="244" height="96" rx="22" fill="#102840" stroke="#31516f" strokeWidth="2" />
            <motion.path d="M170 184 C205 122 250 210 292 150 C318 115 344 128 356 154" fill="none" stroke={accent} strokeWidth="14" strokeLinecap="round"
              animate={reduceMotion ? undefined : { pathLength: [0.2, 1, 0.2] }} transition={loop} />
            <path d="M170 184 C205 122 250 210 292 150 C318 115 344 128 356 154" fill="none" stroke="#06111d" strokeWidth="8" strokeLinecap="round" />
          </>
        )}

        {tool.id === "ribs" && (
          <>
            <rect x="146" y="124" width="228" height="84" rx="18" fill="#102840" stroke="#31516f" strokeWidth="2" />
            {[0,1,2,3].map((i) => (
              <motion.path key={i} d={"M"+(184+i*46)+" 188 L"+(206+i*46)+" 144 L"+(228+i*46)+" 188"} fill="none" stroke={accent} strokeWidth="8" strokeLinejoin="round"
                animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], y: [8, 0, 8] }}
                transition={{ ...loop, delay: i * 0.1 }} />
            ))}
          </>
        )}
      </motion.g>
    </svg>
  );
}

export default function GeometryToolShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touring, setTouring] = useState(false);
  const activeTool = TOOLS[activeIndex];

  const selectTool = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!touring) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % TOOLS.length);
    }, TOOL_DURATION);
    return () => window.clearInterval(timer);
  }, [touring]);

  const progress = useMemo(() => ((activeIndex + 1) / TOOLS.length) * 100, [activeIndex]);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="listbox" aria-label="Herramientas geométricas">
        {TOOLS.map((tool, index) => {
          const active = index === activeIndex;
          return (
            <motion.button
              key={tool.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => selectTool(index)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={
                "group relative overflow-hidden rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300/80 " +
                (active
                  ? "border-cyan-300/60 bg-cyan-300/[0.09] shadow-[0_0_32px_rgba(34,211,238,.14)]"
                  : "border-white/10 bg-white/[0.045] hover:border-cyan-300/25 hover:bg-cyan-300/[0.06]")
              }
            >
              {active && (
                <motion.span
                  layoutId="geometry-tool-active"
                  className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="text-xl font-light text-cyan-300">{tool.icon}</div>
                <span className={"mt-1 h-2 w-2 rounded-full transition " + (active ? "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" : "bg-white/10")} />
              </div>
              <div className="mt-3 text-sm font-black">{tool.name}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-400">{tool.copy}</div>
            </motion.button>
          );
        })}
      </div>

      <div className="relative min-h-[340px] overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-[#06111d] shadow-[0_28px_80px_rgba(0,0,0,.28)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(34,211,238,.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,.025),transparent)]" />
        <div className="relative flex h-full min-h-[340px] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Vista previa interactiva</div>
              <div className="mt-1 text-sm font-black">{activeTool.name}</div>
            </div>
            <button
              type="button"
              onClick={() => setTouring((value) => !value)}
              className={
                "rounded-xl border px-3 py-2 text-[11px] font-black transition " +
                (touring
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")
              }
              aria-pressed={touring}
            >
              {touring ? "Pausar tour" : "Ver tour interactivo"}
            </button>
          </div>

          <div className="grid flex-1 items-center md:grid-cols-[1fr_210px]">
            <div className="relative min-h-[260px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTool.id}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.015 }}
                  transition={{ duration: 0.24 }}
                  className="absolute inset-0"
                >
                  <ToolAnimation tool={activeTool} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-white/10 p-5 md:border-l md:border-t-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Qué hace</div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{activeTool.detail}</p>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Estado</div>
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.7)]" />
                  Demo geométrica
                </div>
              </div>
            </div>
          </div>

          <div className="h-1 bg-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-300 to-blue-500"
              animate={{ width: touring ? ["0%", "100%"] : progress + "%" }}
              transition={touring ? { duration: TOOL_DURATION / 1000, ease: "linear", repeat: Infinity } : { duration: 0.25 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
