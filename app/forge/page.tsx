// /app/forge/page.tsx
import ForgeForm from "@/components/ForgeForm";

export default function ForgePage() {
  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">
        Configurador
      </h1>
      <ForgeForm />
    </main>
  );
}
