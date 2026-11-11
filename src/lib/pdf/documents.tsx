import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { MARK_PATH } from "@/components/Logo";
import {
  type ContractInput,
  type Provider,
  PLANS,
  REPLACEMENT_FEE,
  ANNUAL_FREE_CARDS,
  WAITER_CARD_PRICE,
  contractClauses,
  contractTerms,
  longDate,
  money,
} from "../contract";
import { AGREEMENT_MONTHS, type Agreement, agreementClauses, longDay, money2 } from "../agreement";

// Satoshi, the brand typeface (Fontshare, free for commercial use), embedded
// from the project. No automatic hyphenation: names and legal text never break.
const FONTS = path.join(process.cwd(), "src", "fonts");
Font.register({
  family: "Satoshi",
  fonts: [
    { src: path.join(FONTS, "Satoshi-400.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "Satoshi-500.ttf"), fontWeight: 500 },
    { src: path.join(FONTS, "Satoshi-700.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const INK = "#0a0a0a";
const TEXT = "#26251f";
const MUTED = "#6b6a64";
const LINE = "#e6e4de";
const SOFT = "#f6f5f1";
const GOLD = "#b8941f";

const s = StyleSheet.create({
  page: { paddingTop: 92, paddingBottom: 64, paddingHorizontal: 54, fontFamily: "Satoshi", fontSize: 9.4, color: TEXT, lineHeight: 1.5 },
  head: { position: "absolute", top: 34, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: LINE },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { fontWeight: 700, fontSize: 13, color: INK, letterSpacing: -0.3 },
  headRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headDoc: { fontSize: 8, color: MUTED },
  pill: { fontSize: 8, fontWeight: 700, color: INK, borderWidth: 0.75, borderColor: LINE, borderRadius: 99, paddingVertical: 2.5, paddingHorizontal: 8 },
  small: { fontSize: 7.8, color: MUTED, lineHeight: 1.45 },
  eyebrow: { fontSize: 7.5, fontWeight: 700, color: MUTED, letterSpacing: 1.4, textTransform: "uppercase" },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  title: { fontWeight: 700, fontSize: 22, color: INK, letterSpacing: -0.6, lineHeight: 1.15, marginTop: 6 },
  subtitle: { fontSize: 9.5, color: MUTED, marginTop: 4 },
  rule: { height: 2, width: 32, backgroundColor: GOLD, marginTop: 12 },
  logo: { width: 54, height: 54, objectFit: "contain", borderRadius: 10, borderWidth: 0.75, borderColor: LINE },
  facts: { flexDirection: "row", borderWidth: 0.75, borderColor: LINE, borderRadius: 10, marginBottom: 12 },
  fact: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 0.75, borderLeftColor: LINE },
  factFirst: { borderLeftWidth: 0 },
  factValue: { fontWeight: 700, fontSize: 12, color: INK, marginTop: 3, letterSpacing: -0.2 },
  parties: { flexDirection: "row", gap: 12, marginBottom: 12 },
  party: { flex: 1, borderWidth: 0.75, borderColor: LINE, borderRadius: 10, padding: 12, gap: 1.5 },
  partyName: { fontWeight: 700, fontSize: 11, color: INK, marginTop: 4, marginBottom: 3 },
  kv: { flexDirection: "row", gap: 6 },
  kvKey: { width: 74, color: MUTED, fontSize: 8.4 },
  kvVal: { flex: 1, fontSize: 8.6, color: TEXT },
  section: { fontWeight: 700, fontSize: 11.5, color: INK, letterSpacing: -0.2, marginTop: 4, marginBottom: 6 },
  table: { borderWidth: 0.75, borderColor: LINE, borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  tr: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: LINE, paddingVertical: 5, paddingHorizontal: 12 },
  trFirst: { borderTopWidth: 0 },
  trHead: { backgroundColor: SOFT },
  trTotal: { backgroundColor: SOFT },
  th: { fontSize: 7.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8, textTransform: "uppercase" },
  td1: { width: "36%", color: MUTED },
  td2: { width: "64%", fontWeight: 500, color: INK },
  clause: { marginBottom: 10 },
  clauseHead: { flexDirection: "row", gap: 8, alignItems: "baseline", marginBottom: 3 },
  clauseNum: { fontWeight: 700, fontSize: 9, color: GOLD, width: 16 },
  clauseTitle: { fontWeight: 700, fontSize: 10.2, color: INK },
  para: { marginBottom: 3, textAlign: "justify", paddingLeft: 24 },
  item: { flexDirection: "row", paddingLeft: 24, marginBottom: 1.5 },
  itemMark: { width: 14, color: MUTED },
  itemText: { flex: 1, textAlign: "justify" },
  signIntro: { marginBottom: 10, color: TEXT },
  signs: { flexDirection: "row", gap: 14, marginTop: 6, flexWrap: "wrap" },
  sign: { flex: 1, minWidth: 150, borderWidth: 0.75, borderColor: LINE, borderRadius: 10, padding: 12 },
  signFor: { fontSize: 7.2, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 34 },
  signLine: { borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 6 },
  strong: { fontWeight: 700, color: INK },
  footer: { position: "absolute", bottom: 28, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 7.4, color: MUTED, borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 8 },
  label: { fontSize: 7.5, fontWeight: 700, color: MUTED, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
});

function Mark({ size = 16 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 100 100" width={size} height={size}>
      <Path d={MARK_PATH} fill={INK} />
    </Svg>
  );
}

function Header({ doc, tag }: { doc: string; tag: string }) {
  return (
    <View style={s.head} fixed>
      <View style={s.brand}>
        <Mark />
        <Text style={s.brandName}>FiveTap</Text>
      </View>
      <View style={s.headRight}>
        <Text style={s.headDoc}>{doc}</Text>
        <Text style={s.pill}>{tag}</Text>
      </View>
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <View style={s.table}>
      {rows.map(([k, v], i) => (
        <View key={k} style={[s.tr, i === 0 ? s.trFirst : {}]} wrap={false}>
          <Text style={s.td1}>{k}</Text>
          <Text style={s.td2}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.kv}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={s.kvVal}>{v}</Text>
    </View>
  );
}

const BLANK = "______________________";
const fullName = (f: Provider["founder"]) => (f ? `${f.first_name} ${f.last_name}` : BLANK);
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function Sign({ forWho, name, role }: { forWho: string; name: string; role: string }) {
  return (
    <View style={s.sign} wrap={false}>
      <Text style={s.signFor}>{forWho}</Text>
      <View style={s.signLine}>
        <Text style={s.strong}>{name}</Text>
        <Text style={s.small}>{role}</Text>
      </View>
    </View>
  );
}

/** The client service contract (v3.0), ready to review, print in two copies and sign. */
export async function contractPdf(c: ContractInput, p: Provider, logo: Buffer | null) {
  const t = contractTerms(c);
  const clauses = contractClauses(c, p);
  const annual = c.plan === "annual";
  const period = annual ? "año" : "mes";
  const contact = process.env.NEXT_PUBLIC_SALES_WHATSAPP?.replace(/\D/g, "");
  const local = contact?.length === 8 ? contact : contact?.startsWith("507") && contact.length === 11 ? contact.slice(3) : null;
  const providerContact = contact ? `WhatsApp ${local ? `+507 ${local.slice(0, 4)}-${local.slice(4)}` : `+${contact}`}` : BLANK;

  const money3: [string, string, string][] = [
    [c.plan === "plaque" ? `Mensualidad por placa (${Math.max(1, c.plaques)} × ${money(PLANS.plaque.price)})${t.business ? " · con FiveTap Business" : ""}` : `${t.plan.name} · incluye FiveTap Business`, annual ? `12 meses, del ${longDate(t.firstCharge)} al ${longDate(t.lastDay)}` : `Cada ${period}, desde el ${longDate(t.firstCharge)}`, money(t.plan.price)],
    [t.business ? "Instalación: placas y FiveTap Business" : "Instalación de las placas", t.plan.setup ? `Pago único, ${longDate(c.start_date)}` : "Incluida en el plan", t.plan.setup ? money(t.plan.setup) : "$0"],
    ...(c.waiter_cards > 0
      ? ([["Tarjetas para meseros", annual && !t.cards ? `${c.waiter_cards} incluidas en el plan anual` : `${c.waiter_cards} × ${money(WAITER_CARD_PRICE)}${annual ? ` (${ANNUAL_FREE_CARDS} incluidas)` : ""} · pago único, ${longDate(c.start_date)}`, money(t.cards)]] as [string, string, string][])
      : []),
  ];

  const dates: [string, string][] = [
    // Start and renewal (annual) or first payment (monthly) are already in the facts row.
    ...(t.trialMode === "starts"
      ? ([["Fin del período de prueba", longDate(t.trialEnds!)]] as [string, string][])
      : t.trialMode === "done"
        ? ([["Prueba gratis realizada", `Del ${longDate(t.trialStart!)} al ${longDate(t.trialEnds!)}, con placa de prueba`]] as [string, string][])
        : []),
    ...(annual
      ? ([["Primer pago del plan", longDate(t.firstCharge)], ["Aviso de no renovación", `A más tardar el ${longDate(t.renewalNoticeBy)}`]] as [string, string][])
      : ([["Siguiente pago", longDate(t.renewal)]] as [string, string][])),
    ["Piezas", [c.plaques ? `${c.plaques} placas NFC (préstamo)` : null, c.waiter_cards ? `${c.waiter_cards} tarjetas NFC para meseros (propiedad del cliente)` : null].filter(Boolean).join(" · ") || "—"],
    ["Forma de pago", t.automatic ? "PayPal (cobro automático)" : `${c.payment_method} (pago en cada fecha, con recordatorio)`],
    ["Reposición por pérdida o rotura", `${money(REPLACEMENT_FEE)} por pieza`],
  ];

  const doc = (
    <Document title={`Contrato ${c.number} — ${c.venue_name}`} author="FiveTap" language="es">
      <Page size="LETTER" style={s.page}>
        <Header doc="Contrato de servicio" tag={c.number} />

        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Contrato de prestación de servicios</Text>
            <Text style={s.title}>{`FiveTap × ${c.venue_name}`}</Text>
            <Text style={s.subtitle}>{`${c.venue_kind} · Contrato ${c.number} · ${longDate(c.created_at)}`}</Text>
            <View style={s.rule} />
          </View>
          {logo ? <Image style={s.logo} src={logo} /> : null}
        </View>

        <View style={s.facts} wrap={false}>
          {[
            ["Plan", `${t.plan.name.replace("Plan ", "")} · ${money(t.plan.price)}/${period}`],
            [`Total primer ${period}`, money(t.firstPeriodTotal)],
            ["Inicio", longDate(c.start_date)],
            [annual ? "Renovación" : "Primer pago", longDate(annual ? t.renewal : t.firstCharge)],
          ].map(([k, v], i) => (
            <View key={k} style={[s.fact, i === 0 ? s.factFirst : {}]}>
              <Text style={s.eyebrow}>{k}</Text>
              <Text style={s.factValue}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={s.parties} wrap={false}>
          <View style={s.party}>
            <Text style={s.eyebrow}>El proveedor</Text>
            <Text style={s.partyName}>{p.legal_name ? `${p.legal_name} (${p.trade_name})` : `${p.trade_name}`}</Text>
            {!p.legal_name ? <KV k="Tipo" v="Marca comercial de servicios tecnológicos" /> : null}
            <KV k={p.founder?.role ?? "Fundador"} v={fullName(p.founder)} />
            {p.representative ? <KV k="Representante" v={`${p.representative.name} (${p.representative.role})`} /> : null}
            {p.legal_address ? <KV k="Domicilio" v={p.legal_address} /> : null}
            <KV k="Contacto" v={providerContact} />
          </View>
          <View style={s.party}>
            <Text style={s.eyebrow}>El cliente</Text>
            <Text style={s.partyName}>{c.venue_name}</Text>
            <KV k="Tipo" v={c.venue_kind} />
            <KV k="Dirección" v={t.address} />
            <KV k="Firma" v={`${c.signer_name}, ${c.signer_role}`} />
            <KV k="Contacto" v={[c.phone, c.email].filter(Boolean).join(" · ") || BLANK} />
          </View>
        </View>

        <Text style={s.section}>Condiciones económicas</Text>
        <View style={s.table} wrap={false}>
          <View style={[s.tr, s.trFirst, s.trHead]}>
            <Text style={[s.th, { width: "34%" }]}>Concepto</Text>
            <Text style={[s.th, { width: "48%" }]}>Detalle</Text>
            <Text style={[s.th, { width: "18%", textAlign: "right" }]}>Monto</Text>
          </View>
          {money3.map(([a, b, m]) => (
            <View key={a} style={s.tr}>
              <Text style={{ width: "34%", fontWeight: 500, color: INK }}>{a}</Text>
              <Text style={{ width: "48%", color: MUTED }}>{b}</Text>
              <Text style={{ width: "18%", textAlign: "right", fontWeight: 500, color: INK }}>{m}</Text>
            </View>
          ))}
          <View style={[s.tr, s.trTotal]}>
            <Text style={{ width: "82%", fontWeight: 700, color: INK }}>{`Total del primer ${period}`}</Text>
            <Text style={{ width: "18%", textAlign: "right", fontWeight: 700, color: INK }}>{money(t.firstPeriodTotal)}</Text>
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.section}>Fechas y detalles</Text>
          <Rows rows={dates} />
        </View>

        {clauses.map((cl, i) => (
          <View key={cl.title} style={s.clause}>
            {/* The title always travels with its first paragraph: never alone at a page end. */}
            <View wrap={false}>
              {i === 0 ? <Text style={s.section}>Cláusulas</Text> : null}
              <View style={s.clauseHead}>
                <Text style={s.clauseNum}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={s.clauseTitle}>{cl.title}</Text>
              </View>
              {cl.body.slice(0, 1).map((b, j) => <Text key={`a${j}`} style={s.para}>{b}</Text>)}
            </View>
            {cl.items?.map((it, j) => (
              <View key={`i${j}`} style={s.item}>
                <Text style={s.itemMark}>{`${LETTERS[j]})`}</Text>
                <Text style={s.itemText}>{it}</Text>
              </View>
            ))}
            {cl.body.slice(1).map((b, j) => <Text key={`b${j}`} style={[s.para, cl.items ? { marginTop: 3 } : {}]}>{b}</Text>)}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text style={s.section}>Firmas</Text>
          <Text style={s.signIntro}>
            Las partes leen este contrato, están de acuerdo con su contenido y lo firman en dos (2) ejemplares, en la ciudad de Panamá, el ____ de ______________ de ________.
          </Text>
          <View style={s.signs}>
            {p.representative ? <Sign forWho="Por FiveTap" name={p.representative.name} role={p.representative.role} /> : null}
            <Sign forWho={p.representative ? "FiveTap · Fundador" : "Por FiveTap"} name={fullName(p.founder)} role={p.founder?.role ?? "Fundador"} />
            <Sign forWho="Por el cliente" name={c.signer_name} role={`${c.signer_role} · ${c.venue_name}`} />
          </View>
        </View>

        <Footer left={`FiveTap · Contrato ${c.number} · ${c.venue_name}`} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export type FounderRow = { first_name: string; last_name: string; passport: string | null; nationality: string | null; role: string; equity_pct: number; joined_on: string };
export type CompanyRow = {
  representative_name?: string | null;
  representative_id?: string | null;
  representative_role?: string | null;
  trade_name: string;
  legal_name: string | null;
  entity_type: string | null;
  registry_number: string | null;
  constitution_date: string | null;
  legal_address: string | null;
  option_pool_pct: number;
};

/** Internal founder agreement: who owns what and who does what. */
export async function founderAgreementPdf(c: CompanyRow, founders: FounderRow[], today: string) {
  const company = c.legal_name ? `${c.legal_name} (${c.trade_name})` : c.trade_name;
  const pool = Number(c.option_pool_pct) || 0;
  const rows: [string, string][] = [
    ["Empresa", company],
    ["Tipo de sociedad", c.entity_type || "En constitución"],
    ["Registro / Folio", c.registry_number || "Pendiente"],
    ["Fecha de constitución", c.constitution_date ? longDate(c.constitution_date) : "Pendiente"],
    ["Domicilio legal", c.legal_address || "Pendiente"],
  ];
  const clauses: [string, string][] = [
    ["Objeto", `Este acuerdo deja por escrito quién fundó ${c.trade_name}, qué participación tiene cada fundador y cuál es su rol.`],
    ["Participación", `La participación de cada fundador es la indicada en la tabla. ${pool ? `Se reserva un ${pool}% para futuros miembros del equipo.` : "No hay reserva para futuros miembros del equipo."}`],
    ["Propiedad intelectual", `El software, la marca, el diseño, los dominios, las cuentas y los contactos de clientes creados para ${c.trade_name} pertenecen a la empresa, no a una persona.`],
    ["Dedicación", `Cada fundador se dedica a su rol y no desarrolla un negocio que compita directamente con ${c.trade_name} mientras sea parte de ella.`],
    ["Confidencialidad", `La información de clientes, precios, proveedores y finanzas es confidencial, también después de que un fundador deje la empresa.`],
    ["Decisiones", founders.length > 1 ? `Las decisiones importantes (vender la empresa, aceptar inversión, cambiar participaciones) requieren el acuerdo de fundadores que sumen más del 50% de la participación.` : `Mientras haya un solo fundador, este toma las decisiones de la empresa y documenta los cambios importantes por escrito.`],
    ["Nuevos socios o inversión", `La entrada de un nuevo socio o inversionista se documenta por escrito y actualiza la tabla de participación.`],
    ...(c.representative_name
      ? ([["Representación", `${c.representative_name} firma este acuerdo como ${(c.representative_role || "representante legal").toLowerCase()} y representa a la empresa en los actos que lo requieran, sin que esto le dé participación en ella salvo que la tabla lo indique.`]] as [string, string][])
      : []),
    ["Ley aplicable", `Este acuerdo se rige por las leyes de la República de Panamá.`],
  ];

  const doc = (
    <Document title={`Acuerdo de fundadores — ${c.trade_name}`} author={c.trade_name} language="es">
      <Page size="LETTER" style={s.page}>
        <Header doc="Acuerdo de fundadores" tag={longDate(today)} />
        <Text style={s.title}>Acuerdo de fundadores</Text>
        <Text style={s.subtitle}>{company}</Text>
        <View style={s.rule} />

        <Text style={s.label}>La empresa</Text>
        <Rows rows={rows} />

        <Text style={s.label}>Fundadores y participación</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trFirst]}>
            {["Nombre", "Pasaporte", "Rol", "Desde", "%"].map((h, i) => (
              <Text key={h} style={{ width: ["30%", "20%", "26%", "14%", "10%"][i], color: MUTED, fontSize: 8 }}>{h}</Text>
            ))}
          </View>
          {founders.map((f) => (
            <View key={f.first_name + f.last_name} style={s.tr}>
              <Text style={{ width: "30%", fontFamily: "Helvetica-Bold" }}>{f.first_name} {f.last_name}</Text>
              <Text style={{ width: "20%" }}>{f.passport || "—"}</Text>
              <Text style={{ width: "26%" }}>{f.role}</Text>
              <Text style={{ width: "14%" }}>{f.joined_on.slice(0, 10)}</Text>
              <Text style={{ width: "10%", fontFamily: "Helvetica-Bold" }}>{Number(f.equity_pct)}%</Text>
            </View>
          ))}
          {pool > 0 && (
            <View style={s.tr}>
              <Text style={{ width: "90%", color: MUTED }}>Reserva para equipo (opciones)</Text>
              <Text style={{ width: "10%", fontFamily: "Helvetica-Bold" }}>{pool}%</Text>
            </View>
          )}
        </View>

        <Text style={[s.label, { marginBottom: 8 }]}>Acuerdos</Text>
        {clauses.map(([title, body], i) => (
          <View key={title} style={s.clause} wrap={false}>
            <Text style={s.clauseTitle}>{i + 1}. {title}</Text>
            <Text style={s.para}>{body}</Text>
          </View>
        ))}

        <View style={[s.signs, { flexWrap: "wrap" }]} wrap={false}>
          {c.representative_name ? (
            <View style={[s.sign, { minWidth: 200 }]}>
              <View style={s.signLine}>
                <Text style={s.strong}>{c.representative_name}</Text>
                <Text style={s.small}>{`${c.representative_role || "Representante legal"}${c.representative_id ? ` · ${c.representative_id}` : ""}`}</Text>
                <Text style={s.small}>Fecha: ____ / ____ / ________</Text>
              </View>
            </View>
          ) : null}
          {founders.map((f) => (
            <View key={f.first_name + f.last_name} style={[s.sign, { minWidth: 200 }]}>
              <View style={s.signLine}>
                <Text style={s.strong}>{f.first_name} {f.last_name}</Text>
                <Text style={s.small}>{`${f.role}${f.passport ? ` · Pasaporte ${f.passport}` : ""}`}</Text>
                <Text style={s.small}>Fecha: ____ / ____ / ________</Text>
              </View>
            </View>
          ))}
        </View>

        <Footer left={`Acuerdo de fundadores · ${c.trade_name}`} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

// ---------- Payment receipt ----------

const GREEN = "#157f45";
const RED = "#b42318";

export type ReceiptPdfInput = {
  number: string;
  venue_name: string;
  owner_name: string | null;
  plan_label: string;
  plaques: number;
  concept: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  paid_on: string;
  period_start: string | null;
  period_end: string | null;
  service_start: string | null;
  next_due: string | null;
  status: "paid" | "void";
  void_reason: string | null;
  issued_at: string;
};

const usd2 = (n: number) => `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayOf = (iso: string) => longDate(iso.slice(0, 10));
const issuedDay = (iso: string) => new Date(Date.parse(iso) - 5 * 3600_000).toISOString().slice(0, 10);

/** A payment receipt (not a tax invoice): one page, the amount and the period up front. */
export async function receiptPdf(r: ReceiptPdfInput, p: { tradeName: string; legalName: string | null; site: string }) {
  const paid = r.status === "paid";
  const rows: [string, string][] = [
    ["Concepto", `${r.concept} · FiveTap`],
    ["Plan contratado", r.plan_label],
    ["Placas NFC", String(r.plaques)],
    ...(r.period_start && r.period_end ? ([["Período pagado", `${dayOf(r.period_start)} al ${dayOf(r.period_end)}`]] as [string, string][]) : []),
    ...(r.service_start ? ([["Inicio del servicio", dayOf(r.service_start)]] as [string, string][]) : []),
    ...(r.next_due ? ([["Próximo vencimiento", dayOf(r.next_due)]] as [string, string][]) : []),
    ["Método de pago", r.method],
    ...(r.reference ? ([["Referencia", r.reference]] as [string, string][]) : []),
    ["Moneda", r.currency],
  ];
  const doc = (
    <Document title={`Comprobante ${r.number} — FiveTap`} author={p.tradeName}>
      <Page size="A4" style={s.page}>
        <Header doc={`Comprobante ${r.number}`} tag={paid ? "PAGADO" : "ANULADO"} />
        <View style={s.heroRow}>
          <View>
            <Text style={s.eyebrow}>Comprobante de pago</Text>
            <Text style={s.title}>{usd2(r.amount)} {r.currency}</Text>
            <Text style={s.subtitle}>{r.venue_name} · {r.plan_label}</Text>
            <View style={s.rule} />
          </View>
          <Text style={[s.pill, { color: paid ? GREEN : RED, borderColor: paid ? GREEN : RED, fontSize: 10, paddingVertical: 4, paddingHorizontal: 12 }]}>{paid ? "PAGADO" : "ANULADO"}</Text>
        </View>

        <View style={s.facts}>
          <View style={[s.fact, s.factFirst]}>
            <Text style={s.eyebrow}>N.º de comprobante</Text>
            <Text style={s.factValue}>{r.number}</Text>
          </View>
          <View style={s.fact}>
            <Text style={s.eyebrow}>Fecha de pago</Text>
            <Text style={s.factValue}>{dayOf(r.paid_on)}</Text>
          </View>
          <View style={s.fact}>
            <Text style={s.eyebrow}>Fecha de emisión</Text>
            <Text style={s.factValue}>{dayOf(issuedDay(r.issued_at))}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.eyebrow}>Proveedor del servicio</Text>
            <Text style={s.partyName}>{p.tradeName}</Text>
            {p.legalName && p.legalName !== p.tradeName ? <KV k="Razón social" v={p.legalName} /> : null}
            <KV k="Web" v={p.site} />
          </View>
          <View style={s.party}>
            <Text style={s.eyebrow}>Cliente</Text>
            <Text style={s.partyName}>{r.venue_name}</Text>
            {r.owner_name ? <KV k="Propietario" v={r.owner_name} /> : null}
          </View>
        </View>

        <Text style={s.label}>Detalle</Text>
        <Rows rows={rows} />
        <View style={[s.table, { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: SOFT }]}>
          <Text style={s.strong}>Total pagado</Text>
          <Text style={[s.strong, { fontSize: 12 }]}>{usd2(r.amount)} {r.currency}</Text>
        </View>

        {!paid && (
          <Text style={[s.small, { color: RED, marginBottom: 8 }]}>Comprobante anulado{r.void_reason ? `: ${r.void_reason}` : ""}. No es válido como constancia de pago.</Text>
        )}
        <Text style={s.small}>
          Este documento es un comprobante de pago emitido por {p.tradeName}. No sustituye una factura fiscal. Gracias por confiar en FiveTap.
        </Text>
        <Footer left={`${p.tradeName} · ${p.site} · Comprobante ${r.number}`} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

// ---------- 3-month contract ----------

/** The 3-month contract: one or two pages, plain clauses and the signatures. */
export async function agreementPdf(a: Agreement, p: Provider) {
  const doc = (
    <Document title={`Contrato ${a.number} — FiveTap`} author={p.trade_name}>
      <Page size="A4" style={s.page}>
        <Header doc={`Contrato ${a.number}`} tag="3 MESES" />
        <View style={s.heroRow}>
          <View>
            <Text style={s.eyebrow}>Contrato de servicio</Text>
            <Text style={s.title}>FiveTap · {a.venue_name}</Text>
            <Text style={s.subtitle}>{a.plan_name} · {AGREEMENT_MONTHS} meses</Text>
            <View style={s.rule} />
          </View>
        </View>

        <View style={s.facts}>
          <View style={[s.fact, s.factFirst]}>
            <Text style={s.eyebrow}>Inicio</Text>
            <Text style={s.factValue}>{longDay(a.start_date)}</Text>
          </View>
          <View style={s.fact}>
            <Text style={s.eyebrow}>Fin</Text>
            <Text style={s.factValue}>{longDay(a.end_date)}</Text>
          </View>
          <View style={s.fact}>
            <Text style={s.eyebrow}>Mensualidad</Text>
            <Text style={s.factValue}>{money2(a.monthly_fee)} USD</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.eyebrow}>Proveedor</Text>
            <Text style={s.partyName}>{p.trade_name}</Text>
            {p.legal_name && p.legal_name !== p.trade_name ? <KV k="Razón social" v={p.legal_name} /> : null}
            {p.legal_address ? <KV k="Dirección" v={p.legal_address} /> : null}
            <KV k={p.founder?.role ?? "Fundador"} v={fullName(p.founder)} />
            {p.representative ? <KV k="Representante" v={`${p.representative.name} (${p.representative.role})`} /> : null}
          </View>
          <View style={s.party}>
            <Text style={s.eyebrow}>Cliente</Text>
            <Text style={s.partyName}>{a.venue_name}</Text>
            {a.venue_address ? <KV k="Dirección" v={a.venue_address} /> : null}
            <KV k={a.signer_role} v={a.signer_name} />
          </View>
        </View>

        <Text style={s.label}>Lo que se entrega</Text>
        <Rows
          rows={[
            ["Plan", a.plan_name],
            ["Placas NFC para mesas", String(a.plaques)],
            ["Tarjetas NFC para meseros", String(a.cards)],
            ["Cordones porta tarjetas", String(a.lanyards)],
            ["FiveTap Business", "Incluido"],
            ["Forma de pago", a.payment_method],
          ]}
        />

        {agreementClauses(a).map((c, i) => (
          <View key={c.title} style={s.clause} wrap={false}>
            <View style={s.clauseHead}>
              <Text style={s.clauseNum}>{i + 1}.</Text>
              <Text style={s.clauseTitle}>{c.title}</Text>
            </View>
            {c.paras.map((t) => <Text key={t} style={s.para}>{t}</Text>)}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 10 }}>
          <Text style={s.section}>Firmas</Text>
          <Text style={s.signIntro}>Las partes leen este contrato, están de acuerdo y lo firman en dos ejemplares, en la ciudad de Panamá, el ____ de ______________ de ________.</Text>
          <View style={s.signs}>
            {p.representative ? <Sign forWho="Por FiveTap" name={p.representative.name} role={p.representative.role} /> : null}
            <Sign forWho={p.representative ? "FiveTap · Fundador" : "Por FiveTap"} name={fullName(p.founder)} role={p.founder?.role ?? "Fundador"} />
            <Sign forWho="Por el cliente" name={a.signer_name} role={`${a.signer_role} · ${a.venue_name}`} />
          </View>
        </View>

        <Footer left={`FiveTap · Contrato ${a.number} · ${a.venue_name}`} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
