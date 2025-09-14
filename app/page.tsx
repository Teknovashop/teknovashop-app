// /app/page.tsx
import ForgeForm from "@/components/ForgeForm";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Teknovashop Forge
      </h1>
      <p style={{ color: "#4b5563", marginBottom: 16 }}>
        Generador paramétrico (v1). Cable Tray listo; VESA y Router Mount llegarán
        en el siguiente paso.
      </p>

      <ForgeForm />
    </main>
  );
}
