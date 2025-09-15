// app/page.tsx
export default function Landing() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "48px 16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 44,
              lineHeight: 1.1,
              margin: 0,
              color: "#0f172a",
              letterSpacing: -0.2,
            }}
          >
            Genera <span style={{ color: "#3b82f6" }}>STL paramétricos</span> en
            segundos
          </h1>
          <p style={{ marginTop: 16, fontSize: 18, color: "#374151" }}>
            Un flujo rápido y profesional: ajusta parámetros, genera la pieza y
            previsualízala en 3D. Pensado para makers y empresas.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <a
              href="/forge"
              style={{
                background: "#111827",
                color: "white",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #111827",
              }}
            >
              Empezar ahora
            </a>
            <a
              href="https://teknovashop-forge.onrender.com/health"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#111827",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
              }}
            >
              Estado del backend
            </a>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {[
              { title: "Rápido", text: "Optimizado para generar STL al vuelo." },
              { title: "Pro", text: "Visor 3D con controles tipo CAD." },
              { title: "Escalable", text: "Listo para features premium." },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  {f.title}
                </div>
                <div style={{ color: "#6b7280", marginTop: 6 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            background:
              "radial-gradient(80% 120% at 50% 0%, #ffffff 0%, #f3f4f6 60%, #e5e7eb 100%)",
            minHeight: 320,
          }}
        >
          <div style={{ padding: 18, color: "#6b7280" }}>
            Vista previa del configurador
          </div>
          <div
            style={{
              height: 260,
              borderTop: "1px dashed #e5e7eb",
              backgroundImage:
                "linear-gradient(#f3f4f6 1px, transparent 1px), linear-gradient(90deg, #f3f4f6 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
        </div>
      </div>
    </section>
  );
}
