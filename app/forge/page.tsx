"use client";

import ForgeForm from "@/components/ForgeForm";

export default function ForgePage() {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">Teknovashop Forge</div>
          <nav className="flex items-center gap-3">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Inicio</a>
            <a
              href="https://github.com/Teknovashop/teknovashop-app"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ForgeForm />
      </main>
    </div>
  );
}
