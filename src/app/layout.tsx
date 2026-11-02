import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_URL } from "@/lib/site";
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
  title: "FiveTap — Más reseñas. Más clientes.",
  description: "Un toque en la mesa y tu cliente deja su reseña en Google en segundos. Para restaurantes y cafés.",
  openGraph: {
    title: "FiveTap — Más reseñas. Más clientes.",
    description: "Un toque en la mesa y tu cliente deja su reseña en Google en segundos.",
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
    <html lang="es" className={satoshi.variable}>
      <body>{children}</body>
    </html>
  );
}
