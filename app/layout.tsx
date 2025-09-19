// app/layout.tsx
export const metadata = {
  title: "Teknovashop Forge",
  description:
    "Generador paramétrico de piezas 3D listo para producción. Crea, visualiza y descarga STL en segundos.",
};

import "./globals.css"; // <-- IMPORTANTE

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "#0b0f19",
            borderBottom: "1px solid #1f2937",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#e5e7eb",
            }}
          >
            <a href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <strong style={{ letterSpacing: 0.3 }}>Teknovashop Forge</strong>
            </a>
            <nav style={{ display: "flex", gap: 16 }}>
              <a
                href="/forge"
                style={{
                  color: "#e5e7eb",
                  textDecoration: "none",
                  padding: "8px 12px",
                  border: "1px solid #374151",
                  borderRadius: 8,
                }}
              >
                Abrir Configurador
              </a>
              <a
                href="https://github.com/Teknovashop"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#9ca3af", textDecoration: "none" }}
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer
          style={{
            borderTop: "1px solid #e5e7eb",
            marginTop: 48,
            padding: "24px 0",
            color: "#6b7280",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
            © {new Date().getFullYear()} Teknovashop · Hecho para crear
          </div>
        </footer>
      </body>
    </html>
  );
}
