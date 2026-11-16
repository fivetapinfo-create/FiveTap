import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SignaturePad } from "@/components/SignaturePad";
import { SubmitButton } from "@/components/SubmitButton";
import { AGREEMENT_MONTHS, SIGNER_ROLES, agreementClauses, longDay, money2 } from "@/lib/agreement";
import { agreementByToken } from "@/lib/agreements-db";
import { provider } from "@/lib/company";
import { SIGN_LABEL, docHash, signStatus, signaturesFor } from "@/lib/signatures";
import { signContract } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contrato — FiveTap", robots: { index: false, follow: false } };

const when = (iso: string) => new Intl.DateTimeFormat("es-PA", { dateStyle: "long", timeStyle: "short", timeZone: "America/Panama" }).format(new Date(iso));

/** The venue reads its contract and signs it electronically. Opened only with its secret link. */
export default async function ContractPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const a = await agreementByToken(token);
  if (!a) notFound();
  const [sigs, p] = await Promise.all([signaturesFor(a.id), provider()]);
  const status = signStatus(a, sigs);
  const hash = docHash(a);
  const valid = sigs.filter((s) => s.doc_hash === hash);
  const clientSigned = valid.some((s) => s.party === "client");
  return (
    <main className="contract">
      <header className="contract-top"><Logo size={22} /><span className={`pill ${status === "both" || status === "client" ? "bill-ok" : ""}`}>{SIGN_LABEL[status]}</span></header>
      <h1>Contrato {a.number}</h1>
      <p className="muted">{p.trade_name} · {a.venue_name}</p>
      {sp.ok === "firmado" && <p className="alert alert-ok" role="status">Listo: firmaste el contrato. Te enviaremos la copia firmada por FiveTap.</p>}
      {status === "changed" && <p className="alert alert-warn">Este contrato cambió después de una firma anterior. Revísalo y fírmalo otra vez.</p>}

      <section className="contract-facts">
        <div><small>Negocio</small><b>{a.venue_name}</b></div>
        <div><small>Plan</small><b>{a.plan_name}</b></div>
        <div><small>Mensualidad</small><b>{money2(a.monthly_fee)} USD</b></div>
        <div><small>Duración</small><b>{AGREEMENT_MONTHS} meses</b></div>
        <div><small>Vigencia</small><b>{longDay(a.start_date)} al {longDay(a.end_date)}</b></div>
        <div><small>Placas y tarjetas</small><b>{a.plaques} {a.plaques === 1 ? "placa" : "placas"} · {a.cards} {a.cards === 1 ? "tarjeta" : "tarjetas"}</b></div>
        <div><small>Forma de pago</small><b>{a.payment_method}</b></div>
        <div><small>Firma por el negocio</small><b>{a.signer_name} · {a.signer_role}</b></div>
      </section>

      <section className="contract-text">
        {agreementClauses(a).map((c) => (
          <article key={c.title}>
            <h2>{c.title}</h2>
            {c.paras.map((t) => <p key={t}>{t}</p>)}
          </article>
        ))}
        <a className="btn btn-ghost btn-sm" href={`/contrato/${token}/pdf?dl=1`}>Descargar el contrato en PDF</a>
      </section>

      {valid.length > 0 && (
        <section className="contract-sigs" id="firmas">
          <h2>Firmas</h2>
          {valid.map((s) => (
            <div key={s.id} className="contract-sig">
              {s.signature_png ? <img src={s.signature_png} alt={`Firma de ${s.signer_name}`} /> : <span className="contract-sig-typed">{s.signer_name}</span>}
              <b>{s.signer_name}</b>
              <small className="muted">{s.party === "client" ? `${s.signer_role ?? "Por el negocio"} · ${a.venue_name}` : `Por ${p.trade_name}`} · {when(s.signed_at)}</small>
            </div>
          ))}
          <small className="muted">Huella del documento (SHA-256): <code>{hash}</code></small>
        </section>
      )}

      {!clientSigned && (
        <section className="contract-sign" id="firmar">
          <h2>Firmar electrónicamente</h2>
          {sp.error && <p className="alert alert-error" role="alert">{sp.error}</p>}
          <form action={signContract} className="form-section">
            <input type="hidden" name="token" value={token} />
            <div className="grid-2">
              <label className="field"><span>Nombre completo de quien firma</span><input className="input" name="name" required minLength={3} maxLength={120} defaultValue={a.signer_name} autoComplete="name" /></label>
              <label className="field"><span>Cargo</span><select className="select" name="role" defaultValue={a.signer_role}>{SIGNER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            </div>
            <SignaturePad />
            <label className="check"><input type="checkbox" name="read" value="1" required /><span>Leí el contrato completo y estoy de acuerdo con sus condiciones.</span></label>
            <label className="check"><input type="checkbox" name="esign" value="1" required /><span>Acepto firmarlo de forma electrónica. Se guardará mi nombre, mi firma, la fecha y hora, mi dirección IP, mi dispositivo y la huella del documento como constancia.</span></label>
            <SubmitButton className="btn btn-dark btn-block" pending="Firmando…">Firmar contrato</SubmitButton>
            <small className="muted">Es una firma electrónica conforme a la Ley 51 de 2008 de Panamá. Si prefieres firmar en papel, pide a FiveTap la versión impresa.</small>
          </form>
        </section>
      )}
    </main>
  );
}
