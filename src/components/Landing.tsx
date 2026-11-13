import Link from "next/link";
import { GuestCard } from "./GuestCard";
import { AcceptedPayments } from "./PaymentBadges";
import { Logo, LogoMark } from "./Logo";
import { Bell, Chart, Chat, Check, Gift, Pin, Shield, Tap, Users } from "./Icons";
import { COPY } from "@/lib/i18n";
import { salesWhatsAppUrl } from "@/lib/site";
import { activePlans, planPieces } from "@/lib/plans";
import { FOUNDER_PHONE, TEST_MAX_PIECES, TEST_OFFER, founderWhatsApp } from "@/lib/test-kit";
import type { Vertical } from "@/lib/verticals";

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * The public website. FiveTap is presented as a reputation and customer platform for any
 * business: the NFC pieces are the way in, the platform is the product. Only what exists
 * today is promised. Prices and plans come from the panel.
 */
export async function Landing({ vertical }: { vertical: Vertical }) {
  // If the database can't be read (e.g. while building), the page still renders and
  // refreshes within 5 minutes; the plans section then shows a WhatsApp button.
  const plans = await activePlans().catch(() => []);
  const faq: [string, string][] = [
    BASE_FAQ[0]!,
    [
      "¿Qué plan me conviene?",
      `${plans.map((p) => `${p.name}: ${planPieces(p).join(" y ")}, por ${usd(p.monthly)} al mes`).join(". ")}. ¿Necesitas una configuración específica o tienes varias sucursales? El Founder de FiveTap la diseña contigo: ${FOUNDER_PHONE}.`,
    ],
    ...BASE_FAQ.slice(1),
  ];
  // Campaign pages (/para/…) keep their own words in the WhatsApp messages; the home page is universal.
  const kind = vertical.key === "home" ? "negocio" : vertical.label.toLowerCase();
  const talk = salesWhatsAppUrl(`Hola, quiero agendar la instalación de FiveTap en mi ${kind}.`);

  return (
    <>
      <header className="nav">
        <div className="container nav-in">
          <Link href="/" aria-label="FiveTap — inicio"><Logo /></Link>
          <nav className="nav-links">
            <a href="#plataforma" className="hide-sm">Plataforma</a>
            <a href="#como-funciona" className="hide-sm">Cómo funciona</a>
            <a href="#precio" className="hide-sm">Planes</a>
            <a className="btn btn-light btn-sm" href="/empezar">Empezar</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero dark">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow-caps muted-d rise" style={i(0)}>Plataforma de reputación y clientes · Panamá</p>
              <h1 className="rise" style={i(1)}>
                Cada cliente que pasa por tu negocio, <span>convertido en reputación.</span>
              </h1>
              <p className="hero-sub muted-d rise" style={i(2)}>
                FiveTap une puntos de contacto NFC, una app para tu equipo y reportes medidos en una sola plataforma.
                Más reseñas auténticas en Google, clientes que vuelven y control de todo lo que se dice de ti.
              </p>
              <div className="hero-cta rise" style={i(3)}>
                <a className="btn btn-light" href="/empezar">Activar FiveTap en mi negocio</a>
                <Link className="btn btn-ghost" href="/demo?n=Tu%20negocio">Ver cómo lo vive tu cliente</Link>
              </div>
              <p className="hero-note muted-d rise" style={i(4)}>Instalación incluida · Sin descargar nada · Resultados medidos desde el día 1</p>
            </div>

            <div className="rise" style={i(2)}>
              <div className="phone" role="img" aria-label="Lo que ve tu cliente al acercar su celular">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <GuestCard
                    embedded
                    business={{ name: "Tu negocio", logo_url: null, brand_color: "#0a0a0a" }}
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
              <h2>Tus mejores clientes se van en silencio.</h2>
              <p>La mayoría de quienes quedan contentos nunca lo dicen en Google; quien tuvo un mal momento, sí. FiveTap equilibra esa balanza: hablar bien de ti toma un segundo, y una queja te llega primero a ti, no a internet.</p>
            </div>
            <div className="chain">
              <div className="chain-step"><span className="n">01</span><h3>Pocas reseñas</h3><p>Y las que se ven no cuentan toda la historia.</p></div>
              <div className="chain-step on"><span className="n">02</span><h3><LogoMark size={18} /> FiveTap</h3><p>Un toque en tu negocio. Reseña lista en segundos.</p></div>
              <div className="chain-step"><span className="n">03</span><h3>Más reseñas</h3><p>Tus clientes satisfechos por fin lo dicen en Google.</p></div>
              <div className="chain-step"><span className="n">04</span><h3>Más confianza</h3><p>Más estrellas y reseñas recientes frente a quien te busca.</p></div>
              <div className="chain-step"><span className="n">05</span><h3>Más oportunidades</h3><p>Quien compara, te elige a ti.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="plataforma" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">La plataforma</span>
              <h2>Las placas son la entrada. La plataforma es el producto.</h2>
              <p>Tres partes que trabajan como un solo sistema, sobre una misma base: medición desde el día 1, dentro de las reglas de Google.</p>
            </div>
            <div className="system">
              <div className="system-col">
                <span className="system-n">1 · Puntos de contacto</span>
                <h3>Placas y tarjetas FiveTap</h3>
                <ul className="ticks">
                  <li><Check />Un toque, sin descargar nada</li>
                  <li><Check />Reseña en Google, mensaje privado o club</li>
                  <li><Check />Cada pieza medida por separado</li>
                </ul>
              </div>
              <div className="system-col">
                <span className="system-n">2 · Tu equipo</span>
                <h3>FiveTap Business</h3>
                <ul className="ticks">
                  <li><Check />Reputación medida, antes y después</li>
                  <li><Check />Mensajes privados al instante</li>
                  <li><Check />Rendimiento del equipo y club</li>
                </ul>
              </div>
              <div className="system-col">
                <span className="system-n">3 · Resultados</span>
                <h3>Reportes y servicio</h3>
                <ul className="ticks">
                  <li><Check />Resumen cada mañana</li>
                  <li><Check />Reporte cada mes</li>
                  <li><Check />Instalación en persona y revisión a los 3 meses</li>
                </ul>
              </div>
              <div className="system-app" role="img" aria-label="Ejemplo de FiveTap Business">
                <span className="system-app-tag">Ejemplo · FiveTap Business</span>
                <small>Reseñas en Google</small>
                <b className="num">84 <em>→</em> 126</b>
                <span className="system-app-up">+42 desde que tienes FiveTap · ★ 4.3 → 4.6</span>
                <div className="system-app-row">
                  <span><b className="num">318</b>Toques</span>
                  <span><b className="num">57</b>A Google</span>
                  <span><b className="num">4</b>Mensajes resueltos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="como-funciona" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Cómo funciona</span>
              <h2>Un sistema completo, listo en una visita.</h2>
            </div>
            <div className="steps steps-4">
              <div className="step">
                <span className="step-n">1</span>
                <h3>Diseñamos tu sistema</h3>
                <p>Definimos con tu equipo dónde van los puntos de contacto y anotamos tu reputación actual en Google. Ese es tu punto de partida.</p>
              </div>
              <div className="step">
                <span className="step-n">2</span>
                <h3>Lo instalamos y activamos</h3>
                <p>Placas y tarjetas programadas con tu negocio, y FiveTap Business en el celular del dueño y del gerente, cada uno con su acceso privado.</p>
              </div>
              <div className="step">
                <span className="step-n">3</span>
                <h3>Tus clientes interactúan</h3>
                <p>Con un toque, sin descargar nada, dejan su reseña en Google, te escriben en privado o se unen a tu club.</p>
              </div>
              <div className="step">
                <span className="step-n">4</span>
                <h3>Tú ves los resultados</h3>
                <p>Reseñas, mensajes, rendimiento del equipo y crecimiento frente al día 1, en tiempo real y en tu reporte mensual.</p>
              </div>
            </div>
            <p className="muted steps-note">A los 3 meses revisamos juntos tus números: cuántas reseñas sumaste desde que tienes FiveTap.</p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Puntos de contacto</span>
              <h2>El puente entre tu negocio y tu reputación en línea.</h2>
              <p>Cada placa y cada tarjeta FiveTap es un punto de contacto inteligente. Con un toque del celular, en iPhone o Android, tu cliente llega a tu página FiveTap: deja su reseña en Google, te escribe en privado o se une a tu club. Cada pieza tiene su propia identidad en la plataforma, así sabes qué punto y qué persona de tu equipo generan más resultados.</p>
            </div>
            <div className="features">
              <Feature icon={<Tap />} title="Placas FiveTap" text="Para el mostrador, la recepción, la caja o donde tu cliente se detiene." />
              <Feature icon={<Users />} title="Tarjetas de equipo" text="Con cordón, para quien atiende. Cada persona suma sus propios resultados." />
              <Feature icon={<Chart />} title="Medidas una por una" text="Cada toque cuenta, por pieza y por persona, desde el primer día." />
              <Feature icon={<Pin />} title="Con tu marca, si lo quieres" text="Las fabricamos con tu logo y tus colores. Se cotiza aparte. Si algo cambia, las actualizamos desde la plataforma, sin cambiar la pieza." />
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">FiveTap Business</span>
              <h2>Tu negocio, medido en tiempo real.</h2>
              <p>La app privada del dueño y del gerente. Se instala en el celular en 30 segundos y reúne en una sola pantalla todo lo que pasa con tus clientes.</p>
            </div>
            <div className="features">
              <Feature icon={<Chart />} title="Reputación medida" text="Tus reseñas y estrellas en Google antes y después de FiveTap, siempre a la vista." />
              <Feature icon={<Bell />} title="Mensajes privados" text="Cada mensaje te llega al instante. Lo respondes por WhatsApp y lo marcas como resuelto." />
              <Feature icon={<Users />} title="Rendimiento del equipo" text="Un ranking de quién lleva más clientes a Google, por tarjeta y por persona." />
              <Feature icon={<Gift />} title="Club de clientes" text="Tus clientes dejan su WhatsApp y su cumpleaños con su permiso. Escribes una promoción y la envías a cada uno con un toque." />
              <Feature icon={<Chat />} title="Avisos y reportes" text="Resumen cada mañana, reporte cada mes y aviso inmediato de cada mensaje." />
              <Feature icon={<Shield />} title="Acceso privado por roles" text="Dueño y gerente con códigos distintos; el gerente no ve pagos. Si alguien deja tu negocio, su acceso se cambia en un toque." />
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Por qué FiveTap</span>
              <h2>Por qué FiveTap y no una placa cualquiera.</h2>
            </div>
            <div className="compare" role="table" aria-label="FiveTap frente a una placa NFC genérica">
              <div className="compare-row compare-head" role="row">
                <span role="columnheader" />
                <span role="columnheader">Placa genérica</span>
                <span role="columnheader"><LogoMark size={16} /> FiveTap</span>
              </div>
              {COMPARE.map(([what, generic, ours]) => (
                <div className="compare-row" role="row" key={what}>
                  <b role="rowheader">{what}</b>
                  <span role="cell" className="muted">{generic}</span>
                  <span role="cell">{ours}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section dark">
          <div className="container">
            <p className="quote">
              “Una estrella más en las reseñas se asocia con entre un 5% y un 9% más de ingresos.”
              <small className="muted-d">Michael Luca, Harvard Business School (2011) · Estudio sobre restaurantes en Yelp</small>
            </p>
          </div>
        </section>

        <section className="section" id="precio">
          <div className="container">
            <div className="section-head">
              <span className="kicker eyebrow-caps">Planes</span>
              <h2>Elige tu plan. Lo instalamos esta semana.</h2>
              <p className="muted">Planes mensuales con placas FiveTap, tarjetas de equipo con cordón, FiveTap Business e instalación incluida. Precios de lanzamiento.</p>
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
            <div className="offer-row">
              <a className="offer-card" href={founderWhatsApp(`Hola, quiero ${TEST_OFFER.name} de 30 días para mi ${kind}: ___ placas y ___ tarjetas de equipo.`)}>
                <span className="offer-kicker">¿Quieres probar primero?</span>
                <h3>{TEST_OFFER.name} · <span className="num">desde {usd(TEST_OFFER.price)}</span></h3>
                <p>De 1 a {TEST_MAX_PIECES} piezas con FiveTap Business, por 30 días: cada placa FiveTap {usd(TEST_OFFER.plaque)} y cada tarjeta de equipo {usd(TEST_OFFER.card)}. Si luego eliges un plan, lo que pagaste se descuenta de tu primer mes.</p>
                <span className="offer-link">Solicitar mi Test de 30 días →</span>
              </a>
              <a className="offer-card" id="cotizar" href={founderWhatsApp(`Hola, quiero diseñar un plan de FiveTap para mi ${kind}. Necesito ___ placas y ___ tarjetas de equipo.`)}>
                <span className="offer-kicker">¿Necesitas una configuración específica?</span>
                <h3>Diseña tu plan con el Founder</h3>
                <p>Varias sucursales, más puntos de contacto o un equipo grande: el Founder de FiveTap diseña contigo el plan exacto para tu negocio.</p>
                <span className="offer-link">Diseñar mi plan · WhatsApp {FOUNDER_PHONE} →</span>
              </a>
            </div>

            <p className="muted pieces-note">
              Empiezas con un contrato de 3 meses para comprobar los resultados; luego sigues mes a mes, sin permanencia anual. Las placas y tarjetas son de FiveTap y funcionan mientras tu plan esté activo.
            </p>

            <div className="trial">
              <div className="trial-head">
                <Shield style={{ width: 24, height: 24 }} />
                <h3>Listo en una visita. Medido desde el primer día.</h3>
              </div>
              <ol className="trial-steps">
                <li><b>Día 1</b> Instalamos tus placas, las tarjetas de tu equipo y FiveTap Business, y anotamos por escrito tus estrellas y reseñas actuales en Google.</li>
                <li><b>Cada día</b> Ves en tu app, en tiempo real, cuántos clientes interactúan y van a dejarte su reseña. Cada mensaje te llega al instante.</li>
                <li><b>Mes 3</b> Revisamos juntos tus reseñas antes y después de FiveTap, y decides si sigues. Cada mes te llega además tu reporte.</li>
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
            <h2>Tu reputación empieza a crecer esta semana.</h2>
            <p className="muted-d">Instalamos FiveTap en una visita, sin costo de instalación, y desde ese día lo ves funcionar en tu celular, con tus reseñas medidas.</p>
            <a className="btn btn-light" href={talk}>Agenda tu instalación por WhatsApp</a>
          </div>
        </section>
      </main>

      <footer className="footer dark">
        <div className="container footer-in">
          <Logo size={18} />
          <span className="eyebrow-caps">Reputación que se construye cada día. Resultados que se miden.</span>
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

const COMPARE: [string, string, string][] = [
  ["Qué recibes", "Un objeto con un enlace", "Una plataforma con puntos de contacto, app y reportes"],
  ["Resultados", "No se miden", "Antes y después de reseñas, por punto y por persona"],
  ["Clientes molestos", "Van directo a Google", "Te escriben primero, en privado"],
  ["Si algo cambia", "Hay que reprogramar o cambiar la placa", "Se actualiza desde la plataforma"],
  ["Instalación", "Por tu cuenta", "Instalada y configurada en persona"],
  ["Reglas de Google", "Depende de cómo la uses", "Botón de reseña para todos, sin filtros ni premios"],
];

const BASE_FAQ: [string, string][] = [
  ["¿Cómo sé que está funcionando?", "El día de la instalación anotamos tus estrellas y el número de reseñas en Google. Desde ese día, en FiveTap Business ves en tiempo real los toques, las visitas a tu página de reseñas y cuántas reseñas nuevas sumaste. A los 3 meses revisamos los números juntos."],
  ["¿Sirve para mi tipo de negocio?", "Sí, si atiendes clientes en persona. FiveTap funciona igual en un mostrador, una recepción, una caja o una mesa: lo que cambia es dónde colocamos cada punto de contacto, y eso lo definimos contigo."],
  ["¿Google permite pedir reseñas?", "Sí. Lo que Google no permite es filtrar solo las buenas o dar descuentos a cambio. Por eso FiveTap le muestra el botón de Google a todos, siempre."],
  ["¿Mis clientes tienen que descargar algo?", "No. Acercan el celular a la placa o a la tarjeta (iPhone y Android) y se abre tu página con tres opciones: dejar reseña en Google, escribirte en privado o recibir tus promociones."],
  ["¿Quién puede entrar a FiveTap Business?", "Solo quien tú autorices. El dueño y el gerente tienen cada uno su código privado; aunque alguien reenvíe el enlace, sin el código no entra. El gerente no ve pagos ni la suscripción."],
  ["¿Puedo tener las placas con mi logo?", "Sí. Con tu plan activo, fabricamos tus placas a medida con tu logo y tus colores, y cambiamos las de tu negocio. Se cotiza según el diseño y la cantidad."],
  ["¿Qué pasa si un cliente está molesto?", "Elige escribirte en privado y el mensaje te llega al instante, para que lo resuelvas mientras todavía está contigo."],
  ["¿Cómo funciona el club de clientes?", "Tus clientes pueden dejar su WhatsApp y su cumpleaños para recibir tus promociones. Es opcional y con su permiso. Tú escribes la promoción y la envías a cada uno desde tu celular, o descargas la lista en Excel."],
  ["¿Tengo que firmar por un año?", "No. Empiezas con un contrato corto de 3 meses para que compruebes los resultados. Después decides: seguir mes a mes, renovar o terminar. Las placas y tarjetas son de FiveTap: al terminar, se desactivan y las retiramos."],
  ["¿Y si una placa se daña o se pierde?", "Si se gasta con el uso, la cambiamos gratis. Si se pierde o se rompe, cada pieza nueva cuesta $10."],
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
