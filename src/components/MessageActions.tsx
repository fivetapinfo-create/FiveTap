import { formatPhone, waLink } from "@/lib/phone";

const enc = encodeURIComponent;

/**
 * WhatsApp shortcuts under a private message: reply to the guest (if they left
 * a number) and, in the founder's panel, forward it to the manager. Plain
 * wa.me links: free, no WhatsApp API.
 */
export function MessageActions({
  business,
  spot,
  guestName,
  guestPhone,
  message,
  managerPhone,
}: {
  business: string;
  spot: string | null;
  guestName: string | null;
  guestPhone: string | null;
  message: string;
  /** Only passed in the founder's panel. */
  managerPhone?: string | null;
}) {
  if (!guestPhone && !managerPhone) return null;
  const who = guestName || "Cliente";
  const reply = `Hola ${guestName ?? ""}, le escribe el gerente de ${business}. Recibimos su mensaje y queremos resolverlo. `.replace("Hola ,", "Hola,");
  const forward = `Nuevo mensaje privado en ${business}${spot ? ` · ${spot}` : ""}\n\n${who}: ${message}${guestPhone ? `\n\nWhatsApp del cliente: ${formatPhone(guestPhone)}` : ""}\n\n— FiveTap`;
  return (
    <div className="row msg-actions">
      {guestPhone && (
        <a className="btn btn-ghost btn-sm" href={`${waLink(guestPhone)}?text=${enc(reply)}`} target="_blank" rel="noreferrer">
          Responder al cliente · {formatPhone(guestPhone)}
        </a>
      )}
      {managerPhone && (
        <a className="btn btn-ghost btn-sm" href={`${waLink(managerPhone)}?text=${enc(forward)}`} target="_blank" rel="noreferrer">
          Enviar al gerente por WhatsApp
        </a>
      )}
    </div>
  );
}
