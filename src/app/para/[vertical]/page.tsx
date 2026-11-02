import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/Landing";
import { VERTICALS, verticalBySlug } from "@/lib/verticals";

type Props = { params: Promise<{ vertical: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => VERTICALS.map((v) => ({ vertical: v.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = verticalBySlug((await params).vertical);
  return v ? { title: `FiveTap para ${v.plural} — Más reseñas en Google` } : {};
}

export default async function VerticalLanding({ params }: Props) {
  const v = verticalBySlug((await params).vertical);
  if (!v) notFound();
  return <Landing vertical={v} />;
}
