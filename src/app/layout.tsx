import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/site";
import { THEME_BOOT } from "@/components/ThemeToggle";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "../fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FiveTap — Plataforma de reputación y clientes",
  description: "Convierte cada cliente en reputación: más reseñas auténticas en Google, mensajes privados al instante y resultados medidos en una sola plataforma.",
  openGraph: {
    title: "FiveTap — Plataforma de reputación y clientes",
    description: "Convierte cada cliente en reputación: más reseñas auténticas en Google, mensajes privados al instante y resultados medidos en una sola plataforma.",
    type: "website",
    locale: "es_PA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={satoshi.variable} suppressHydrationWarning>
      <head>
        {/* The panel and FiveTap Business remember light or dark per device. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
