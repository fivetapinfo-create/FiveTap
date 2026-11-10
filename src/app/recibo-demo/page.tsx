import type { Metadata } from "next";
import { Receipt } from "@/components/Receipt";

export const metadata: Metadata = { title: "Recibo · vista previa — FiveTap", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ n?: string }> };

// Preview of the receipt animation shown after a payment, with sample data.
export default async function ReceiptPreview({ searchParams }: Props) {
  const { n } = await searchParams;
  return (
    <main className="pay" style={{ paddingTop: 48 }}>
      <Receipt data={{ item: "Plan mensual", detail: "10 placas · FiveTap Business", amount: 129, per: "/ mes", venue: n?.slice(0, 60) || "La Terraza", order: "FT-2048", paidWith: "PayPal" }} />
    </main>
  );
}
