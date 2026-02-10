import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SportMatch Admin - Panel de Administración",
  description: "Panel de administración para gestionar canchas deportivas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-pt-16">
      <body className="antialiased min-h-screen">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
