// The 3-month contract: a short, plain agreement so a venue can try FiveTap with
// confidence. Nothing here is legal advice: it should be reviewed by a lawyer before
// relying on it. No ID numbers are asked for (signatures only).

export type Agreement = {
  id: string;
  number: string;
  token: string;
  business_id: string | null;
  venue_name: string;
  venue_address: string | null;
  signer_name: string;
  signer_role: string;
  plan_name: string;
  monthly_fee: number;
  plaques: number;
  cards: number;
  lanyards: number;
  start_date: string;
  end_date: string;
  payment_method: string;
  created_at: string;
};

export const AGREEMENT_MONTHS = 3;
export const AGREEMENT_METHODS = ["Yappy", "Transferencia bancaria", "Efectivo", "Tarjeta o PayPal (cobro automático)"] as const;
export const SIGNER_ROLES = ["Dueño/a", "Gerente general", "Representante autorizado"] as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const longDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MONTHS[m! - 1]} de ${y}`;
};
export const money2 = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The day before the same date 3 months later: 15 Nov → 14 Feb. */
export function endOf(start: string, months = AGREEMENT_MONTHS) {
  const [y, m, d] = start.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1 + months, 1, 12));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).getUTCDate();
  t.setUTCDate(Math.min(d!, last));
  return new Date(t.getTime() - 86_400_000).toISOString().slice(0, 10);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The clauses, in order: short sentences, no fine print. */
export function agreementClauses(a: Agreement): { title: string; paras: string[] }[] {
  const pieces = [
    plural(a.plaques, "placa NFC para mesas", "placas NFC para mesas"),
    a.cards ? plural(a.cards, "tarjeta NFC para meseros", "tarjetas NFC para meseros") : null,
    a.lanyards ? plural(a.lanyards, "cordón porta tarjeta", "cordones porta tarjetas") : null,
  ].filter(Boolean).join(", ");
  return [
    {
      title: "El servicio",
      paras: [
        `FiveTap presta al local el servicio ${a.plan_name}: deja funcionando ${pieces} y da acceso a FiveTap Business, la aplicación del local para ver sus resultados, recibir los mensajes privados de sus clientes y su reporte mensual.`,
        "Cada placa y tarjeta lleva a una página de FiveTap donde el cliente puede dejar una reseña en Google, escribir en privado al local o unirse a su club de clientes.",
      ],
    },
    {
      title: "Duración",
      paras: [`Este contrato dura ${AGREEMENT_MONTHS} meses: del ${longDay(a.start_date)} al ${longDay(a.end_date)}. Es un período para que el local compruebe los resultados de FiveTap.`],
    },
    {
      title: "Precio y pagos",
      paras: [
        `El local paga ${money2(a.monthly_fee)} al mes, por adelantado, desde el ${longDay(a.start_date)}, por ${a.payment_method}. Cada pago recibe su comprobante.`,
        "FiveTap avisa antes de cada vencimiento. Si un pago se atrasa más de 5 días, el servicio se pausa hasta que se regularice, sin borrar ningún dato.",
      ],
    },
    {
      title: "Placas y tarjetas",
      paras: [
        "Las placas, tarjetas y cordones son de FiveTap y se entregan al local mientras el servicio esté activo. El local no las regraba ni las usa en otro lugar.",
        "Si una pieza se gasta con el uso, FiveTap la cambia sin costo. Si se pierde o se rompe, se acuerda su reposición.",
      ],
    },
    {
      title: "Qué hace cada parte",
      paras: [
        "FiveTap configura las piezas y FiveTap Business, mantiene el servicio funcionando y atiende las consultas del local.",
        "El local mantiene las piezas a la vista de sus clientes, cuida su buen estado y paga a tiempo. El local muestra el botón de reseña a todos sus clientes y no ofrece premios a cambio de reseñas.",
        "FiveTap no controla lo que Google publica ni puede asegurar un número determinado de reseñas.",
      ],
    },
    {
      title: "Al terminar los 3 meses",
      paras: [
        "Antes de la fecha de fin, las partes revisan los resultados y deciden juntas: renovar por otros 3 meses, por 12 meses u otro período que acuerden, o terminar el servicio.",
        "No hay ninguna renovación anual automática. Si el local no quiere seguir, FiveTap retira las piezas y no se cobra nada más.",
      ],
    },
    {
      title: "Cancelación",
      paras: [
        "El local se compromete a los 3 meses de este contrato. Cualquiera de las partes puede terminarlo antes si la otra incumple lo acordado, avisándolo por escrito (un mensaje de WhatsApp sirve).",
      ],
    },
    {
      title: "Confidencialidad y datos",
      paras: [
        "Cada parte guarda en reserva la información del otro que conozca por este contrato. Los datos del club de clientes son del local; FiveTap solo los usa para prestar el servicio.",
      ],
    },
  ];
}
