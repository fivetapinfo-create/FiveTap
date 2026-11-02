import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { BusinessLogo } from "@/components/BusinessLogo";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "./PrintButton";
import { businessDetail } from "@/lib/data";
import { qrUrl } from "@/lib/site";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ formato?: string }> };

// "placa": table cards (90×120 mm, 4 per page) for acrylic holders.
// "cuadrada": stickers for the 120×120 mm square plaques (2 per page).
// "tarjeta": stickers the size of a credit card (54×85.6 mm, 9 per page) for
// the waiter cards and the card-in-stand plaques. Every piece has its own QR.
const FORMATS = {
  placa: { per: 4, label: "Placas 9 × 12 cm" },
  cuadrada: { per: 2, label: "Stickers placa 12 × 12 cm" },
  tarjeta: { per: 9, label: "Stickers tarjeta 5.4 × 8.6 cm" },
} as const;

/** A sheet of cards or stickers (logo + question + QR) to print or send to the print shop. */
export default async function PrintSheet({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const d = await businessDetail(id);
  if (!d) notFound();
  const { business: b } = d;
  const format: keyof typeof FORMATS = sp.formato === "tarjeta" || sp.formato === "cuadrada" ? sp.formato : "placa";
  const { per } = FORMATS[format];
  const tags = d.tags.filter((t) => t.active);
  const qrs = await Promise.all(
    tags.map((t) => QRCode.toString(qrUrl(t.code), { type: "svg", errorCorrectionLevel: "M", margin: 1 })),
  );
  // Whole pages only, so no card is ever split across two sheets.
  const pages = Array.from({ length: Math.ceil(tags.length / per) }, (_, p) => tags.slice(p * per, p * per + per));

  return (
    <main>
      <div className="print-bar container no-print">
        <Link className="crumb" href={`/admin/b/${b.id}`}>← {b.name}</Link>
        <div className="row">
          <div className="seg" role="tablist">
            {(Object.keys(FORMATS) as (keyof typeof FORMATS)[]).map((k) => (
              <Link key={k} role="tab" aria-selected={k === format} href={`?formato=${k}`} replace>
                {FORMATS[k].label}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>
      {pages.map((page, p) => (
        <div key={p} className={`sheet sheet-${format}`}>
          {page.map((t, j) => (
            <div key={t.id} className={format === "tarjeta" ? "sticker" : format === "cuadrada" ? "sticker sticker-sq" : "print-card"}>
              <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} />
              <h3>¿Cómo estuvo tu experiencia?</h3>
              <div className="qr" dangerouslySetInnerHTML={{ __html: qrs[p * per + j]! }} />
              <span className="hint">Acerca tu celular o escanea</span>
              <span className="brand"><LogoMark size={format === "tarjeta" ? 8 : 11} /> FiveTap · {t.label}</span>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
