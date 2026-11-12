import Link from "next/link";
import { GuestCard } from "./GuestCard";
import { AcceptedPayments } from "./PaymentBadges";
import { Logo, LogoMark } from "./Logo";
import { Bell, Chart, Check, Gift, Pin, Reply, Shield, Tap } from "./Icons";
import { COPY } from "@/lib/i18n";
import { salesWhatsAppUrl } from "@/lib/site";
import { activePlans, planPieces } from "@/lib/plans";
import { FOUNDER_PHONE, TEST_PIECES, founderWhatsApp } from "@/lib/test-kit";
import { VERTICALS, type Vertical } from "@/lib/verticals";

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export async function Landing({ vertical }: { vertical: Vertical }) {
  // If the database can't be read (e.g. while building), the page still renders and
  // refreshes within 5 minutes; the plans section then shows a WhatsApp button.
  const plans = await activePlans().catch(() => []);
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  // Which plan fits, from the plans as they are in the panel today.
  const faq: [string, string][] = [
    BASE_FAQ[0]!,
    [
      "¿Qué plan me conviene?",
      `${plans.map((p) => `${p.name}: ${p.plaques} placas para mesas y ${p.cards} tarjetas para meseros por ${fmt(p.monthly)} al mes`).join(". ")}. ¿Necesitas más piezas o tienes varias sucursales? Te lo cotizamos.`,
    ],
    ...BASE_FAQ.slice(1),
  ];
  const kind = vertical.key === "home" ? "negocio" : vertical.label.toLowerCase();
  const talk = salesWhatsAppUrl(`Hola, quiero FiveTap para mi ${kind}.`);
  const demoName = vertical.key === "home" ? "Tu restaurante" : `Tu ${vertical.label.toLowerCase()}`;

  return (
    <>
      <header className="nav">
        <div className="container nav-in">
          <Link href="/" aria-label="FiveTap — inicio"><Logo /></Link>
          <nav className="nav-links">
            <a href="#como-funciona" className="hide-sm">Cómo funciona</a>
            <a href="#precio" className="hide-sm">Precio</a>
            <a className="btn btn-light btn-sm" href="/empezar">Empezar</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero dark">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow-caps muted-d rise" style={i(0)}>Para {vertical.plural} · Panamá</p>
              <h1 className="rise" style={i(1)}>
                Tus clientes felices no dejan reseñas. <span>Ahora sí.</span>
              </h1>
              <p className="hero-sub muted-d rise" style={i(2)}>
                Placas NFC premium {vertical.where}. Un toque con el celular y tu cliente deja su reseña en Google en
                segundos. Y si algo salió mal, también puede escribirte en privado para que lo resuelvas a tiempo.
              </p>
              <div className="hero-cta rise" style={i(3)}>
                <a className="btn btn-light" href="/empezar">Empezar ahora</a>
                <Link className="btn btn-ghost" href={`/demo?n=${encodeURIComponent(demoName)}`}>Ver la demo</Link>
              </div>
              <p className="hero-note muted-d rise" style={i(4)}>Sin permanencia · Sin descargar nada · Lo instalamos nosotros</p>
            </div>

            <div className="rise" style={i(2)}>
              <div className="phone" role="img" aria-label="Lo que ve tu cliente al tocar la placa">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <GuestCard
                    embedded
                    business={{ name: demoName, logo_url: null, brand_color: "#0a0a0a" }}
                    copy={COPY.es}
                    reviewHref="#"
                    managerHref="#"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">El problema</span>
              <h2>El cliente feliz se va en silencio. El molesto escribe.</h2>
              <p>Por eso un buen lugar termina con menos estrellas de las que merece, y pierde a quien busca “cerca de mí”.</p>
            </div>
            <div className="chain">
              <div className="chain-step"><span className="n">01</span><h3>Pocas reseñas</h3><p>Y las que hay son de clientes molestos.</p></div>
              <div className="chain-step on"><span className="n">02</span><h3><LogoMark size={18} /> FiveTap</h3><p>Un toque {vertical.where}. Reseña lista en segundos.</p></div>
              <div className="chain-step"><span className="n">03</span><h3>Más reseñas</h3><p>Tus clientes felices por fin lo dicen en Google.</p></div>
              <div className="chain-step"><span className="n">04</span><h3>Más confianza</h3><p>Más estrellas y reseñas recientes en Google Maps.</p></div>
              <div className="chain-step"><span className="n">05</span><h3>Más clientes</h3><p>Quien compara en el mapa, te elige a ti.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="como-funciona" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Cómo funciona</span>
              <h2>Listo en una visita. Funciona desde el primer día.</h2>
            </div>
            <div className="steps">
              <div className="step">
                <span className="step-n">1</span>
                <h3>Lo instalamos</h3>
                <p>En 30 minutos dejamos placas NFC premium {vertical.where}, programadas con tu perfil de Google.</p>
              </div>
              <div className="step">
                <span className="step-n">2</span>
                <h3>Tus {vertical.guests} tocan</h3>
                <p>Acercan el celular a la placa y listo. iPhone y Android, sin descargar nada.</p>
              </div>
              <div className="step">
                <span className="step-n">3</span>
                <h3>Tu reputación crece</h3>
                <p>Reseñas nuevas cada semana. Las quejas te llegan en privado, a tiempo para arreglarlas.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Qué incluye</span>
              <h2>Lo necesario para que te elijan en Google. Nada más.</h2>
            </div>
            <div className="features">
              <Feature icon={<Tap />} title="Placas NFC premium" text={`Diseño elegante ${vertical.where}, programadas para tu local. Si algo cambia, las reprogramamos al instante.`} />
              <Feature icon={<Pin />} title="Edición con tu marca" text="¿Las quieres con tu logo y tus colores? Las fabricamos a medida para tu local y cambiamos las que tienes." />
              <Feature icon={<Bell />} title="Quejas privadas al instante" text="“Hablar con el gerente” te avisa por email mientras el cliente sigue en el local." />
              <Feature icon={<Reply />} title="Avisos en tu celular" text="FiveTap Business te avisa cada queja al instante, te resume el día cada mañana y te envía tu reporte del mes." />
              <Feature icon={<Chart />} title="Reporte mensual" text="Toques, visitas a Google y reseñas nuevas, explicados en un mensaje." />
              <Feature icon={<Gift />} title="Club de clientes" text="Tus clientes dejan su WhatsApp y su cumpleaños para recibir tus promociones. Ellos vuelven." />
              <Feature icon={<Shield />} title="Dentro de las reglas de Google" text="Todos tus clientes ven el botón de reseña. Sin trucos que arriesguen tu perfil." />
            </div>
          </div>
        </section>

        <section className="section dark">
          <div className="container">
            <p className="quote">
              “Una estrella más en las reseñas se asocia con entre un 5% y un 9% más de ingresos para un restaurante.”
              <small className="muted-d">Michael Luca, Harvard Business School (2011)</small>
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Para quién</span>
              <h2>Lugares a los que la gente va.</h2>
            </div>
            <div className="chips">
              {VERTICALS.map((v) => (
                <Link key={v.key} href={`/para/${v.slug}`} className={`chip${v.key === vertical.key ? " on" : ""}`}>
                  {v.plural[0]!.toUpperCase() + v.plural.slice(1)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="precio" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Planes</span>
              <h2>Tres planes. Todos mensuales.</h2>
              <p className="muted">Precios de lanzamiento. Cada plan incluye placas NFC para mesas, tarjetas NFC para meseros con su cordón y FiveTap Business.</p>
            </div>
            <div className="test-kit">
              <div className="test-kit-head">
                <h3>FiveTap Test</h3>
                <p className="muted">Para empezar con una sola pieza. Pago mensual.</p>
              </div>
              <div className="test-kit-items">
                {TEST_PIECES.map((t) => (
                  <a key={t.key} className="test-piece" href={founderWhatsApp(`Hola, quiero FiveTap Test: ${t.name} ($${t.monthly} al mes) para mi ${kind}.`)}>
                    <span><b>{t.name}</b><small>{t.detail}</small></span>
                    <span className="num">{usd(t.monthly)}<small> / mes</small></span>
                  </a>
                ))}
              </div>
              <p className="muted test-kit-note">
                ¿Necesitas más de 4 piezas o una cantidad específica? Cotiza con el Founder de FiveTap:{" "}
                <a href={founderWhatsApp(`Hola, quiero cotizar FiveTap para mi ${kind}. Necesito ___ piezas.`)} style={{ textDecoration: "underline" }}><b>{FOUNDER_PHONE}</b></a>
              </p>
            </div>

            <div className="plans plans-3">
              {plans.map((p, n) => (
                <div key={p.key} className={`plan${n === 1 ? " plan-dark" : ""}`}>
                  {p.badge && <span className={`plan-badge plan-badge-${p.badge_color}`}>{p.badge}</span>}
                  <h3>{p.name}</h3>
                  <div className="price-row">
                    <span className="price num">{usd(p.monthly)}</span>
                    <span className="price-unit">/ mes</span>
                  </div>
                  <ul className="ticks">
                    {[...planPieces(p), ...p.features].map((t) => (
                      <li key={t}><Check />{t}</li>
                    ))}
                  </ul>
                  <a className={`btn ${n === 1 ? "btn-light" : "btn-dark"}`} href={`/empezar?plan=${p.key}#pagar`}>Elegir {p.name.replace(/^FiveTap\s+/, "")}</a>
                </div>
              ))}
            </div>
            {plans.length === 0 && <a className="btn btn-dark" href={talk}>Pide tu plan por WhatsApp</a>}
            <p className="muted pieces-note">
              Empiezas con un contrato de 3 meses para comprobar los resultados; luego sigues mes a mes, sin permanencia anual. Las placas y tarjetas son de FiveTap y funcionan mientras tu plan esté activo. ¿Necesitas más piezas o algo especial? <a href={talk} style={{ textDecoration: "underline" }}>Te lo cotizamos</a>.
            </p>

            <div className="trial">
              <div className="trial-head">
                <Shield style={{ width: 24, height: 24 }} />
                <h3>Listo en una visita. Funciona desde el primer día.</h3>
              </div>
              <ol className="trial-steps">
                <li><b>Día 1</b> Dejamos tus placas NFC, las tarjetas de tus meseros y FiveTap Business en tu celular, y anotamos tus estrellas y reseñas actuales en Google.</li>
                <li><b>Cada día</b> Ves en tu app, en tiempo real, cuántos clientes tocan tus placas y van a dejarte su reseña. Cada queja te llega al instante.</li>
                <li><b>Cada mes</b> Te llega tu reporte: toques, visitas a Google, mejores mesas y meseros, y tus reseñas antes y después de FiveTap.</li>
              </ol>
              <div>
                <p className="muted">Pagas con tarjeta, PayPal, Yappy o transferencia.</p>
                <AcceptedPayments />
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Preguntas</span>
              <h2>Lo que preguntan los dueños.</h2>
            </div>
            <div className="faq">
              {faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-band dark">
          <div className="container">
            <LogoMark size={44} />
            <h2>Empieza a recibir reseñas esta semana.</h2>
            <p className="muted-d">Te lo instalamos en una visita, sin costo de instalación. Desde ese día lo ves funcionar en tu celular.</p>
            <a className="btn btn-light" href={talk}>Escríbenos por WhatsApp</a>
          </div>
        </section>
      </main>

      <footer className="footer dark">
        <div className="container footer-in">
          <Logo size={18} />
          <span className="eyebrow-caps">Más reseñas. Más clientes.</span>
          <span className="footer-links">
            <Link href="/pagar">Pagos</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
          </span>
        </div>
      </footer>
    </>
  );
}

const BASE_FAQ: [string, string][] = [
  ["¿Cómo sé que está funcionando?", "El día de la instalación anotamos tus estrellas y el número de reseñas en Google. Desde ese día, en tu app FiveTap Business ves en tiempo real los toques y las visitas a tu página de reseñas, y cada mes te llega tu reporte."],
  ["¿Google permite pedir reseñas?", "Sí. Lo que Google no permite es filtrar solo las buenas o dar descuentos a cambio. Por eso FiveTap le muestra el botón de Google a todos, siempre."],
  ["¿Mis clientes tienen que descargar algo?", "No. Acercan el celular a la placa (iPhone y Android) y se abre una página con dos botones."],
  ["¿Puedo tener las placas con mi logo?", "Sí. Con tu plan activo, fabricamos tus placas a medida con tu logo y tus colores, y cambiamos las de tu local. Se cotiza según el diseño y la cantidad."],
  ["¿Qué pasa si un cliente está molesto?", "Toca “Hablar con el gerente” y te escribe en privado. Te llega al instante para resolverlo mientras sigue en el local."],
  ["¿Cómo funciona el club de clientes?", "Tus clientes pueden dejar su WhatsApp y su cumpleaños para recibir tus promociones. Es opcional y con su permiso. Tú ves la lista y la descargas en Excel."],
  ["¿Tengo que firmar por un año?", "No. Empiezas con un contrato corto de 3 meses para que compruebes los resultados. Después decides: seguir mes a mes, renovar o terminar. Las placas y tarjetas son de FiveTap: al terminar, se desactivan y las retiramos."],
  ["¿Y si una placa se daña o se pierde?", "Si se gasta con el uso, la cambiamos gratis. Si se pierde o se rompe, cada placa nueva cuesta $10."],
  ["¿Qué pasa si me atraso con un pago?", "Te avisamos antes de la fecha y tienes 5 días de gracia. Si el pago no llega, tus placas se pausan hasta que te pongas al día. No se borra nada: al pagar, todo vuelve a funcionar el mismo día."],
];

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature">
      {icon}
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

