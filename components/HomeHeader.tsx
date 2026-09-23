"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function Cube() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.4 7.7 7.6 4.2 7.6-4.2M12 12v9" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span className={"absolute left-0 top-1 block h-0.5 w-5 bg-current transition " + (open ? "translate-y-1.5 rotate-45" : "")} />
      <span className={"absolute left-0 top-2.5 block h-0.5 w-5 bg-current transition " + (open ? "opacity-0" : "")} />
      <span className={"absolute left-0 top-4 block h-0.5 w-5 bg-current transition " + (open ? "-translate-y-1.5 -rotate-45" : "")} />
    </span>
  );
}

const NAV = [
  ["Plantillas", "#templates"],
  ["Cómo funciona", "#how"],
  ["Tecnología", "#quality"],
  ["Precios", "#pricing"],
  ["FAQ", "#faq"],
];

export default function HomeHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071321]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071321]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_10px_28px_rgba(37,99,235,.32)] transition group-hover:-rotate-3 group-hover:scale-105">
            <Cube />
          </span>
          <span className="tracking-tight">Teknovashop <span className="text-cyan-300">Forge</span></span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-slate-300 lg:flex" aria-label="Navegación principal">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-white focus-visible:outline-none focus-visible:text-white">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login?next=/forge" className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-white/30 hover:bg-white/[0.05] sm:inline-flex">
            Iniciar sesión
          </Link>
          <Link href="/forge" className="home-primary-btn hidden md:inline-flex">
            Probar configurador <Arrow />
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white transition hover:bg-white/[0.06] lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <div
        className={
          "absolute inset-x-0 top-16 border-b border-white/10 bg-[#071321]/98 px-5 shadow-2xl backdrop-blur-2xl transition-all duration-200 lg:hidden " +
          (open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")
        }
      >
        <nav className="mx-auto max-w-7xl py-5" aria-label="Navegación móvil">
          <div className="grid gap-1">
            {NAV.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <Link href="/login?next=/forge" onClick={() => setOpen(false)} className="home-secondary-btn !py-3">
              Iniciar sesión
            </Link>
            <Link href="/forge" onClick={() => setOpen(false)} className="home-primary-btn !py-3">
              Configurador <Arrow />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
