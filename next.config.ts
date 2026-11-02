import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Going back to a section seen in the last 30 s is instant (actions still refresh it).
    staleTimes: { dynamic: 30, static: 300 },
    // Logos and company papers are uploaded through server actions.
    serverActions: { bodySizeLimit: "4.5mb" }, // Vercel caps request bodies at 4.5 MB.
  },
  // react-pdf ships its own fonts and layout engine; keep it out of the bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The OG image reads the font from disk at request time.
  // pdfkit loads its built-in fonts (Helvetica) with a dynamic require that
  // file tracing can't see, so the PDF routes list them explicitly.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/fonts/Satoshi-700.ttf"],
    "/admin/contratos/[id]/pdf": ["./node_modules/pdfkit/js/standard-fonts/**", "./src/fonts/*.ttf"],
    "/admin/empresa/acuerdo": ["./node_modules/pdfkit/js/standard-fonts/**", "./src/fonts/*.ttf"],
  },
};

export default config;
