import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SALIMO. | ¿Salimo? Encontrá dónde.",
  description: "Descubrí bares, pubs y cervecerías de San Miguel de Tucumán y Yerba Buena.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
