import Link from "next/link";
import { GuestCard } from "./GuestCard";
import { AcceptedPayments } from "./PaymentBadges";
import { Logo, LogoMark } from "./Logo";
import { Bell, Chart, Check, Gift, Pin, Reply, Shield, Tap } from "./Icons";
import { COPY } from "@/lib/i18n";
import { salesWhatsAppUrl } from "@/lib/site";
import { VERTICALS, type Vertical } from "@/lib/verticals";

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;

export function Landing({ vertical }: { vertical: Vertical }) {
  const kind = vertical.key === "home" ? "negocio" : vertical.label.toLowerCase();
  const trial = salesWhatsAppUrl(`Hola, quiero la prueba gratis de FiveTap para mi ${kind}.`);
  const askPlaque = salesWhatsAppUrl(`Hola, me interesan las placas FiveTap para mi ${kind}.`);
  const askWaiter = salesWhatsAppUrl(`Hola, me interesan las tarjetas FiveTap para meseros.`);
  const demoName = vertical.key === "home" ? "Tu restaurante" : `Tu ${vertical.label.toLowerCase()}`;

  return (
    <>
      <header className="nav">
        <div className="container nav-in">
          <Link href="/" aria-label="FiveTap — inicio"><Logo /></Link>
          <nav className="nav-links">
            <a href="#como-funciona" className="hide-sm">Cómo funciona</a>
            <a href="#precio" className="hide-sm">Precio</a>
            <a className="btn btn-light btn-sm" href="/prueba">Prueba gratis</a>
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
                Una placa con tu marca {vertical.where}. Un toque con el celular y tu cliente deja su reseña en Google en
                segundos. Si algo salió mal, te escribe a ti, no a Google.
              </p>
              <div className="hero-cta rise" style={i(3)}>
                <a className="btn btn-light" href="/prueba">Prueba gratis 7 días</a>
                <Link className="btn btn-ghost" href={`/demo?n=${encodeURIComponent(demoName)}`}>Ver la demo</Link>
              </div>
              <p className="hero-note muted-d rise" style={i(4)}>Sin contrato · Sin apps · Lo instalamos nosotros</p>
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
                <p>En 30 minutos dejamos placas con tu logo {vertical.where}, conectadas a tu perfil de Google.</p>
              </div>
              <div className="step">
                <span className="step-n">2</span>
                <h3>Tus {vertical.guests} tocan</h3>
                <p>Acercan el celular o escanean el QR. iPhone y Android, sin descargar nada.</p>
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
              <Feature icon={<Tap />} title="Placas NFC + QR con tu marca" text={`Con tu logo, ${vertical.where}. Si algo cambia, no reimprimimos nada.`} />
              <Feature icon={<Bell />} title="Quejas privadas al instante" text="“Hablar con el gerente” te avisa por email mientras el cliente sigue en el local." />
              <Feature icon={<Reply />} title="Respondemos tus reseñas" text="Cada reseña nueva recibe respuesta con el tono de tu marca." />
              <Feature icon={<Chart />} title="Reporte mensual" text="Toques, visitas a Google y reseñas nuevas, explicados en un mensaje." />
              <Feature icon={<Gift />} title="Club de clientes" text="Tus clientes dejan su WhatsApp y su cumpleaños para recibir tus promociones. Ellos vuelven." />
              <Feature icon={<Pin />} title="Perfil de Google revisado" text="Fotos, horarios y categorías para que aparezcas mejor en el mapa." />
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
              <span className="kicker eyebrow-caps">Precio</span>
              <h2>Menos de lo que deja una mesa en una noche.</h2>
            </div>
            <div className="plans">
              <div className="plan">
                <span className="plan-badge">Recomendado</span>
                <span className="offer-tag">Oferta de lanzamiento · −33%</span>
                <h3>Mensual</h3>
                <div className="price-row">
                  <s className="price-was num">$149</s>
                  <span className="price num">$99</span>
                  <span className="price-unit">/ mes</span>
                </div>
                <p className="plan-note">
                  Instalación <b>$150</b> <s>$297</s> · pago único
                </p>
                <p className="plan-install">Instalamos tus placas y <b>FiveTap Business</b>, la app para dueños, gerentes y encargados.</p>
                <ul className="ticks">
                  {[...INCLUDED, "Mes a mes. Cancelas cuando quieras."].map((t) => (
                    <li key={t}><Check />{t}</li>
                  ))}
                </ul>
                <p className="trial-includes"><Check /><span>Prueba gratis 7 días · <b>incluye placa NFC de prueba</b></span></p>
                <a className="btn btn-dark" href="/prueba?plan=mensual">Empezar prueba gratis</a>
              </div>

              <div className="plan plan-dark">
                <span className="plan-badge plan-badge-gold">Más popular</span>
                <span className="offer-tag offer-tag-gold">Mejor precio · −47%</span>
                <h3>Anual</h3>
                <div className="price-row">
                  <s className="price-was num">$1,788</s>
                  <span className="price num">$948</span>
                  <span className="price-unit">/ año</span>
                </div>
                <p className="plan-note">
                  Equivale a <b>$79 al mes</b> · Instalación <b>gratis</b> <s>$150</s>
                </p>
                <p className="plan-install">Placas y <b>FiveTap Business</b> (la app para dueños, gerentes y encargados) instalados sin costo.</p>
                <ul className="ticks">
                  {[...INCLUDED, "Instalación incluida", "Precio congelado 12 meses"].map((t) => (
                    <li key={t}><Check />{t}</li>
                  ))}
                </ul>
                <p className="plan-save">Ahorras $390 el primer año frente al plan mensual.</p>
                <p className="trial-includes"><Check /><span>Prueba gratis 7 días · <b>incluye placa NFC de prueba</b></span></p>
                <a className="btn btn-light" href="/prueba?plan=anual">Empezar prueba gratis</a>
              </div>
            </div>

            <div className="section-head pieces-head">
              <span className="kicker eyebrow-caps">Pocas mesas o pocos meseros</span>
              <h2>Empieza con una placa.</h2>
            </div>
            <div className="pieces">
              <div className="piece">
                <h3>Placa para mesa o mostrador</h3>
                <p className="muted">Con tu logo y QR. Ideal si tus clientes pagan en caja o tienes pocas mesas.</p>
                <div className="price-row">
                  <span className="price price-sm num">$35</span>
                  <span className="price-unit">/ mes por placa</span>
                </div>
                <p className="muted">Con alertas privadas y tu página de resultados.</p>
                <div className="piece-deal">
                  <span className="offer-tag offer-tag-gold">Oferta exclusiva</span>
                  <p><b>2 placas por $60</b> <s>$70</s> · pago único, sin mensualidad</p>
                </div>
                <a className="btn btn-dark" href={askPlaque}>Pedir mis placas</a>
              </div>
              <div className="piece">
                <h3>Tarjeta para meseros</h3>
                <p className="muted">Pequeña, con cordón y el nombre de cada mesero. La presentan al traer la cuenta.</p>
                <div className="price-row">
                  <s className="price-was price-was-sm num">$35</s>
                  <span className="price price-sm num">$25</span>
                  <span className="price-unit">pago único</span>
                </div>
                <p className="muted">Ya configurada y sin mensualidad. Con un plan, ves qué mesero consigue más reseñas.</p>
                <a className="btn btn-ghost" href={askWaiter}>Pedir tarjetas</a>
              </div>
            </div>
            <p className="muted pieces-note">
              Las piezas de pago único llevan directo a tu Google. Las alertas privadas, el club de clientes y tu página de
              resultados vienen con plan. Si luego activas un plan, no cambiamos nada: tus placas siguen sirviendo.
            </p>

            <div className="trial">
              <div className="trial-head">
                <Shield style={{ width: 24, height: 24 }} />
                <h3>Pruébalo 7 días. Sin riesgo.</h3>
              </div>
              <ol className="trial-steps">
                <li><b>Día 1</b> Te dejamos una <b>placa NFC de prueba</b> gratis y anotamos tus estrellas y reseñas actuales en Google. Registras tu tarjeta: hoy no se cobra nada.</li>
                <li><b>Día 7</b> Revisamos contigo cuántos clientes fueron a dejarte su reseña.</li>
                <li><b>Día 8</b> Se cobra tu plan solo e instalamos <b>FiveTap Business</b> (la app para dueños, gerentes y encargados) y el resto de tus placas, <b>personalizadas con tu logo</b>. Si no te convenció, cancelas antes y no pagas nada.</li>
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
              {FAQ.map(([q, a]) => (
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
            <p className="muted-d">Te lo instalamos y lo pruebas 7 días. Si no funciona, no pagas la mensualidad.</p>
            <a className="btn btn-light" href={trial}>Escríbenos por WhatsApp</a>
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

const INCLUDED = [
  "Placas y tarjetas NFC + QR con tu marca (hasta 10)",
  "Alertas privadas de quejas al instante",
  "Tu página privada con resultados y ranking de meseros",
  "Club de clientes con WhatsApp y cumpleaños",
  "Respondemos tus reseñas en menos de 48 h",
  "Reporte de resultados el día 1 de cada mes",
  "Cambio gratis de placas por desgaste",
];

const FAQ: [string, string][] = [
  ["¿Qué pasa después de los 7 días?", "El día 8 se cobra tu plan solo ($99 al mes o $948 al año) e instalamos FiveTap Business (la app para dueños, gerentes y encargados) y el resto de tus placas, personalizadas con tu logo. La instalación cuesta $150 en el plan mensual y es gratis en el anual. Si no te convenció, cancelas antes del día 8 y no pagas nada: solo retiramos la placa de prueba."],
  ["¿Cómo sé que está funcionando?", "El día de la instalación anotamos tus estrellas y el número de reseñas en Google. A los 7 días lo revisamos juntos. Además tienes tu página privada con los números al día y cada mes te enviamos el reporte."],
  ["Tengo pocas mesas, ¿me sirve?", "Sí. Una placa en el mostrador por $35 al mes, o la oferta exclusiva de 2 placas por $60 en un solo pago."],
  ["¿Google permite pedir reseñas?", "Sí. Lo que Google no permite es filtrar solo las buenas o dar descuentos a cambio. Por eso FiveTap le muestra el botón de Google a todos, siempre."],
  ["¿Mis clientes tienen que descargar algo?", "No. Acercan el celular a la placa (iPhone y Android) o escanean el QR. Se abre una página con dos botones."],
  ["¿Qué pasa si un cliente está molesto?", "Toca “Hablar con el gerente” y te escribe en privado. Te llega al instante para resolverlo mientras sigue en el local."],
  ["¿Cómo funciona el club de clientes?", "Tus clientes pueden dejar su WhatsApp y su cumpleaños para recibir tus promociones. Es opcional y con su permiso. Tú ves la lista y la descargas en Excel."],
  ["¿Puedo cancelar?", "Sí, cuando quieras. El plan mensual lo cancelas desde PayPal o con un mensaje, y no se vuelve a cobrar. El anual cubre 12 meses completos. Al cancelar, retiramos las placas."],
  ["¿Y si una placa se daña o se pierde?", "Si se gasta con el uso, la cambiamos gratis. Si se pierde o se rompe, cada placa nueva cuesta $10."],
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

