import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { BusinessLogo } from "@/components/BusinessLogo";
import { CardSaveHint } from "@/components/CardSaveHint";
import { palette } from "@/lib/brand";
import { COPY, langFrom } from "@/lib/i18n";
import { cardByToken, programFor } from "@/lib/loyalty-cards";
import { requestOrigin } from "@/lib/origin";
import { deleteMyCard } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ nueva?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const card = await cardByToken(token);
  const name = card ? `${card.business.name}` : "Tarjeta";
  return {
    title: card ? `Tarjeta · ${name}` : "Tarjeta de fidelidad",
    robots: { index: false, follow: false },
    manifest: `/tarjeta/${token}/manifest.webmanifest`,
    icons: { icon: `/tarjeta/${token}/icon?s=192`, apple: `/tarjeta/${token}/icon?s=180` },
    appleWebApp: { capable: true, title: name.slice(0, 20), statusBarStyle: "black" },
  };
}

/** The customer's loyalty card: the venue's colors, the stamps, and the QR the staff scans for the next stamp. */
export default async function CardPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const card = await cardByToken(token);
  if (!card) notFound();
  const copy = COPY[langFrom((await headers()).get("accept-language"))];
  const program = await programFor(card.business_id);
  const b = card.business;
  const p = palette(b.brand_color, b.brand_accent);
  const full = card.stamps >= program.stamps_needed;
  const qr = await QRCode.toString(`${await requestOrigin()}/tarjeta/${token}/sellar`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0a0a", light: "#ffffff" } });
  const style = { "--lc-bg": p.custom ? p.brand : "#141414", "--lc-ink": p.custom ? p.onBrand : "#f6f5f1", "--lc-accent": p.custom ? p.accentSoft : "#e8e6df" } as React.CSSProperties;

  return (
    <main className="lc-page">
      <section className="lc" style={style}>
        <header className="lc-top">
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="lc-logo" />
          <div className="lc-id"><b>{b.name}</b><small>{copy.card}</small></div>
        </header>
        <div className="lc-holder">{card.name}</div>
        <ol className={`lc-stamps${program.stamps_needed > 10 ? " many" : ""}`} aria-label={`${card.stamps} / ${program.stamps_needed} ${copy.cardStamps}`}>
          {Array.from({ length: program.stamps_needed }, (_, k) => (
            <li key={k} className={k < card.stamps ? "on" : undefined}>
              {k < card.stamps ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg> : k + 1 === program.stamps_needed ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 20V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" /></svg> : null}
            </li>
          ))}
        </ol>
        <div className="lc-status">
          {full ? <><b>{copy.cardReady}</b><span>{copy.cardReadyHint}</span></> : <><b>{card.stamps} / {program.stamps_needed} {copy.cardStamps}</b><span>{copy.cardLeft.replace("{n}", String(program.stamps_needed - card.stamps))}</span></>}
        </div>
        <div className="lc-prize"><small>{copy.cardPrize}</small><b>{program.reward || "—"}</b></div>
        <div className="lc-qr">
          <div className="lc-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
          <div><small>{copy.cardShow}</small><b className="lc-code">{card.code.slice(0, 3)} {card.code.slice(3)}</b></div>
        </div>
        {card.rewards > 0 && <small className="lc-rewards">{copy.cardRewards}: {card.rewards}</small>}
      </section>
      <CardSaveHint fresh={sp.nueva === "1"} copy={{ save: copy.cardSave, ios: copy.cardSaveIos, android: copy.cardSaveAndroid, saved: copy.cardSaved }} />
      <details className="lc-delete">
        <summary>Borrar mi tarjeta y mis datos</summary>
        <form action={deleteMyCard}>
          <input type="hidden" name="token" value={token} />
          <label className="check"><input type="checkbox" name="confirm" value="1" required /><span>Entiendo que pierdo mis sellos.</span></label>
          <button type="submit" className="btn btn-ghost btn-sm">Borrar</button>
        </form>
      </details>
      <p className="lc-foot">FiveTap</p>
    </main>
  );
}
