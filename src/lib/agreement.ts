// The 3-month contract, written the way a lawyer would but in plain words. It is not legal
// advice: a lawyer licensed in Panama should review it before relying on it. No ID numbers
// are asked for (signatures only).

import { REPLACEMENT_FEE } from "./contract";

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

/**
 * The clauses, in order. Written to protect both sides the way a lawyer would: what is
 * delivered, what each side owes, who owns what, what happens on late payment or early
 * termination, limits of liability, personal data (Ley 81 de 2019) and how disputes are
 * settled. Short sentences; no ID numbers (signatures only).
 */
export function agreementClauses(a: Agreement): { title: string; paras: string[] }[] {
  const pieces = [
    plural(a.plaques, "placa NFC para mesas", "placas NFC para mesas"),
    a.cards ? plural(a.cards, "tarjeta NFC para meseros", "tarjetas NFC para meseros") : null,
    a.lanyards ? plural(a.lanyards, "cordón porta tarjeta", "cordones porta tarjetas") : null,
  ].filter(Boolean).join(", ");
  const fee = money2(a.monthly_fee);
  const piece = money2(REPLACEMENT_FEE);
  return [
    {
      title: "Objeto del contrato",
      paras: [
        `FiveTap presta al local, por suscripción, el servicio ${a.plan_name}: instala y deja funcionando ${pieces}, y da acceso a FiveTap Business, la aplicación del local para ver sus resultados, recibir los mensajes privados de sus clientes, gestionar su club de clientes y recibir su reporte mensual.`,
        "Cada placa y tarjeta abre una página de FiveTap donde el cliente puede dejar una reseña en Google, escribir en privado al local o unirse a su club de clientes. Cualquier pieza o servicio adicional se acuerda por escrito y se cotiza aparte.",
      ],
    },
    {
      title: "Duración y período mínimo",
      paras: [
        `Este contrato dura ${AGREEMENT_MONTHS} meses: del ${longDay(a.start_date)} al ${longDay(a.end_date)}. Es el período mínimo del servicio, para que el local compruebe sus resultados.`,
        "Al terminar, el contrato no se renueva solo por un año. Si ninguna de las partes avisa lo contrario antes de la fecha de fin, el servicio sigue mes a mes en las mismas condiciones, y cualquiera de las partes puede terminarlo avisando con 15 días de anticipación.",
      ],
    },
    {
      title: "Precio y forma de pago",
      paras: [
        `El local paga ${fee} USD al mes, por adelantado, a partir del ${longDay(a.start_date)}, por ${a.payment_method}. FiveTap entrega un comprobante por cada pago recibido.`,
        "El precio queda congelado mientras el servicio siga activo sin interrupción. Cualquier cambio de precio para un período nuevo se avisa por escrito con al menos 30 días de anticipación.",
        "Si el local hizo FiveTap Test antes de este contrato, lo pagado por el Test se descuenta de su primera mensualidad.",
      ],
    },
    {
      title: "Atrasos y suspensión",
      paras: [
        "FiveTap avisa antes de cada vencimiento. Después del vencimiento el local tiene 5 días de gracia. Si el pago no se recibe, desde el sexto día FiveTap puede pausar las placas, las tarjetas y FiveTap Business hasta que el local se ponga al día.",
        "La pausa no borra ningún dato ni libera al local de las mensualidades vencidas. Al registrarse el pago, el servicio se reactiva el mismo día.",
        "FiveTap también puede pausar el servicio si el local lo usa en contra de este contrato, de la ley o de las reglas de Google, avisándolo por escrito.",
      ],
    },
    {
      title: "Terminación anticipada",
      paras: [
        `Durante el período mínimo, si el local termina el servicio sin una causa atribuible a FiveTap, paga las mensualidades que falten para completar los ${AGREEMENT_MONTHS} meses.`,
        "Cualquiera de las partes puede terminar el contrato sin pagar nada más si la otra incumple una obligación importante y no la corrige dentro de los 10 días siguientes a recibir el aviso por escrito.",
      ],
    },
    {
      title: "Propiedad de las piezas y del software",
      paras: [
        "Las placas, tarjetas y cordones son propiedad de FiveTap y se entregan al local solo para usarlas en su establecimiento mientras el servicio esté activo. El local no las vende, presta, regraba ni usa en otro lugar.",
        "FiveTap Business, las páginas de FiveTap, la marca FiveTap y su software son de FiveTap. El local recibe una licencia de uso no exclusiva e intransferible mientras dure el servicio.",
        `Si una pieza se gasta con el uso normal, FiveTap la cambia sin costo. Si se pierde o se rompe por mal uso, cada pieza de reposición cuesta ${piece} USD.`,
      ],
    },
    {
      title: "Al terminar el servicio",
      paras: [
        `Al terminar, el local devuelve las piezas o permite que FiveTap las retire dentro de los 10 días siguientes. Cada pieza no devuelta se cobra a ${piece} USD.`,
        "Dentro de esos mismos 10 días, el local puede descargar la lista de su club de clientes. Luego FiveTap desactiva las piezas y el acceso a FiveTap Business.",
      ],
    },
    {
      title: "Obligaciones de FiveTap",
      paras: [
        "FiveTap configura e instala las piezas y FiveTap Business, mantiene el servicio funcionando, atiende las consultas del local por WhatsApp y corrige las fallas que dependan de FiveTap en el menor tiempo posible.",
        "Si el servicio deja de funcionar por causa de FiveTap durante más de 72 horas seguidas, ese mes no se cobra.",
      ],
    },
    {
      title: "Obligaciones del local",
      paras: [
        "El local mantiene las piezas a la vista de sus clientes y en buen estado, paga a tiempo, mantiene al día los datos de contacto que dio y avisa a FiveTap si una pieza se daña, se pierde o deja de funcionar.",
        "El local guarda en reserva los códigos de acceso a FiveTap Business, los comparte solo con su personal autorizado y avisa a FiveTap para cambiarlos si alguien deja de tener permiso.",
      ],
    },
    {
      title: "Reglas de Google y reseñas",
      paras: [
        "FiveTap muestra el botón de reseña de Google a todos los clientes, sin filtrar. El local se compromete a no ofrecer descuentos, premios ni beneficios a cambio de reseñas, a no pedir solo reseñas positivas y a no publicar reseñas falsas.",
        "Las reseñas las publica y administra Google. FiveTap no controla lo que Google publica, oculta o elimina, y no garantiza un número determinado de reseñas ni de estrellas: eso depende de los clientes del local y de Google.",
      ],
    },
    {
      title: "Limitación de responsabilidad",
      paras: [
        "FiveTap no responde por daños indirectos, lucro cesante ni pérdida de ventas, ni por fallas de servicios de terceros como Google, WhatsApp, las redes de internet o los teléfonos de los clientes.",
        "La responsabilidad total de FiveTap por este contrato no supera lo que el local pagó en los 3 meses anteriores al hecho que la origine. Ninguna parte responde por incumplimientos causados por caso fortuito o fuerza mayor.",
      ],
    },
    {
      title: "Datos personales",
      paras: [
        "Los datos que los clientes dejan en el club (nombre, WhatsApp y cumpleaños) y en sus mensajes privados son del local, que es el responsable de su tratamiento. FiveTap los trata por cuenta del local, solo para prestar el servicio, con medidas de seguridad razonables y sin venderlos ni cederlos a terceros.",
        "Las partes cumplen la Ley 81 de 2019 de Protección de Datos Personales de la República de Panamá. El local usa los datos del club solo para enviar sus promociones a quienes dieron su permiso, y atiende las solicitudes de sus clientes para dejar de recibirlas o borrar sus datos.",
      ],
    },
    {
      title: "Confidencialidad",
      paras: [
        "Cada parte guarda en reserva la información de la otra que conozca por este contrato (resultados, precios, datos de clientes y forma de trabajo), también durante los 2 años siguientes a su terminación, salvo que la ley obligue a revelarla.",
      ],
    },
    {
      title: "Avisos y cambios",
      paras: [
        "Los avisos entre las partes se hacen por escrito a los contactos de este contrato. Un mensaje de WhatsApp o un correo electrónico cuenta como aviso por escrito.",
        "Cualquier cambio a este contrato vale solo si las dos partes lo aceptan por escrito. El local no puede ceder este contrato a otra persona sin el acuerdo de FiveTap.",
      ],
    },
    {
      title: "Ley aplicable y controversias",
      paras: [
        "Este contrato se rige por las leyes de la República de Panamá. Si surge un desacuerdo, las partes intentan resolverlo de buena fe conversando durante 15 días. Si no lo logran, lo someten a los tribunales competentes de la ciudad de Panamá.",
        "Si alguna cláusula resulta inválida, las demás siguen vigentes. Este contrato, junto con los términos del servicio publicados por FiveTap, es todo lo acordado entre las partes; si hay diferencias, manda este contrato. Las partes pueden firmarlo en papel o de forma electrónica, y cada copia firmada tiene el mismo valor.",
      ],
    },
  ];
}
