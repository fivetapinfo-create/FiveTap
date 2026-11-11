import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ClubPanel } from "@/components/ClubPanel";
import { CopyButton } from "@/components/CopyButton";
import { MessageActions } from "@/components/MessageActions";
import { SubmitButton } from "@/components/SubmitButton";
import { BILLING_LABEL, billingState, human, planLabel } from "@/lib/agenda";
import { businessDetail, contactsFor, markRead, reportData, reviewSnapshots } from "@/lib/data";
import { countSubscriptions } from "@/lib/push";
import { KIND_LABEL, METHOD_LABEL, customMethods, methodName, receiptsForBusiness } from "@/lib/receipts";
import { SITE_URL, nfcUrl } from "@/lib/site";
import { verticalByKey } from "@/lib/verticals";
import { addSnapshot, addTags, emitReceipt, extendGrace, resetOwnerLink, deleteBusiness, recordPayment, resendReceipt, voidPayment, removeContact, removeSnapshot, renameTag, setTagActive, testOwnerPush, updateBusiness } from "../../actions";
import { EssentialFields, OptionFields } from "../../BusinessFields";
import { Report } from "./Report";
import { Flash } from "../../Flash";
import { STATUS_LABEL, dateTime, pct, usd } from "../../format";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; r?: string }> };


