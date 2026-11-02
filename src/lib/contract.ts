// Contract terms in one place: the form, the summary page and the PDF all read
// from here, so the numbers and wording can never disagree with each other.

export const VENUE_KINDS = ["Restaurante", "Cafetería", "Bar", "Heladería", "Panadería", "Hotel", "Otro"] as const;
export const ADDRESS_KINDS = ["Calle", "Plaza", "Centro comercial", "Edificio"] as const;
export const SECTORS = [
  "Parque Lefevre", "Carrasquilla", "San Francisco", "Obarrio", "Bella Vista", "El Cangrejo",
  "Marbella", "Punta Pacífica", "Costa del Este", "Casco Antiguo", "El Dorado", "Betania",
] as const;
export const SIGNER_ROLES = ["Dueño/a", "Gerente", "Supervisor/a", "Representante legal"] as const;
export const PAY_METHODS = ["PayPal", "Yappy", "Transferencia", "Efectivo"] as const;

export const SETUP_FEE = 150;
export const WAITER_CARD_PRICE = 25;
export const TRIAL_DAYS = 7;
export const REPLACEMENT_FEE = 10;

export const PLANS = {
  monthly: { name: "Plan Mensual", label: "Mensualidad del plan + FiveTap Business", price: 99, every: "mes", setup: SETUP_FEE, months: 1, includedPlaques: 10, perPlaque: false },
  annual: { name: "Plan Anual", label: "Plan anual + FiveTap Business", price: 948, every: "año", setup: 0, months: 12, includedPlaques: 10, perPlaque: false },
  plaque: { name: "Plan Placa", label: "Mensualidad solo de placa", price: 35, every: "mes", setup: 0, months: 1, includedPlaques: 1, perPlaque: true },
} as const;
export type PlanKey = keyof typeof PLANS;

/** Free trial: already done with the trial plaque (usual), starting on the contract date, or none. */
export const TRIAL_MODES = {
  done: "Ya hizo la prueba gratis",
  starts: "La prueba empieza hoy",
  none: "Sin prueba",
} as const;
export type TrialMode = keyof typeof TRIAL_MODES;

export type ContractInput = {
  number: string;
  venue_name: string;
  venue_kind: string;
  address_kind: string;
  street: string;
  number_or_local: string | null;
  sector: string;
  city: string;
  signer_name: string;
  signer_role: string;
  signer_id: string | null;
  phone: string | null;
  email: string | null;
  plan: PlanKey;
  /** FiveTap Business (the owner's app, alerts, club, reports). Always on for the monthly and annual plans. */
  with_business: boolean;
  trial_mode: TrialMode;
  /** First day of the trial when it was done before signing. */
  trial_start: string | null;
  plaques: number;
  waiter_cards: number;
  payment_method: string;
  start_date: string; // YYYY-MM-DD
  created_at: string;
};

