import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { BusinessLogo } from "@/components/BusinessLogo";
import { CardReminder } from "@/components/CardReminder";
import { CardSaveHint } from "@/components/CardSaveHint";
import { palette } from "@/lib/brand";
import { COPY, langFrom } from "@/lib/i18n";
import { cardByToken, cardHistory, programFor } from "@/lib/loyalty-cards";
import { requestOrigin } from "@/lib/origin";
import { deleteMyCard, enterVisitCode } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ nueva?: string; sello?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const card = await cardByToken(token);
  const name = card ? card.business.name : "Tarjeta";
  return {
    title: card ? `Tarjeta · ${name}` : "Tarjeta de fidelidad",
    robots: { index: false, follow: false },
    manifest: `/tarjeta/${token}/manifest.webmanifest`,
    icons: { icon: `/tarjeta/${token}/icon?s=192`, apple: `/tarjeta/${token}/icon?s=180` },
    appleWebApp: { capable: true, title: name.slice(0, 20), statusBarStyle: "black" },
  };
}

const when = (iso: string, lang: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }).format(new Date(iso));

/** The customer's loyalty card: live data, the venue's colors, progress, the personal QR, history and conditions. */
export default async function CardPage({ params, searchParams }: Props) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const card = await cardByToken(token);
  if (!card) notFound();
  const lang = langFrom((await headers()).get("accept-language"));
  const copy = COPY[lang];
  const en = lang === "en";
  const [program, history] = await Promise.all([programFor(card.business_id), cardHistory(card.id)]);
  const b = card.business;
  const p = palette(b.brand_color, b.brand_accent);
  const need = program.stamps_needed;
  const ready = Boolean(card.reward_code) && card.stamps >= need;
  const left = Math.max(0, need - card.stamps);
  const qr = await QRCode.toString(`${await requestOrigin()}/tarjeta/${token}/sellar`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0a0a", light: "#ffffff" } });
  const bg = p.custom ? p.brand : "#1b1b1f";
  const style = { "--lc-bg": bg, "--lc-ink": p.custom ? p.onBrand : "#f6f5f1", "--lc-accent": p.custom ? p.accentSoft : "#f5a524", "--lc-p": `${Math.min(100, (card.stamps / need) * 100)}%` } as React.CSSProperties;
  const T = {
    visits: en ? "verified visits" : "visitas verificadas", left: en ? `${left} more for your reward` : `Te ${left === 1 ? "falta 1 visita" : `faltan ${left} visitas`} para tu recompensa`,
    id: en ? "Member ID" : "ID de cliente", history: en ? "History" : "Historial", terms: en ? "Conditions" : "Condiciones",
    codeQ: en ? "Got a visit code from the cashier?" : "¿Te dieron un código de visita en caja?", codeBtn: en ? "Add my visit" : "Sumar mi visita",
    readyT: en ? "Your reward is ready!" : "¡Tu recompensa está lista!", readyHow: en ? "Show this code at the counter. It works once." : "Muestra este código en caja. Sirve una sola vez.",
    stamp: en ? "Visit verified" : "Visita verificada", join: en ? "Card created" : "Tarjeta creada", redeem: en ? "Reward received" : "Recompensa recibida",
    ok1: en ? "Visit added!" : "¡Visita sumada!",
  };
  const rules = [
    en ? `Each verified visit adds 1 stamp: the staff scans your QR, or you enter the visit code the cashier gives you.` : `Cada visita verificada suma 1 sello: el personal escanea tu QR o escribes el código de visita que te dan en caja.`,
    en ? `Collect ${need} stamps and get: ${program.reward}.` : `Al juntar ${need} sellos recibes: ${program.reward}.`,
    program.cooldown_hours > 0 ? (en ? `Up to 1 stamp every ${program.cooldown_hours} h.` : `Máximo 1 sello cada ${program.cooldown_hours} h.`) : null,
    en ? "The reward code is personal and works once." : "El código de la recompensa es personal y sirve una sola vez.",
    program.terms || null,
  ].filter(Boolean) as string[];

  return (
    <main className="lc-page">
      {sp.sello && <p className="lc2-flash" role="status">{T.ok1}</p>}
      {sp.error && <p className="lc2-flash err" role="alert">{sp.error}</p>}
      <div className="lc2-stack" style={style}>
        <section className="lc2">
          <header className="lc2-top">
            <span className="lc2-chip">{program.name || (en ? "STAMPS" : "SELLOS")}</span>
            <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="lc2-logo" />
          </header>
          <h1 className="lc2-title">{b.name}</h1>
          <p className="lc2-holder">{card.name} · {T.id} {card.code.slice(0, 3)} {card.code.slice(3)}</p>
          <div className="lc2-bottom">
            <div className="lc2-progress">
              <i className="lc2-bar"><em /></i>
              <b className="num">{Math.min(card.stamps, need)} / {need} <span>{T.visits}</span></b>
            </div>
            <div className="lc2-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        </section>
      </div>

      {ready ? (
        <section className="lc2-ready">
          <div className="lc2-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as React.CSSProperties} />)}</div>
          <b>{T.readyT}</b>
          <span>{program.reward}</span>
          <strong className="lc2-code">{card.reward_code}</strong>
          <small>{T.readyHow}</small>
        </section>
      ) : (
        <section className="lc2-panel">
          <ol className={`lc2-dots${need > 12 ? " many" : ""}`} aria-hidden="true">{Array.from({ length: need }, (_, k) => <li key={k} className={k < card.stamps ? "on" : undefined} />)}</ol>
          <p className="lc2-left">{T.left} · <b>{program.reward}</b></p>
          <form action={enterVisitCode} className="lc2-codeform">
            <input type="hidden" name="token" value={token} />
            <label className="lc2-codelabel">{T.codeQ}<input className="input" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" required /></label>
            <button className="btn btn-dark" type="submit">{T.codeBtn}</button>
          </form>
        </section>
      )}

      <CardSaveHint fresh={sp.nueva === "1"} copy={{ save: copy.cardSave, ios: copy.cardSaveIos, android: copy.cardSaveAndroid, saved: copy.cardSaved }} />
      <CardReminder endpoint={`/tarjeta/${token}/push`} copy={{ on: en ? "Remind me when I'm close to my reward" : "Avísame cuando esté cerca de mi recompensa", off: en ? "Turn off reminders" : "Desactivar recordatorios", done: "", ios: en ? "To get reminders on iPhone, first save the card on your home screen." : "Para recibir recordatorios en iPhone, primero guarda la tarjeta en tu pantalla de inicio." }} />

      <section className="lc2-panel">
        <h2>{T.history}</h2>
        <ul className="lc2-history">
          {history.map((e) => <li key={e.id}><span>{e.kind === "stamp" ? T.stamp : e.kind === "redeem" ? T.redeem : T.join}</span><small>{when(e.created_at, lang)}</small></li>)}
        </ul>
        <h2>{T.terms}</h2>
        <ul className="lc2-terms">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <details className="lc-delete">
        <summary>{en ? "Delete my card and my data" : "Borrar mi tarjeta y mis datos"}</summary>
        <form action={deleteMyCard}>
          <input type="hidden" name="token" value={token} />
          <label className="check"><input type="checkbox" name="confirm" value="1" required /><span>{en ? "I understand I lose my stamps." : "Entiendo que pierdo mis sellos."}</span></label>
          <button type="submit" className="btn btn-ghost btn-sm">{en ? "Delete" : "Borrar"}</button>
        </form>
      </details>
      <p className="lc-foot">FiveTap</p>
    </main>
  );
}
