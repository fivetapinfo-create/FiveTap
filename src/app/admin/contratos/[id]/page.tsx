import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import { getContract, provider } from "@/lib/company";
import { PLANS, WAITER_CARD_PRICE, contractTerms, longDate, money } from "@/lib/contract";
import { deleteContract } from "../actions";

type Props = { params: Promise<{ id: string }> };

export default async function ContractPage({ params }: Props) {
  const c = await getContract((await params).id);
  if (!c) notFound();
  const [t, p] = [contractTerms(c), await provider()];
  const rows: [string, string][] = [
    ["Local", `${c.venue_name} · ${c.venue_kind}`],
    ["Dirección", t.address],
    ["Firma", `${c.signer_name} · ${c.signer_role}`],
    ["Contacto", [c.phone, c.email].filter(Boolean).join(" · ") || "—"],
    ["Plan", `${PLANS[c.plan].label} · ${money(t.plan.price)} / ${t.plan.every}`],
    ["FiveTap Business", t.business ? "Incluido" : "No incluido (las placas llevan directo a Google)"],
    ["Piezas", `${c.plaques} placas clásicas · ${c.waiter_cards} tarjetas de meseros (${money(WAITER_CARD_PRICE)} c/u)`],
    ["Día de instalación", `${longDate(c.start_date)} · se paga ${money(t.payAtInstall)} por ${c.payment_method}`],
    ["Prueba gratis", t.trialMode === "done" ? `Ya la hizo: del ${longDate(t.trialStart!)} al ${longDate(t.trialEnds!)}` : t.trialMode === "starts" ? `Del ${longDate(c.start_date)} al ${longDate(t.trialEnds!)}` : "Sin prueba"],
    ["Primer cobro del plan", longDate(t.firstCharge)],
    ["Renovación", longDate(t.renewal)],
  ];
  return (
    <main className="container admin-main" style={{ maxWidth: 820 }}>
      <div>
        <Link className="crumb" href="/admin/contratos">← Contratos</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>{c.venue_name}</h1>
            <p className="code">Contrato {c.number}</p>
          </div>
          <div className="row">
            <a className="btn btn-ghost btn-sm" href={`/admin/contratos/${c.id}/pdf`} target="_blank" rel="noreferrer">Ver PDF</a>
            <a className="btn btn-dark btn-sm" href={`/admin/contratos/${c.id}/pdf?dl=1`}>Descargar PDF</a>
          </div>
        </div>
      </div>

      {!p.founder && (
        <p className="alert alert-warn">
          Falta tu nombre como fundador: el contrato sale con la firma en blanco. Agrégalo en <Link href="/admin/empresa"><b>Empresa</b></Link>.
        </p>
      )}

      <section className="panel">
        <dl className="contract-kv">
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      <p className="muted" style={{ fontSize: 14 }}>
        Imprime 2 copias: una para ti y otra para el local. Firman tú y {c.signer_name}. Antes de usarlo con muchos clientes, pide a un abogado que revise el texto.
      </p>

      <form action={deleteContract}>
        <input type="hidden" name="id" value={c.id} />
        <SubmitButton className="btn btn-ghost btn-sm" pending="Borrando…">Borrar este contrato</SubmitButton>
      </form>
    </main>
  );
}
