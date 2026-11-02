import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BusinessLogo } from "@/components/BusinessLogo";
import { ClubPanel } from "@/components/ClubPanel";
import { CopyButton } from "@/components/CopyButton";
import { MessageActions } from "@/components/MessageActions";
import { SubmitButton } from "@/components/SubmitButton";
import { businessDetail, contactsFor, markRead, reportData, reviewSnapshots } from "@/lib/data";
import { countSubscriptions } from "@/lib/push";
import { SITE_URL, nfcUrl } from "@/lib/site";
import { verticalByKey } from "@/lib/verticals";
import { addSnapshot, addTags, resetOwnerLink, deleteBusiness, recordPayment, removeContact, removeSnapshot, renameTag, setTagActive, testOwnerPush, updateBusiness } from "../../actions";
import { EssentialFields, OptionFields } from "../../BusinessFields";
import { Report } from "./Report";
import { Flash } from "../../Flash";
import { STATUS_LABEL, dateTime, pct, usd } from "../../format";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const METHOD_LABEL = { paypal: "PayPal", card: "Tarjeta", ach: "ACH", yappy: "Yappy", cash: "Efectivo" } as const;
const KIND_LABEL = { setup: "Instalación", monthly: "Mensualidad", annual: "Plan anual", pieces: "Piezas (pago único)", other: "Otro" } as const;

export default async function BusinessPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // All queries start together: one round trip for the whole page.
  const detail = businessDetail(id);
  const [d, report, contacts, snapshots, phonesOwner, phonesManager] = await Promise.all([
    detail,
    reportData(id, detail.then((x) => x?.tags ?? [])),
    contactsFor(id),
    reviewSnapshots(id),
    countSubscriptions({ role: "owner", businessId: id }),
    countSubscriptions({ role: "manager", businessId: id }),
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
                {b.status === "trial" && b.trial_ends_at ? ` hasta ${b.trial_ends_at}` : ""}
              </p>
            </div>
          </div>
          <div className="row">
            <a className="btn btn-ghost btn-sm" href="#app">App del dueño</a>
            {preview && <a className="btn btn-ghost btn-sm" href={preview} target="_blank" rel="noreferrer">Ver página del cliente</a>}
            <Link className="btn btn-ghost btn-sm" href={`/admin/b/${b.id}/print?formato=cuadrada`}>Stickers placa</Link>
            <Link className="btn btn-ghost btn-sm" href={`/admin/b/${b.id}/print?formato=tarjeta`}>Stickers tarjeta</Link>
            <Link className="btn btn-dark btn-sm" href={`/admin/b/${b.id}/print`}>Imprimir QR</Link>
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

      {isNew && (
        <section className="panel">
          <div className="panel-head"><h2>Siguientes pasos</h2></div>
          <div className="next-steps">
            <div>
              <b>1. Imprime los QR</b>
              <p>Una tarjeta por {v.spot.toLowerCase()}, con su logo. Lista para la imprenta.</p>
              <Link className="btn btn-dark btn-sm" style={{ width: "fit-content" }} href={`/admin/b/${b.id}/print`}>Imprimir QR</Link>
            </div>
            <div>
              <b>2. Graba las placas NFC</b>
              <p>Con la app gratis NFC Tools: Escribir → URL → pega el enlace de cada placa (abajo).</p>
            </div>
            <div>
              <b>3. Pruébalo</b>
              <p>Abre la página como la verá el cliente. No cuenta en las estadísticas.</p>
              {preview && <a className="btn btn-ghost btn-sm" style={{ width: "fit-content" }} href={preview} target="_blank" rel="noreferrer">Abrir página</a>}
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

      <section className="panel">
        <div className="panel-head">
          <h2>Placas NFC y QR · {tags.length}</h2>
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
                <th>QR</th>
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

      <section className="panel">
        <div className="panel-head">
          <h2>Pagos</h2>
          <CopyButton value={payLink} label="Copiar link de pago" />
        </div>
        <form action={recordPayment} className="form-section">
          <input type="hidden" name="business_id" value={b.id} />
          <div className="grid-2">
            <label className="field">
              <span>Monto (USD)</span>
              <input className="input" type="number" step="0.01" min={1} name="amount" defaultValue={payments.length ? b.monthly_fee : b.setup_fee} required />
            </label>
            <label className="field">
              <span>Concepto</span>
              <select className="select" name="kind" defaultValue={payments.length ? "monthly" : "setup"}>
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Método</span>
              <select className="select" name="method" defaultValue="yappy">
                {Object.entries(METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Referencia (opcional)</span>
              <input className="input" name="reference" placeholder="Nº de comprobante" />
            </label>
          </div>
          <SubmitButton className="btn btn-dark" pending="Guardando…">Registrar pago</SubmitButton>
        </form>
        {payments.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paid_at}</td>
                    <td>{KIND_LABEL[p.kind]}</td>
                    <td>{METHOD_LABEL[p.method]}</td>
                    <td className="muted">{p.reference ?? ""}</td>
                    <td className="right num"><b>{usd(Number(p.amount).toFixed(2))}</b></td>
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
