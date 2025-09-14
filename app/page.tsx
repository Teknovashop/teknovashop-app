// app/page.tsx
import GenerateForm from '../components/GenerateForm';

export default function Page() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Teknovashop Forge</h1>
      <GenerateForm />
    </main>
  );
}
