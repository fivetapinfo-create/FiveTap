import type { Contact, Tag } from "@/lib/types";
import { formatPhone, waLink } from "@/lib/phone";
import { CopyButton } from "./CopyButton";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const bday = (c: Contact) => (c.birthday_month && c.birthday_day ? `${c.birthday_day} ${MONTHS[c.birthday_month - 1]}` : "—");

/** The venue's WhatsApp club: who joined, birthdays this month, export. */
export function ClubPanel({
  contacts,
  tags,
  csvHref,
  remove,
}: {
  contacts: Contact[];
  tags: Tag[];
  csvHref: string;
  /** Admin only: a server action that deletes one contact (guests can ask to be removed). */
  remove?: (f: FormData) => Promise<void>;
}) {
  const label = new Map(tags.map((t) => [t.id, t.label]));
  const month = Number(new Date().toLocaleString("en-US", { timeZone: "America/Panama", month: "numeric" }));
  const birthdays = contacts
    .filter((c) => c.birthday_month === month && c.birthday_day)
    .sort((a, b) => a.birthday_day! - b.birthday_day!);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Club de clientes · {contacts.length}</h2>
        {contacts.length > 0 && (
          <div className="row">
            <CopyButton value={contacts.map((c) => `+${c.phone}`).join("\n")} label="Copiar números" />
            <a className="btn btn-ghost btn-sm" href={csvHref} download>Descargar Excel</a>
          </div>
        )}
      </div>
      {contacts.length === 0 ? (
        <div className="empty"><p>Todavía nadie se ha unido. Aparecen aquí cuando un cliente toca “Recibe promociones”.</p></div>
      ) : (
        <>
          {birthdays.length > 0 && (
            <div className="club-bdays">
              <b>🎂 Cumpleaños este mes</b>
              <p>{birthdays.map((c) => `${c.name} (${c.birthday_day})`).join(" · ")}</p>
            </div>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>WhatsApp</th>
                  <th>Cumpleaños</th>
                  <th>Se unió en</th>
                  <th>Fecha</th>
                  {remove && <th />}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td><a className="link-u" href={waLink(c.phone)} target="_blank" rel="noreferrer">{formatPhone(c.phone)}</a></td>
                    <td>{bday(c)}</td>
                    <td className="muted">{(c.tag_id && label.get(c.tag_id)) || "—"}</td>
                    <td className="muted">{new Date(c.created_at).toLocaleDateString("es-PA", { timeZone: "America/Panama", day: "numeric", month: "short" })}</td>
                    {remove && (
                      <td>
                        <form action={remove}>
                          <input type="hidden" name="contact_id" value={c.id} />
                          <input type="hidden" name="business_id" value={c.business_id} />
                          <button className="btn btn-ghost btn-sm" type="submit">Borrar</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
