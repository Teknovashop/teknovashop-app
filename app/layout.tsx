export const metadata = {
  title: "Teknovashop Forge",
  description: "Generador paramétrico STL"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
