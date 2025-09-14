export const metadata = {
  title: "Teknovashop Forge",
  description: "Generador paramétrico (Cable Tray, VESA, Router Mount)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
