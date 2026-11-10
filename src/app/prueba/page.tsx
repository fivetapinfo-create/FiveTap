import { permanentRedirect } from "next/navigation";

// The free trial is gone: old /prueba links go to the sign-up page.
export default async function OldTrial({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  permanentRedirect(n ? `/empezar?n=${encodeURIComponent(n)}` : "/empezar");
}
