// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teknovashop Forge',
  description: 'Genera STL paramétricos en segundos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-white text-[#0b1526] dark:bg-black dark:text-white">
        {children}
      </body>
    </html>
  );
}