export type Founder = { first_name: string; last_name: string; passport: string | null; role: string };
export type Representative = { name: string; id: string | null; role: string };
export type Provider = {
  trade_name: string;
  legal_name: string | null;
  legal_address: string | null;
  founder: Founder | null;
  /** Adult who signs for the company when the founder can't sign alone. */
  representative: Representative | null;
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-29" → "29 de octubre de 2026". Dates are calendar dates, no time zone. */
export function longDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MONTHS[m! - 1]} de ${y}`;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const target = new Date(Date.UTC(y!, m! - 1 + months, 1, 12));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(d!, last));
  return target.toISOString().slice(0, 10);
}

export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Every number and date the contract states, derived from the input. */
export function contractTerms(c: ContractInput) {
  const base = PLANS[c.plan];
  // "Solo placa" is charged per plaque.
  const price = base.perPlaque ? base.price * Math.max(1, c.plaques) : base.price;
  const plan = { ...base, price };
  const business = c.plan !== "plaque" || c.with_business !== false;
  const trialMode: TrialMode = c.trial_mode ?? "starts";
  const trialStart = trialMode === "starts" ? c.start_date : trialMode === "done" ? (c.trial_start ?? addDays(c.start_date, -TRIAL_DAYS)) : null;
  const trialEnds = trialStart ? addDays(trialStart, TRIAL_DAYS - 1) : null;
  // After a trial already done (or with none), the plan starts and is charged on the contract date.
  const firstCharge = trialMode === "starts" ? addDays(c.start_date, TRIAL_DAYS) : c.start_date;
  const renewal = addMonths(firstCharge, plan.months);
  const cards = c.waiter_cards * WAITER_CARD_PRICE;
  const dueAtInstall = plan.setup + cards;
  const address = [
    // "Plaza" + "Carolina" → "Plaza Carolina", but never "Plaza Plaza Carolina".
    c.address_kind === "Calle" || c.street.toLowerCase().startsWith(c.address_kind.toLowerCase())
      ? c.street
      : `${c.address_kind} ${c.street}`,
    c.number_or_local ? (c.address_kind === "Calle" ? `No. ${c.number_or_local}` : `Local ${c.number_or_local}`) : null,
    c.sector,
    c.city,
  ]
    .filter(Boolean)
    .join(", ");
  const firstPeriodTotal = plan.price + dueAtInstall;
  const renewalNoticeBy = addDays(renewal, -30);
  const lastDay = addDays(renewal, -1);
  const automatic = c.payment_method === "PayPal";
  // Paid on the installation day: setup and cards, plus the first period when there's no trial ahead.
  const payAtInstall = dueAtInstall + (trialMode === "starts" ? 0 : price);
  return { plan, business, trialMode, trialStart, trialEnds, firstCharge, renewal, renewalNoticeBy, lastDay, cards, dueAtInstall, payAtInstall, firstPeriodTotal, automatic, address };
}

/** A clause: paragraphs, plus an optional lettered list after the first paragraph. */
export type Clause = { title: string; body: string[]; items?: string[] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Version 2.0 of the service contract, in plain Spanish. It protects FiveTap's
 * system and income without asking the restaurant for anything unreasonable.
 * It is a solid base, not legal advice: have a Panamanian lawyer review it.
 */
export function contractClauses(c: ContractInput, p: Provider): Clause[] {
  const t = contractTerms(c);
  const annual = c.plan === "annual";
  const fullPlan = c.plan !== "plaque";
  const period = annual ? "año" : "mes";
  const pieces = [
    c.plaques > 0 ? `${plural(c.plaques, "placa clásica", "placas clásicas")} de 12 × 12 cm` : null,
    c.waiter_cards > 0 ? `${plural(c.waiter_cards, "tarjeta", "tarjetas")} para meseros` : null,
  ].filter(Boolean).join(" y ");

  const included = t.business ? [
    "placas y tarjetas con tecnología NFC y código QR, personalizadas con la marca del local;",
    "una página que invita a los clientes del local a dejar una reseña en Google;",
    "un canal privado para que los clientes le escriban al gerente sin publicar nada;",
    "un club de clientes en el que cada cliente, si lo desea y con su consentimiento, deja su WhatsApp y su fecha de cumpleaños para recibir promociones del local;",
    "FiveTap Business: la aplicación privada del local para el dueño, gerentes y encargados, instalada en sus celulares, con los resultados en tiempo real, las reseñas antes y después de FiveTap, el rendimiento de cada placa y mesero, los mensajes privados, el club de clientes, la suscripción y avisos al celular;",
    "un reporte mensual de resultados enviado por WhatsApp;",
  ] : [
    "placas con tecnología NFC y código QR, personalizadas con la marca del local;",
    "la configuración de cada placa para que, al tocarla o escanearla, el cliente llegue directo a la ventana de reseñas de Google del local;",
    "soporte por WhatsApp y cambio de las placas que dejen de funcionar por desgaste normal.",
  ];
  if (fullPlan) {
    included.push(
      "la respuesta a las reseñas de Google del local, en un plazo de 48 horas hábiles, cuando EL CLIENTE otorgue a FiveTap acceso a su perfil de Google;",
      "una revisión inicial del perfil de Google del local (fotos, horario y categorías).",
    );
  } else if (t.business) {
    included[included.length - 1] = included[included.length - 1]!.replace(/;$/, ".");
  }
  const ftb = "el sistema FiveTap Business (la aplicación para el dueño, gerentes y encargados del local)";
  const installs = t.business ? `las piezas y ${ftb}` : "las piezas";
  const trialDone = t.trialMode === "done";

  const nonRefundable = [
    t.plan.setup ? "la instalación" : null,
    c.waiter_cards > 0 ? "las tarjetas para meseros, que quedan en propiedad de EL CLIENTE," : null,
  ].filter(Boolean) as string[];

  const payment = t.automatic
    ? `El pago se cobra de forma automática por PayPal en cada fecha de pago.`
    : `EL CLIENTE paga por ${c.payment_method} en cada fecha de pago y envía el comprobante por WhatsApp. FiveTap le recuerda la fecha con al menos tres (3) días de anticipación.`;

  return [
    {
      title: "Objeto",
      body: [
        `FiveTap presta a EL CLIENTE un servicio tecnológico para que más clientes satisfechos dejen su reseña en Google y para que el local conozca y atienda a tiempo las experiencias que no salieron bien. El servicio incluye:`,
        `FiveTap facilita que los clientes del local dejen reseñas auténticas, pero no garantiza un número de reseñas, una calificación, ventas ni una posición determinada en Google.`,
      ],
      items: included,
    },
    {
      title: "Plan, precio y forma de pago",
      body: [
        annual
          ? `EL CLIENTE contrata el Plan Anual con FiveTap Business por ${money(t.plan.price)} al año, equivalente a ${money(t.plan.price / 12)} al mes, que se paga por adelantado en un solo pago.`
          : c.plan === "plaque"
            ? `EL CLIENTE contrata una mensualidad por placa${t.business ? " con FiveTap Business" : ", sin FiveTap Business (las placas llevan directo a Google)"}: ${plural(Math.max(1, c.plaques), "placa", "placas")} × ${money(PLANS.plaque.price)} = ${money(t.plan.price)} al mes.`
            : `EL CLIENTE contrata el ${t.plan.name} con FiveTap Business por ${money(t.plan.price)} al mes.`,
        t.business
          ? `${annual ? "El pago anual" : "La mensualidad"} incluye el uso de FiveTap Business y de todos los servicios de la cláusula de Objeto mientras el plan esté activo, sin costo por usuario: el dueño puede darle acceso a sus gerentes y encargados.`
          : null,
        t.plan.setup
          ? `La instalación de ${installs} tiene un costo único de ${money(t.plan.setup)}.`
          : `La instalación de ${installs}, junto con su configuración, está incluida, sin costo adicional.`,
        c.waiter_cards > 0
          ? `Además, EL CLIENTE compra ${plural(c.waiter_cards, "tarjeta", "tarjetas")} para meseros a ${money(WAITER_CARD_PRICE)} cada una (${money(t.cards)} en total), en un pago único.`
          : null,
        t.trialMode === "starts"
          ? `Calendario de pagos: ${t.dueAtInstall ? `${money(t.dueAtInstall)} el ${longDate(c.start_date)}, día de la instalación, y ` : ""}${money(t.plan.price)} el ${longDate(t.firstCharge)}, al terminar el período de prueba${annual ? "" : `, y luego cada ${period} en esa misma fecha`}. Total del primer ${period}: ${money(t.firstPeriodTotal)}.`
          : `Calendario de pagos: el ${longDate(c.start_date)}, día de la instalación, se paga ${money(t.firstPeriodTotal)} (${[`${money(t.plan.price)} del primer ${period} del plan`, t.plan.setup ? `${money(t.plan.setup)} de instalación` : null, t.cards ? `${money(t.cards)} de tarjetas para meseros` : null].filter(Boolean).join(", ")})${annual ? "" : `; luego, ${money(t.plan.price)} cada ${period} en esa misma fecha`}.`,
        payment,
        `No existen otros cargos. Cualquier pieza o servicio adicional se cotiza y se acepta por escrito antes de cobrarse.`,
      ].filter(Boolean) as string[],
    },
    {
      title: "Instalación, piezas y configuración",
      body: [
        `En la fecha de inicio, FiveTap entrega, instala y configura ${pieces || "las piezas acordadas"}, con la marca del local${trialDone ? " (la placa de prueba cuenta dentro de estas piezas)" : ""}${t.business ? ", instala FiveTap Business en el celular del dueño y de los gerentes o encargados que EL CLIENTE indique" : ""}, y deja todo probado junto a EL CLIENTE.`,
        `El plan incluye hasta ${plural(t.plan.includedPlaques, "pieza", "piezas")} en total. EL CLIENTE puede pedir piezas adicionales por WhatsApp; FiveTap le envía el precio y la fecha de entrega antes de producirlas.`,
        `EL CLIENTE facilita el acceso al local en el horario acordado y entrega el enlace o el acceso a su perfil de Google necesario para configurar el servicio.`,
      ],
    },
    ...(t.trialMode === "starts"
      ? [
          {
            title: "Período de prueba",
            body: [
              `EL CLIENTE tiene ${TRIAL_DAYS} días de prueba, del ${longDate(c.start_date)} al ${longDate(t.trialEnds!)}. Durante la prueba no se cobra el plan.`,
              `Si EL CLIENTE decide no continuar, lo comunica por WhatsApp o por correo a más tardar el ${longDate(t.trialEnds!)}. FiveTap confirma la cancelación por escrito, retira las placas incluidas en el plan y no cobra el plan.`,
              nonRefundable.length
                ? `Lo pagado por ${nonRefundable.join(" y por ")} no se reembolsa, salvo que el servicio no haya funcionado durante la prueba por causa atribuible a FiveTap, en cuyo caso FiveTap devuelve lo pagado.`
                : `Si el servicio no funciona durante la prueba por causa atribuible a FiveTap, EL CLIENTE puede cancelar sin ningún costo.`,
            ],
          },
        ]
      : t.trialMode === "done"
        ? [
            {
              title: "Prueba gratis realizada",
              body: [
                `Antes de firmar este contrato, EL CLIENTE probó el servicio sin costo durante ${TRIAL_DAYS} días, del ${longDate(t.trialStart!)} al ${longDate(t.trialEnds!)}, con una placa NFC de prueba.`,
                `Con la firma de este contrato, EL CLIENTE decide continuar: el plan empieza el ${longDate(c.start_date)}, día en que FiveTap instala ${installs} y se hace el primer cobro. Desde esa fecha aplican las condiciones de pago y de cancelación de este contrato.`,
              ],
            },
          ]
        : []),
    {
      title: "Vigencia, renovación y precio congelado",
      body: annual
        ? [
            `El contrato inicia el ${longDate(c.start_date)}. El período pagado del Plan Anual va del ${longDate(t.firstCharge)} al ${longDate(t.lastDay)}.`,
            `El plan se renueva por un año más el ${longDate(t.renewal)}, salvo que cualquiera de las partes avise por escrito que no desea renovar a más tardar el ${longDate(t.renewalNoticeBy)} (treinta días antes).`,
            `Precio congelado: mientras el plan se renueve sin interrupción, el precio de ${money(t.plan.price)} al año no aumenta. Esto aplica al plan y a las piezas contratadas, y no incluye servicios adicionales que FiveTap ofrezca por separado. Si el plan termina y luego se contrata de nuevo, aplica el precio vigente en ese momento.`,
          ]
        : [
            `El contrato inicia el ${longDate(c.start_date)} y el primer período mensual pagado empieza el ${longDate(t.firstCharge)}. El plan se renueva cada mes de forma automática.`,
            `Precio congelado: mientras el plan siga activo sin interrupción, el precio de ${money(t.plan.price)} al mes no aumenta. Esto aplica al plan y a las piezas contratadas, y no incluye servicios adicionales que FiveTap ofrezca por separado. Si el plan termina y luego se contrata de nuevo, aplica el precio vigente en ese momento.`,
          ],
    },
    {
      title: "Cancelación",
      body: annual
        ? [
            `EL CLIENTE puede decidir no renovar con el aviso indicado en la cláusula anterior. Si decide terminar el contrato antes de que acabe el año, el servicio sigue activo hasta el ${longDate(t.lastDay)} y no se reembolsa el año ya pagado, porque su precio incluye un descuento por el compromiso anual.`,
            `Como excepción, si FiveTap incumple de forma grave y no lo corrige en quince (15) días después de recibir el aviso por escrito, EL CLIENTE puede terminar el contrato y FiveTap le devuelve la parte proporcional de los meses completos que no se usaron.`,
          ]
        : [
            `El plan no tiene permanencia mínima. EL CLIENTE puede cancelarlo en cualquier momento, sin aviso previo, desde PayPal o avisando a FiveTap por escrito. No se vuelve a cobrar; el servicio sigue activo hasta el final del último período pagado, que no se reembolsa.`,
            `Si FiveTap incumple de forma grave y no lo corrige en quince (15) días después de recibir el aviso por escrito, EL CLIENTE puede terminar el contrato de inmediato sin pagar períodos pendientes.`,
          ],
    },
    {
      title: "Garantía y soporte",
      body: [
        `FiveTap cambia sin costo las piezas que se desgasten o dejen de funcionar por el uso normal. Si una pieza se pierde o se rompe por mal uso, su reposición cuesta ${money(REPLACEMENT_FEE)}.`,
        `Si el servicio deja de funcionar por causa atribuible a FiveTap durante más de setenta y dos (72) horas seguidas, EL CLIENTE recibe un mes de servicio sin costo: ${annual ? "se agrega un mes al final del período anual" : "no se cobra el mes siguiente"}.`,
        `No se consideran atribuibles a FiveTap las fallas de Google, WhatsApp, PayPal, los operadores de telefonía o internet, los proveedores de infraestructura tecnológica ni los celulares de los usuarios. En esos casos FiveTap avisa a EL CLIENTE y le ayuda a reducir el impacto mientras se resuelve.`,
        `Soporte por WhatsApp en días hábiles, con respuesta a más tardar el siguiente día hábil.`,
      ],
    },
    {
      title: "Propiedad de las piezas",
      body: [
        `Las placas incluidas en el plan son propiedad de FiveTap y se entregan en préstamo mientras el servicio esté activo. Al terminar el servicio, EL CLIENTE las devuelve o permite que FiveTap las retire dentro de los quince (15) días siguientes. Las placas que no se devuelvan, o que se devuelvan dañadas por mal uso, se cobran a ${money(REPLACEMENT_FEE)} cada una.`,
        c.waiter_cards > 0
          ? `Las tarjetas para meseros pagadas por EL CLIENTE son de su propiedad. Al terminar el plan, seguirán llevando directamente a su página de reseñas de Google.`
          : `Las piezas que EL CLIENTE compre por separado en un pago único son de su propiedad.`,
      ],
    },
    {
      title: "Pagos atrasados",
      body: [
        `Si un pago no se recibe en su fecha, FiveTap avisa a EL CLIENTE por WhatsApp. EL CLIENTE tiene diez (10) días calendario desde el aviso para ponerse al día, sin recargos.`,
        t.business
          ? `Si el pago no se regulariza en ese plazo, FiveTap puede suspender el servicio hasta recibirlo. Mientras esté suspendido, las piezas siguen llevando a la página de reseñas de Google del local, pero se pausan FiveTap Business, los mensajes al gerente, el club de clientes y los reportes. Si la falta de pago continúa treinta (30) días más, FiveTap puede terminar el contrato y retirar sus placas.`
          : `Si el pago no se regulariza en ese plazo, FiveTap puede suspender el servicio hasta recibirlo. Si la falta de pago continúa treinta (30) días más, FiveTap puede terminar el contrato y retirar sus placas.`,
      ],
    },
    {
      title: "Datos personales y privacidad",
      body: !t.business
        ? [
            `Sin FiveTap Business, el servicio no recoge datos personales de los clientes del local: FiveTap solo cuenta los toques de cada placa, sin identificar a ninguna persona, de acuerdo con la legislación de protección de datos personales de la República de Panamá.`,
          ]
        : [
        `Los datos de los clientes del local (mensajes, nombres, WhatsApp y cumpleaños) pertenecen a EL CLIENTE. FiveTap los trata solo por cuenta de EL CLIENTE y solo para prestar el servicio: no los vende, no los cede a terceros ni los usa para fines propios, y aplica medidas de seguridad razonables, de acuerdo con la legislación de protección de datos personales de la República de Panamá.`,
        `EL CLIENTE informa a sus clientes sobre el uso de sus datos, usa los datos del club solo para enviar sus propias promociones y atiende a quien pida dejar de recibirlas. El formulario del club pide el consentimiento de cada persona y enlaza a la política de privacidad de FiveTap.`,
        `Al terminar el contrato, EL CLIENTE puede pedir por escrito que FiveTap le entregue sus datos en un archivo de Excel o que los elimine. FiveTap lo hace dentro de los treinta (30) días siguientes a la solicitud. Si EL CLIENTE no pide nada, los datos se eliminan noventa (90) días después de terminar el contrato. FiveTap puede conservar estadísticas que no identifiquen a ninguna persona.`,
      ],
    },
    {
      title: "Propiedad intelectual y protección del sistema",
      body: [
        `El sistema FiveTap, incluidos su software, código, diseño, estructura, interfaces, configuraciones, metodología, contenidos y mejoras, pertenece a FiveTap o a sus respectivos titulares. Contratar el servicio no transfiere la propiedad del sistema: EL CLIENTE recibe una autorización de uso no exclusiva e intransferible mientras el contrato esté vigente.`,
        `EL CLIENTE no puede copiar, revender, distribuir, sublicenciar ni intentar extraer, descompilar o replicar el sistema o su funcionamiento interno sin autorización escrita de FiveTap. Las mejoras generales del sistema, aunque se inspiren en sugerencias de EL CLIENTE, siguen perteneciendo a FiveTap.`,
        `La marca, el logo y los datos de EL CLIENTE siguen siendo suyos. EL CLIENTE autoriza a FiveTap a usarlos solo para personalizar las piezas y las páginas del servicio. FiveTap solo menciona a EL CLIENTE como cliente en su publicidad si este lo autoriza por escrito.`,
      ],
    },
    {
      title: "Confidencialidad",
      body: [
        `Cada parte trata como confidencial la información de la otra a la que tenga acceso por este contrato y no la comparte con terceros, salvo que sea pública o que la ley o una autoridad la exija. Para FiveTap esto incluye en especial la información técnica, comercial y de funcionamiento interno del sistema; para EL CLIENTE, sus datos comerciales y los de sus clientes.`,
        `Esta obligación se mantiene durante el contrato y por dos (2) años después de su terminación.`,
      ],
    },
    {
      title: "Google y plataformas externas",
      body: [
        `FiveTap no controla Google, WhatsApp ni otras plataformas externas, ni sus reglas, que pueden cambiar. FiveTap no garantiza que una reseña se publique, se mantenga visible o influya en el posicionamiento del local.`,
        `Para cumplir esas reglas, el servicio muestra el botón de reseña de Google a todos los clientes por igual. Ninguna de las partes puede usar el servicio para publicar reseñas falsas, comprar u ofrecer premios o descuentos a cambio de reseñas, ni manipular calificaciones.`,
      ],
    },
    {
      title: "Responsabilidades del cliente",
      body: [`EL CLIENTE se compromete a:`],
      items: [
        "usar las placas y tarjetas de forma correcta y avisar a FiveTap si alguna se daña o se pierde;",
        "no alterar, reprogramar ni manipular las piezas o el sistema;",
        "entregar información correcta y mantener actualizados sus datos de contacto;",
        "facilitar el acceso al local para la instalación y el mantenimiento;",
        "respetar las políticas de Google y WhatsApp;",
        "informar a sus clientes y obtener las autorizaciones necesarias para el uso de sus datos personales.",
      ],
    },
    {
      title: "Limitación de responsabilidad",
      body: [
        `FiveTap no responde por pérdidas de ingresos, ventas o reputación causadas por decisiones o cambios de Google u otras plataformas, por fallas de terceros, por interrupciones externas o por decisiones del propio local.`,
        `En cualquier otro caso, la responsabilidad total de FiveTap se limita al monto pagado por EL CLIENTE en los doce (12) meses anteriores al hecho que la origine. Esta limitación no aplica en casos de dolo o culpa grave, ni a las obligaciones que la ley no permita limitar.`,
      ],
    },
    {
      title: "Suspensión y terminación del servicio",
      body: [
        `FiveTap puede suspender temporalmente el servicio por falta de pago, conforme a la cláusula de pagos atrasados, o por uso indebido o incumplimiento importante de EL CLIENTE. Antes de suspender, FiveTap avisa por escrito y da diez (10) días para corregir la situación. Si el uso indebido pone en riesgo el perfil de Google del local o a terceros, como la publicación de reseñas falsas, la suspensión puede ser inmediata.`,
        `Cualquiera de las partes puede terminar el contrato si la otra incumple de forma grave y no lo corrige en quince (15) días después de recibir el aviso por escrito. Al terminar, se pagan los montos vencidos y se aplican las cláusulas de propiedad de las piezas y de datos personales.`,
      ],
    },
    {
      title: "Fuerza mayor",
      body: [
        `Ninguna de las partes es responsable por no cumplir sus obligaciones mientras lo impida un hecho extraordinario fuera de su control razonable, como desastres naturales, cortes generales de energía o de internet, o decisiones de autoridades. La parte afectada avisa a la otra lo antes posible y retoma sus obligaciones cuando el hecho termine.`,
      ],
    },
    {
      title: "Notificaciones y modificaciones",
      body: [
        `Las comunicaciones oficiales se hacen por escrito a los contactos indicados en este contrato, por WhatsApp o por correo electrónico. Cada parte avisa a la otra si cambian sus datos de contacto.`,
        `Cualquier cambio en las condiciones de este contrato se documenta por escrito y requiere la aceptación de ambas partes.`,
      ],
    },
    {
      title: "Legislación aplicable y solución de desacuerdos",
      body: [
        `Este contrato se rige por las leyes de la República de Panamá. Ante cualquier desacuerdo, las partes buscan primero una solución amistosa durante quince (15) días. Si no la alcanzan, pueden acudir a un centro de conciliación o mediación y, en último término, a los tribunales competentes de la ciudad de Panamá.`,
        `Este contrato se firma en dos (2) ejemplares del mismo tenor, uno para cada parte.`,
      ],
    },
  ];
}
