import Link from "next/link";
import { Logo } from "./Logo";

/** Plain, readable layout for the legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="legal">
      <Link href="/" aria-label="FiveTap — inicio"><Logo /></Link>
      <h1>{title}</h1>
      <p className="muted">Última actualización: {updated}</p>
      <div className="legal-body">{children}</div>
      <p className="legal-links">
        <Link href="/terminos">Términos</Link> · <Link href="/privacidad">Privacidad</Link> · <Link href="/">FiveTap</Link>
      </p>
    </main>
  );
}