export default async function BusinessPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // All queries start together: one round trip for the whole page.
  const detail = businessDetail(id);
  const [d, report, contacts, snapshots, phonesOwner, phonesManager, receipts, methods] = await Promise.all([
    detail,
    reportData(id, detail.then((x) => x?.tags ?? [])),
    contactsFor(id),
    reviewSnapshots(id),
    countSubscriptions({ role: "owner", businessId: id }),
    countSubscriptions({ role: "manager", businessId: id }),
    receiptsForBusiness(id),
    customMethods(),
  ]);
  if (!d) notFound();
  const { business: b, tags, stats, tagStats, feedback, payments } = d;
  const periods = report.periods;
  const ownerLink = `${SITE_URL}/mi/${b.owner_token}`;
  const v = verticalByKey(b.kind);
  const firstActive = tags.find((t) => t.active);
  const preview = firstActive ? `/t/${firstActive.code}?preview=1` : null;
  const payLink = `${SITE_URL}/pagar?n=${encodeURIComponent(b.name)}`;
  const access = (name: string | null, rol: "dueno" | "gerente") =>
    `Hola${name ? ` ${name.split(" ")[0]}` : ""} 👋 Este es tu acceso privado a FiveTap de *${b.name}*:\n${ownerLink}?instalar=1&rol=${rol}\n\nAhí ves en tiempo real cuántos clientes tocan tus placas y van a dejarte reseña en Google, tus mensajes privados y tu club.\n\n📲 Para tenerlo como app: ábrelo en Safari (iPhone) o Chrome (Android) y sigue los 3 pasos que salen arriba. Al final toca “Activar avisos”.\n\nEs privado: compártelo solo con tu equipo de confianza. — FiveTap`;
  const accessFor = [
    b.billing_phone && { who: b.billing_name ? b.billing_name.split(" ")[0]! : "quien paga", phone: b.billing_phone, name: b.billing_name, rol: "dueno" as const },
    b.manager_phone && { who: b.manager_name ? b.manager_name.split(" ")[0]! : "el gerente", phone: b.manager_phone, name: b.manager_name, rol: b.billing_phone ? ("gerente" as const) : ("dueno" as const) },
  ]
    .filter((x): x is { who: string; phone: string; name: string | null; rol: "dueno" | "gerente" } => Boolean(x))
    .filter((x, i, all) => all.findIndex((y) => y.phone === x.phone) === i)
    .map((x) => ({ ...x, href: `https://wa.me/${x.phone}?text=${encodeURIComponent(access(x.name, x.rol))}` }));
  const isNew = sp.ok === "creado" || !stats?.scans_30d;
  const billing = billingState(b, payments);
  const plan = planLabel(b, billing.charge, tags.filter((t) => t.active).length);
  const receiptByPayment = new Map(receipts.filter((r) => r.payment_id).map((r) => [r.payment_id!, r]));
  const receiptEmail = b.billing_email || b.manager_email;
  if (feedback.some((f) => !f.read_at)) after(() => markRead({ businessId: b.id }));

  return (
    <main className="container admin-main">
      <div>
        <Link className="crumb" href="/admin">← Negocios</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div className="biz">
            <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
            <div>
              <h1>{b.name}</h1>
              <p>
                {v.label} · <span className={`pill ${b.status}`}>{STATUS_LABEL[b.status]}</span>
                {(billing.kind === "soon" || billing.kind === "late" || billing.kind === "suspended") && <> <span className={`pill bill-${billing.kind}`}>{BILLING_LABEL[billing.kind]}</span></>}
                {b.status === "trial" && b.trial_ends_at ? ` hasta ${b.trial_ends_at}` : ""}
              </p>
            </div>
          </div>
          <div className="row">
            <a className="btn btn-ghost btn-sm" href="#app">App del dueño</a>
            {preview && <a className="btn btn-ghost btn-sm" href={preview} target="_blank" rel="noreferrer">Ver página del cliente</a>}
            <a className="btn btn-dark btn-sm" href="#placas">Placas NFC</a>
          </div>
        </div>
      </div>

      <Flash ok={sp.ok} error={sp.error} />

      {b.cancel_requested_at && b.status !== "canceled" && (
        <p className="alert alert-warn" role="status">
          <b>Pidió cancelar desde su app</b> el {dateTime(b.cancel_requested_at)}
          {b.cancel_reason ? ` · Motivo: “${b.cancel_reason}”` : ""}. Cuando retires las placas, cámbialo a <b>Cancelado</b> en Editar datos.
        </p>
      )}

      {(billing.kind === "late" || billing.kind === "suspended") && billing.charge && (
        <div className={`alert ${billing.kind === "suspended" ? "alert-error" : "alert-warn"}`} role="status">
          <p>
            <b>{billing.kind === "suspended" ? "Suspendido por falta de pago" : `Pago atrasado ${billing.daysLate} ${billing.daysLate === 1 ? "día" : "días"}`}</b>
            {" "}· {plan} · {usd(billing.charge.amount)} vencido el {human(billing.charge.due)}.{" "}
            {billing.kind === "suspended"
              ? `Placas y app pausadas desde el ${human(billing.suspendsOn!)}. Al registrar el pago se reactivan solas y se le avisa al dueño.`
              : `Si no registras el pago, se pausa el ${human(billing.suspendsOn!)}.`}
          </p>
          <form action={extendGrace} className="row" style={{ marginTop: 8 }}>
            <input type="hidden" name="business_id" value={b.id} />
            <input type="hidden" name="days" value="7" />
            <a className="btn btn-dark btn-sm" href="#pagos">Registrar pago</a>
            <SubmitButton className="btn btn-ghost btn-sm" pending="Guardando…">Dar 7 días más</SubmitButton>
          </form>
        </div>
      )}

      {isNew && (
        <section className="panel">
          <div className="panel-head"><h2>Siguientes pasos</h2></div>
          <div className="next-steps">
            <div>
              <b>1. Graba las placas NFC</b>
              <p>Con la app gratis NFC Tools: Escribir → URL → pega el enlace de cada placa (abajo) y acerca la placa.</p>
              <a className="btn btn-dark btn-sm" style={{ width: "fit-content" }} href="#placas">Ver enlaces</a>
            </div>
            <div>
              <b>2. Pruébalo</b>
              <p>Abre la página como la verá el cliente. No cuenta en las estadísticas.</p>
              {preview && <a className="btn btn-ghost btn-sm" style={{ width: "fit-content" }} href={preview} target="_blank" rel="noreferrer">Abrir página</a>}
            </div>
            <div>
              <b>3. Instala la app del dueño</b>
              <p>FiveTap Business en su celular: el dueño escanea el código desde tu pantalla.</p>
              <a className="btn btn-ghost btn-sm" style={{ width: "fit-content" }} href="#app">App del dueño</a>
            </div>
          </div>
        </section>
      )}

      <div className="kpis">
        <div className="kpi"><span>Toques · 30 días</span><b className="num">{stats?.scans_30d ?? 0}</b></div>
        <div className="kpi"><span>Fueron a Google</span><b className="num">{stats?.reviews_30d ?? 0}</b></div>
        <div className="kpi"><span>Conversión</span><b className="num">{pct(stats?.reviews_30d, stats?.scans_30d)}</b></div>
        <div className="kpi"><span>Mensajes privados</span><b className="num">{stats?.feedback_30d ?? 0}</b></div>
      </div>

      <Report business={b.name} periods={periods} snapshots={snapshots} />

      <section className="panel" id="resenas">
        <div className="panel-head">
          <h2>Reseñas en Google · antes y después</h2>
        </div>
        <div className="msg">
          <p className="muted">
            {snapshots.length
              ? "El primer conteo es el de antes de FiveTap. Agrega uno nuevo cada fin de mes: el dueño lo ve en su app y sale en el reporte."
              : "Antes de instalar, mira en Google Maps cuántas reseñas y estrellas tiene el local y anótalo aquí. Es tu “antes” para mostrarle el crecimiento."}
          </p>
          {snapshots.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th className="right">Reseñas</th><th className="right">Estrellas</th><th className="right">Cambio</th><th /></tr></thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={s.id}>
                      <td>{s.taken_on}{i === 0 && <span className="muted"> · antes de FiveTap</span>}</td>
                      <td className="right num">{s.reviews}</td>
                      <td className="right num">{s.rating?.toFixed(1) ?? "—"}</td>
                      <td className="right num">{i === 0 ? "—" : `${s.reviews - snapshots[0]!.reviews >= 0 ? "+" : ""}${s.reviews - snapshots[0]!.reviews}`}</td>
                      <td className="right">
                        <form action={removeSnapshot}>
                          <input type="hidden" name="business_id" value={b.id} />
                          <input type="hidden" name="snapshot_id" value={s.id} />
                          <button className="btn btn-ghost btn-sm" type="submit" aria-label={`Borrar conteo del ${s.taken_on}`}>Borrar</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <form action={addSnapshot} className="snapshot-form">
            <input type="hidden" name="business_id" value={b.id} />
            <label className="field">
              <span>Fecha</span>
              <input className="input" type="date" name="taken_on" defaultValue={new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)} required />
            </label>
            <label className="field">
              <span>Reseñas</span>
              <input className="input" name="reviews" inputMode="numeric" placeholder="120" required />
            </label>
            <label className="field">
              <span>Estrellas</span>
              <input className="input" name="rating" inputMode="decimal" placeholder="4.5" />
            </label>
            <SubmitButton className="btn btn-dark btn-sm" pending="Guardando…">{snapshots.length ? "Agregar conteo" : "Guardar el “antes”"}</SubmitButton>
          </form>
        </div>
      </section>

      <section className="panel" id="app">
        <div className="panel-head">
          <h2>App del dueño</h2>
          <span className="muted">{phonesOwner + phonesManager ? `${phonesOwner} dueño · ${phonesManager} gerente con avisos` : "Ningún celular con avisos todavía"}</span>
        </div>
        <div className="msg">
          <p className="muted">Es su FiveTap: reseñas en tiempo real, el antes y después, sus placas, los mensajes privados, el club y su plan. Se instala como app y le llegan los avisos. Envíale el acceso y, el día de la instalación, actívalo con él en su celular.</p>
          <div className="row msg-actions">
            <Link className="btn btn-dark btn-sm" href={`/admin/b/${b.id}/instalar`}>📲 Instalar en persona (QR)</Link>
            {accessFor.map((a) => (
              <a key={a.phone} className="btn btn-ghost btn-sm" href={a.href} target="_blank" rel="noopener noreferrer">Enviar acceso a {a.who}</a>
            ))}
            <CopyButton value={ownerLink} label="Copiar enlace" />
            <a className="btn btn-ghost btn-sm" href={ownerLink} target="_blank" rel="noreferrer">Ver como el dueño</a>
            {phonesOwner + phonesManager > 0 && (
              <form action={testOwnerPush}>
                <input type="hidden" name="business_id" value={b.id} />
                <SubmitButton className="btn btn-ghost btn-sm" pending="Enviando…">Enviar notificación de prueba</SubmitButton>
              </form>
            )}
          </div>
          {!accessFor.length && <small className="muted">Agrega el WhatsApp del gerente o de quien paga (Editar datos) para enviarle el acceso con un toque.</small>}
          <form action={resetOwnerLink} className="row">
            <input type="hidden" name="business_id" value={b.id} />
            <SubmitButton className="btn btn-ghost btn-sm" pending="Cambiando…">Cambiar enlace privado</SubmitButton>
            <small className="muted">Si alguien que tenía acceso ya no trabaja ahí: el enlace viejo deja de funcionar y se borran los avisos de todos los celulares del local. Luego reenvía el acceso.</small>
          </form>
        </div>
      </section>

      <ClubPanel contacts={contacts} tags={tags} csvHref={`/admin/b/${b.id}/clientes.csv`} remove={removeContact} />

      <section className="panel">
        <div className="panel-head">
          <h2>Mensajes privados</h2>
        </div>
        {feedback.length === 0 ? (
          <div className="empty"><p>Sin mensajes todavía.</p></div>
        ) : (
          feedback.map((f) => (
            <div key={f.id} className={`msg${f.read_at ? "" : " unread"}`}>
              <div className="msg-meta">
                <b style={{ color: "var(--ink)" }}>{f.name || "Sin nombre"}</b>
                <span>{tags.find((t) => t.id === f.tag_id)?.label ?? "—"}</span>
                <span>{dateTime(f.created_at)}</span>
                <span>{f.notified_via.includes("email") ? "Enviado por email" : "Solo en el panel"}</span>
                {!f.read_at && <span className="badge">Nuevo</span>}
              </div>
              <p>{f.message}</p>
              <MessageActions
                business={b.name}
                spot={tags.find((t) => t.id === f.tag_id)?.label ?? null}
                guestName={f.name}
                guestPhone={f.phone}
                message={f.message}
                managerPhone={b.manager_phone}
              />
            </div>
          ))
        )}
      </section>

      <section className="panel" id="placas">
        <div className="panel-head">
          <h2>Placas NFC · {tags.length}</h2>
          <form action={addTags} className="row">
            <input type="hidden" name="business_id" value={b.id} />
            <input className="input" name="count" type="number" min={1} max={80} defaultValue={1} style={{ width: 76, minHeight: 36, padding: "6px 10px" }} aria-label="Cantidad" />
            <input className="input" name="label" defaultValue={v.spot} style={{ width: 110, minHeight: 36, padding: "6px 10px" }} aria-label="Nombre" />
            <SubmitButton className="btn btn-ghost btn-sm" pending="…">+ Agregar</SubmitButton>
          </form>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Enlace para grabar en el NFC</th>
                <th className="right">Toques</th>
                <th className="right">A Google</th>
                <th>QR de respaldo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => {
                const ts = tagStats.get(t.id);
                return (
                  <tr key={t.id} style={t.active ? undefined : { opacity: 0.45 }}>
                    <td>
                      <form action={renameTag} className="rename">
                        <input type="hidden" name="business_id" value={b.id} />
                        <input type="hidden" name="tag_id" value={t.id} />
                        <input className="input" name="label" defaultValue={t.label} maxLength={40} aria-label="Nombre de la placa" />
                        <SubmitButton className="btn btn-ghost btn-sm" pending="…">✓</SubmitButton>
                      </form>
                    </td>
                    <td>
                      <div className="row">
                        <span className="code muted">{nfcUrl(t.code)}</span>
                        <CopyButton value={nfcUrl(t.code)} />
                      </div>
                    </td>
                    <td className="right num">{ts?.scans_30d ?? 0}</td>
                    <td className="right num">{ts?.reviews_30d ?? 0}</td>
                    <td>
                      <div className="row">
                        <a className="btn btn-ghost btn-sm" href={`/admin/qr/${t.code}?format=png`} download>PNG</a>
                        <a className="btn btn-ghost btn-sm" href={`/admin/qr/${t.code}?format=svg`} download>SVG</a>
                      </div>
                    </td>
                    <td>
                      <form action={setTagActive}>
                        <input type="hidden" name="business_id" value={b.id} />
                        <input type="hidden" name="tag_id" value={t.id} />
                        <input type="hidden" name="active" value={t.active ? "0" : "1"} />
                        <SubmitButton className="btn btn-ghost btn-sm">{t.active ? "Desactivar" : "Activar"}</SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="pagos">
        <div className="panel-head">
          <h2>Pagos y comprobantes</h2>
          <CopyButton value={payLink} label="Copiar link de pago" />
        </div>
        {sp.r && sp.ok?.startsWith("comprobante") && (() => {
          const r = receipts.find((x) => x.number === sp.r);
          return r ? (
            <div className="msg">
              <p>Comprobante <b>{r.number}</b> emitido · {usd(Number(r.amount).toFixed(2))} · {r.method}</p>
              <div className="row">
                <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}`} target="_blank" rel="noreferrer">Ver comprobante</a>
                <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}/pdf?dl=1`}>Descargar PDF</a>
                {(b.billing_phone || b.manager_phone) && (
                  <a className="btn btn-ghost btn-sm" href={`https://wa.me/${b.billing_phone || b.manager_phone}?text=${encodeURIComponent(`Hola, te escribe FiveTap. Confirmamos tu pago de ${usd(Number(r.amount).toFixed(2))}. Tu comprobante ${r.number}: ${SITE_URL}/recibo/${r.token} ¡Gracias! 🙌`)}`}>Enviar por WhatsApp</a>
                )}
              </div>
            </div>
          ) : null;
        })()}
        <form action={recordPayment} className="form-section">
          <input type="hidden" name="business_id" value={b.id} />
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <div className="grid-2">
            <label className="field">
              <span>Monto recibido (USD)</span>
              <input className="input" type="number" step="0.01" min={1} name="amount" defaultValue={billing.charge?.amount ?? b.monthly_fee} required />
            </label>
            <label className="field">
              <span>Concepto</span>
              <select className="select" name="kind" defaultValue={billing.charge?.kind === "annual" ? "annual" : "monthly"}>
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Método de pago</span>
              <select className="select" name="method" defaultValue="yappy">
                {(["yappy", "cash", "ach", "paypal", "card"] as const).map((k) => <option key={k} value={k}>{METHOD_LABEL[k]}</option>)}
                {methods.map((m) => <option key={m.id} value={`m:${m.label}`}>{m.label}</option>)}
                <option value="other">Otro (escríbelo abajo)</option>
              </select>
            </label>
            <label className="field">
              <span>Referencia (opcional)</span>
              <input className="input" name="reference" placeholder="Nº de transacción Yappy o transferencia" />
            </label>
            <label className="field">
              <span>Si elegiste Otro: ¿cuál?</span>
              <input className="input" name="method_other" maxLength={40} placeholder="Ej. Cheque" />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="confirm" value="1" required />
            <span>Confirmo que el pago ya llegó y revisé el monto y el método.</span>
          </label>
          <label className="check">
            <input type="checkbox" name="send" value="1" defaultChecked />
            <span>
              Enviar el comprobante al dueño: {receiptEmail ? <>por correo a <b>{receiptEmail}</b> y </> : <>sin correo registrado, solo </>}a su app FiveTap Business.
            </span>
          </label>
          <SubmitButton className="btn btn-dark" pending="Registrando…">Registrar pago y emitir comprobante</SubmitButton>
        </form>
        {(payments.length > 0 || receipts.length > 0) && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Concepto</th><th>Método</th><th className="right">Monto</th><th>Comprobante</th><th /></tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const r = receiptByPayment.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>{human(p.paid_at.slice(0, 10))}</td>
                      <td>{KIND_LABEL[p.kind]}</td>
                      <td>{methodName(p)}{p.reference ? <span className="muted"> · {p.reference}</span> : null}</td>
                      <td className="right num"><b>{usd(Number(p.amount).toFixed(2))}</b></td>
                      <td>{r ? <a href={`/recibo/${r.token}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.number}</a> : <span className="muted">—</span>}</td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          {r ? (
                            <>
                              <a className="btn btn-ghost btn-sm" href={`/recibo/${r.token}/pdf?dl=1`}>PDF</a>
                              <form action={resendReceipt}>
                                <input type="hidden" name="receipt_id" value={r.id} />
                                <input type="hidden" name="back" value={`/admin/b/${b.id}#pagos`} />
                                <SubmitButton className="btn btn-ghost btn-sm" pending="Enviando…">Reenviar</SubmitButton>
                              </form>
                            </>
                          ) : (
                            <form action={emitReceipt}>
                              <input type="hidden" name="business_id" value={b.id} />
                              <input type="hidden" name="payment_id" value={p.id} />
                              <SubmitButton className="btn btn-ghost btn-sm" pending="Emitiendo…">Emitir comprobante</SubmitButton>
                            </form>
                          )}
                          <details className="void-box">
                            <summary className="btn btn-ghost btn-sm">Anular</summary>
                            <form action={voidPayment} className="void-form">
                              <input type="hidden" name="business_id" value={b.id} />
                              <input type="hidden" name="payment_id" value={p.id} />
                              <input className="input" name="reason" required minLength={4} maxLength={200} placeholder="Motivo (ej. monto equivocado)" />
                              <SubmitButton className="btn btn-danger btn-sm" pending="Anulando…">Anular pago</SubmitButton>
                              <small className="muted">El comprobante queda marcado como anulado y el cambio se guarda en el historial.</small>
                            </form>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {receipts.filter((r) => r.status === "void").map((r) => (
                  <tr key={r.id} className="muted">
                    <td>{human(r.paid_on)}</td>
                    <td>{r.concept}</td>
                    <td>{r.method}</td>
                    <td className="right num"><s>{usd(Number(r.amount).toFixed(2))}</s></td>
                    <td><a href={`/recibo/${r.token}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.number}</a></td>
                    <td className="right"><span className="pill canceled">Anulado</span> {r.void_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="panel more" style={{ borderTop: "1px solid var(--line)" }}>
        <summary>Editar datos del negocio</summary>
        <form action={updateBusiness}>
          <input type="hidden" name="id" value={b.id} />
          <EssentialFields b={b} />
          <OptionFields b={b} />
          <div className="form-section">
            <div className="grid-2">
              <label className="field">
                <span>Estado</span>
                <select className="select" name="status" defaultValue={b.status}>
                  {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Fin de la prueba</span>
                <input className="input" type="date" name="trial_ends_at" defaultValue={b.trial_ends_at ?? ""} />
              </label>
            </div>
            <label className="field">
              <span>Notas internas</span>
              <textarea className="textarea" name="notes" defaultValue={b.notes ?? ""} style={{ minHeight: 90 }} />
            </label>
            <SubmitButton className="btn btn-dark" pending="Guardando…">Guardar cambios</SubmitButton>
          </div>
        </form>
        <form action={deleteBusiness} className="form-section danger-zone">
          <input type="hidden" name="id" value={b.id} />
          <h3>Eliminar negocio</h3>
          <p className="muted">Borra el negocio con sus placas, estadísticas, mensajes, club y pagos. No se puede deshacer. Sus placas dejarán de funcionar.</p>
          <label className="field">
            <span>Escribe <b>{b.name}</b> para confirmar</span>
            <input className="input" name="confirm" autoComplete="off" required />
          </label>
          <SubmitButton className="btn btn-danger" pending="Eliminando…">Eliminar para siempre</SubmitButton>
        </form>
      </details>
    </main>
  );
}
