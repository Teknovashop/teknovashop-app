"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function MobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={
        "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/94 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,.12)] backdrop-blur-xl transition duration-300 md:hidden " +
        (show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0")
      }
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black text-[#07111f]">¿Tienes una medida?</div>
          <div className="truncate text-[10px] text-slate-500">Prueba el configurador en 3D</div>
        </div>
        <Link href="/forge" className="home-primary-btn !px-4 !py-2.5">
          Abrir Forge
        </Link>
      </div>
    </div>
  );
}
