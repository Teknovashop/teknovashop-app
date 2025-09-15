// app/forge/page.tsx
import ForgeForm from "@/components/ForgeForm";

export const metadata = {
  title: "Configurador | Teknovashop Forge",
};

export default function ForgePage() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "28px 16px 48px",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          margin: "0 0 8px 0",
          color: "#0f172a",
          letterSpacing: -0.2,
        }}
      >
        Configurador
      </h1>
      <div style={{ color: "#6b7280", marginBottom: 18 }}>
        Ajusta los parámetros y genera el STL. Arrastra para rotar · rueda para
        zoom · Shift+arrastrar para pan.
      </div>

      <ForgeForm />
    </section>
  );
}
