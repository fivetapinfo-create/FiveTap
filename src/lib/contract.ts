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

/** Installation is included in every plan since November 2026 (it used to be $150). */
export const SETUP_FEE = 0;
export const WAITER_CARD_PRICE = 25;
/** Waiter cards included in the annual plan. */
export const ANNUAL_FREE_CARDS = 2;
export const TRIAL_DAYS = 7;
export const REPLACEMENT_FEE = 10;

export const PLANS = {
  monthly: { name: "Plan Mensual", label: "Plan mensual todo incluido + FiveTap Business", price: 129, every: "mes", setup: SETUP_FEE, months: 1, includedPlaques: 10, perPlaque: false },
  // Annual: plaques branded with the venue's logo, quantity as quoted; 2 waiter cards included.
  annual: { name: "Plan Anual", label: "Plan anual + placas con tu marca + FiveTap Business", price: 1290, every: "año", setup: 0, months: 12, includedPlaques: 0, perPlaque: false },
  plaque: { name: "Plan Placa", label: "Mensualidad de 1 placa", price: 35, every: "mes", setup: 0, months: 1, includedPlaques: 1, perPlaque: false },
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
  const paidCards = c.plan === "annual" ? Math.max(0, c.waiter_cards - ANNUAL_FREE_CARDS) : c.waiter_cards;
  const cards = paidCards * WAITER_CARD_PRICE;
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
 * Version 3.0 of the service contract: short, plain Spanish, nine clauses. It keeps
 * what protects FiveTap (price, cancellation, late payments, plaques returned, data,
 * Google rules, liability) and drops the rest. Not legal advice: have a Panamanian
 * lawyer review it.
 */
export function contractClauses(c: ContractInput, _p: Provider): Clause[] {
  const t = contractTerms(c);
  const annual = c.plan === "annual";
  const period = annual ? "año" : "mes";
  const pieces = [
    c.plaques > 0 ? plural(c.plaques, "placa NFC", "placas NFC") : null,
    c.waiter_cards > 0 ? `${plural(c.waiter_cards, "tarjeta NFC", "tarjetas NFC")} para meseros` : null,
  ].filter(Boolean).join(" y ");
  const installs = t.business ? "las placas y FiveTap Business" : "las placas";

  const included = t.business
    ? [
        "placas NFC premium, programadas para llevar a cada cliente a la página de reseñas del local;",
        "“Hablar con el gerente”: un canal privado para que cualquier cliente escriba directamente al local;",
        "el club de clientes, donde cada persona, si lo desea, deja su WhatsApp y su cumpleaños para recibir promociones del local;",
        "FiveTap Business: la aplicación del local para el dueño, gerentes y encargados, con los resultados en tiempo real, las reseñas antes y después de FiveTap, el rendimiento de cada placa y mesero, los mensajes, el club y avisos al celular;",
        "el resumen diario y el reporte mensual de resultados, automáticos dentro de FiveTap Business."
      ]
    : [
        "placas NFC premium, programadas para llevar a cada cliente directo a la ventana de reseñas de Google del local;",
        "soporte por WhatsApp y cambio de las placas que dejen de funcionar por desgaste normal.",
      ];

  const price = annual
    ? `${money(t.plan.price)} al año (equivale a ${money(t.plan.price / 12)} al mes), pagados por adelantado`
    : c.plan === "plaque"
      ? `${money(t.plan.price)} al mes (${plural(Math.max(1, c.plaques), "placa", "placas")} × ${money(PLANS.plaque.price)})`
      : `${money(t.plan.price)} al mes`;
  const planName = c.plan === "plaque" ? `una mensualidad por placa${t.business ? " con FiveTap Business" : " (directo a Google)"}` : `el ${t.plan.name} con FiveTap Business`;
  const extras = [
    t.plan.setup ? `instalación de ${installs}: ${money(t.plan.setup)} (pago único)` : `instalación de ${installs}: incluida`,
    c.waiter_cards > 0
      ? annual && t.cards === 0
        ? `${plural(c.waiter_cards, "tarjeta", "tarjetas")} para meseros: incluidas`
        : `${plural(c.waiter_cards, "tarjeta", "tarjetas")} para meseros: ${money(t.cards)} (pago único${annual ? `; ${ANNUAL_FREE_CARDS} incluidas` : `, ${money(WAITER_CARD_PRICE)} c/u`})`
      : null,
  ].filter(Boolean).join("; ");
  const calendar =
    t.trialMode === "starts"
      ? `${t.dueAtInstall ? `${money(t.dueAtInstall)} el ${longDate(c.start_date)}, día de la instalación, y ` : ""}${money(t.plan.price)} el ${longDate(t.firstCharge)}, al terminar la prueba${annual ? "" : `; luego, cada ${period} en esa misma fecha`}`
      : annual
        ? `${money(t.firstPeriodTotal)} el ${longDate(c.start_date)}, día de la instalación, en un solo pago o en dos partes iguales: la mitad por PayPal y la otra mitad en efectivo o Yappy ese mismo día`
        : `${money(t.firstPeriodTotal)} el ${longDate(c.start_date)}, día de la instalación; luego, ${money(t.plan.price)} cada ${period} en esa misma fecha`;

  return [
    {
      title: "El servicio",
      body: [
        `FiveTap presta a EL CLIENTE un servicio para que más clientes satisfechos dejen su reseña en Google y para que el local se entere a tiempo de lo que no salió bien. Incluye:`,
        `FiveTap facilita reseñas auténticas, pero no garantiza un número de reseñas, una calificación ni una posición en Google.`,
      ],
      items: included,
    },
    {
      title: "Plan y pagos",
      body: [
        `EL CLIENTE contrata ${planName}: ${price}.${t.business ? ` Incluye todo lo anterior, sin costo por usuario.` : ""}`,
        `Además: ${extras}.`,
        `Calendario: ${calendar}. ${annual ? "" : t.automatic ? "Se cobra de forma automática por PayPal. " : `Se paga por ${c.payment_method}; FiveTap recuerda cada fecha con tres (3) días de anticipación. `}No hay otros cargos: cualquier extra se cotiza y se acepta por escrito antes de cobrarse.`,
      ],
    },
    ...(t.trialMode === "starts"
      ? [{
          title: "Prueba gratis",
          body: [
            `EL CLIENTE prueba el servicio sin costo del ${longDate(c.start_date)} al ${longDate(t.trialEnds!)}. Si decide no continuar, avisa por WhatsApp a más tardar ese día: FiveTap retira las placas y no cobra el plan.`,
          ],
        }]
      : t.trialMode === "done"
        ? [{
            title: "Prueba gratis",
            body: [
              `EL CLIENTE ya probó el servicio sin costo del ${longDate(t.trialStart!)} al ${longDate(t.trialEnds!)}, con una placa NFC de prueba. Al firmar decide continuar: el plan empieza el ${longDate(c.start_date)}, día en que FiveTap instala ${installs}.`,
            ],
          }]
        : []),
    {
      title: "Placas y soporte",
      body: [
        `El ${longDate(c.start_date)} FiveTap instala y deja funcionando ${pieces || "las piezas acordadas"}${annual ? ", fabricadas con la marca del local según la cotización aceptada" : ""}${t.business ? ", e instala FiveTap Business en el celular del dueño y de las personas que él indique" : ""}.${t.plan.includedPlaques ? ` El plan cubre hasta ${plural(t.plan.includedPlaques, "pieza", "piezas")}.` : ""}`,
        `Las placas del plan son de FiveTap y se entregan en préstamo; al terminar el servicio se devuelven en los quince (15) días siguientes. ${c.waiter_cards > 0 ? "Las tarjetas para meseros pagadas por EL CLIENTE son suyas. " : ""}FiveTap cambia gratis las piezas gastadas por el uso; una pieza perdida o rota por mal uso cuesta ${money(REPLACEMENT_FEE)}.`,
        annual
          ? `Las placas con la marca del local se fabrican a medida para este plan. Si EL CLIENTE quiere más, se cotizan aparte, por escrito.`
          : `Edición con la marca del local (opcional): FiveTap puede fabricar las placas a medida con el logo y los colores de EL CLIENTE y reemplazar las instaladas. Se cotiza aparte, por escrito.`,
        `Soporte por WhatsApp en días hábiles, con respuesta a más tardar el siguiente día hábil.`,
      ],
    },
    {
      title: annual ? "Duración, renovación y cancelación" : "Duración y cancelación",
      body: annual
        ? [
            `El plan cubre del ${longDate(t.firstCharge)} al ${longDate(t.lastDay)} y se renueva por otro año, salvo aviso por escrito de no renovar a más tardar el ${longDate(t.renewalNoticeBy)}. Mientras se renueve sin interrupción, el precio no sube.`,
            `El año pagado no se reembolsa, porque su precio incluye un descuento. Solo si FiveTap incumple de forma grave y no lo corrige en quince (15) días, EL CLIENTE puede terminar y recibe la parte proporcional de los meses no usados.`,
          ]
        : [
            `El plan se renueva cada mes y no tiene permanencia. EL CLIENTE lo cancela cuando quiera, desde PayPal, desde su app o con un mensaje: no se vuelve a cobrar y el servicio sigue hasta el final del mes ya pagado, que no se reembolsa.`,
            `Mientras el plan siga activo sin interrupción, el precio no sube.`,
          ],
    },
    {
      title: "Pagos atrasados",
      body: [
        `Si un pago no llega en su fecha, FiveTap avisa por WhatsApp y EL CLIENTE tiene diez (10) días para ponerse al día, sin recargos. Después, FiveTap puede suspender el servicio${t.business ? " (las placas siguen llevando a Google, pero se pausan FiveTap Business, los mensajes y el club)" : ""} y, si el atraso sigue treinta (30) días más, terminar el contrato y retirar sus placas.`,
      ],
    },
    {
      title: "Datos y confidencialidad",
      body: t.business
        ? [
            `Los datos de los clientes del local (mensajes, nombres, WhatsApp y cumpleaños) son de EL CLIENTE. FiveTap los usa solo para prestar el servicio, no los vende ni los comparte, y los protege según la ley de protección de datos personales de Panamá. EL CLIENTE los usa solo para sus propias promociones y respeta a quien pida no recibirlas. Al terminar, FiveTap se los entrega en Excel o los elimina, si EL CLIENTE lo pide.`,
            `Ambas partes guardan en confidencialidad la información de la otra durante el contrato y dos (2) años después.`,
          ]
        : [
            `Sin FiveTap Business, el servicio no recoge datos personales: solo cuenta los toques de cada placa, sin identificar a nadie. Ambas partes guardan en confidencialidad la información de la otra durante el contrato y dos (2) años después.`,
          ],
    },
    {
      title: "Uso correcto y responsabilidad",
      body: [
        `Para cumplir las reglas de Google, todos los clientes ven el botón de reseña por igual. Nadie puede usar el servicio para reseñas falsas ni para dar premios a cambio de reseñas. EL CLIENTE no altera ni reprograma las placas.`,
        `El sistema FiveTap (software, diseño y método) es de FiveTap; EL CLIENTE lo usa mientras el contrato esté vigente y no puede copiarlo ni revenderlo. La marca y el logo de EL CLIENTE siguen siendo suyos.`,
        `FiveTap no responde por decisiones o fallas de Google, WhatsApp, PayPal u otros terceros, ni por hechos de fuerza mayor. En cualquier otro caso, su responsabilidad se limita a lo pagado por EL CLIENTE en los últimos doce (12) meses, salvo dolo o culpa grave.`,
      ],
    },
    {
      title: "Ley aplicable",
      body: [
        `Este contrato se rige por las leyes de la República de Panamá. Cualquier cambio se hace por escrito y con la aceptación de ambas partes. Ante un desacuerdo, las partes buscan primero una solución amistosa durante quince (15) días y, si no la logran, acuden a los tribunales de la ciudad de Panamá.`,
      ],
    },
  ];
}
