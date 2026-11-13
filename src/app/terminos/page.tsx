import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { REPLACEMENT_FEE, money } from "@/lib/contract";
import { activePlans, planPieces } from "@/lib/plans";
import { FOUNDER_PHONE, TEST_MAX_PIECES, TEST_OFFER } from "@/lib/test-kit";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Términos del servicio — FiveTap" };

export const revalidate = 300;

export default async function Terms() {
  const plans = await activePlans().catch(() => []);
  return (
    <LegalPage title="Términos del servicio" updated="12 de noviembre de 2026">
      <p>Estos términos explican cómo funciona FiveTap para los negocios que lo contratan. Si firmaste un contrato con nosotros, el contrato manda sobre esta página.</p>

      <h2>1. Qué es FiveTap</h2>
      <p>FiveTap instala placas y tarjetas NFC en tu local. Tus clientes las tocan con el celular y pueden dejar una reseña en Google, escribirle en privado al gerente o unirse a tu club de clientes. Incluye FiveTap Business, la app del local con tus resultados en tiempo real, avisos al celular y un reporte mensual.</p>

      <h2>2. Planes y precios</h2>
      <ul>
        {plans.map((p) => (
          <li key={p.key}>
            <b>{p.name}:</b> {money(p.monthly)} al mes, con {planPieces(p).join(" y ")}, y FiveTap Business.
          </li>
        ))}
        <li><b>{TEST_OFFER.name}:</b> de 1 a {TEST_MAX_PIECES} piezas con FiveTap Business, válido por 30 días: {money(TEST_OFFER.plaque)} cada placa de reseñas y {money(TEST_OFFER.card)} cada tarjeta de mesero con cordón. Se cancela solo al terminar el día 29 y el local elige un plan para seguir. Si el local contrata un plan al terminar, lo pagado por el Test se descuenta de su primer mes.</li>
        <li><b>Una cantidad específica de placas o tarjetas, sucursales o necesidades especiales:</b> se cotizan por separado y por escrito con el Founder de FiveTap ({FOUNDER_PHONE}).</li>
      </ul>
      <p>Todos los planes son mensuales. Los precios publicados son precios de lanzamiento; si cambian, el precio de un cliente activo se mantiene.</p>
      <p>Todo FiveTap es un servicio por suscripción: las placas y tarjetas son propiedad de FiveTap y funcionan mientras el plan esté activo. Cada plan incluye solo lo descrito; cualquier ampliación se cotiza aparte.</p>
      <p>Los planes se cobran de forma automática por PayPal, o por Yappy o transferencia si así lo acordamos.</p>

      <h2>3. Instalación</h2>
      <p>Configuramos las placas, las tarjetas de meseros y FiveTap Business, y lo dejamos funcionando. Lo que incluye cada plan (configuración, instalación en el local, capacitación) es lo que se describe en el plan.</p>

      <h2>4. Cancelación</h2>
      <p>El servicio empieza con un contrato de 3 meses, que es el período mínimo. Si el local lo termina antes sin una causa atribuible a FiveTap, paga las mensualidades que falten para completar los 3 meses. Al terminar ese período, el servicio sigue mes a mes y cualquiera de las partes puede terminarlo avisando con 15 días de anticipación. No hay renovaciones anuales automáticas. Al terminar, el local devuelve las placas y tarjetas, que son de FiveTap, dentro de los 10 días siguientes. Si firmaste un contrato, sus condiciones son las que aplican.</p>

      <h2>5. Cambio y reposición de placas</h2>
      <p>Cambiamos gratis las piezas gastadas por el uso. Si una se pierde o se rompe, reponerla cuesta {money(REPLACEMENT_FEE)}. Si el servicio falla por nuestra causa más de 72 horas seguidas, ese mes no se cobra.</p>

      <h2>6. Pagos atrasados</h2>
      <p>Te avisamos 3 días antes de cada vencimiento y el mismo día. Después del vencimiento tienes 5 días de gracia. Si el pago no se registra, al sexto día las placas y FiveTap Business se pausan hasta que te pongas al día. No se borra ningún dato, y al registrar el pago todo vuelve a funcionar el mismo día.</p>

      <h2>7. Precio congelado</h2>
      <p>Tu precio no sube mientras tu plan siga activo sin interrupción.</p>

      <h2>8. Reglas de Google</h2>
      <p>FiveTap muestra el botón de reseña a todos tus clientes. Te comprometes a no ofrecer descuentos ni premios a cambio de reseñas y a no filtrar quién puede dejarlas. No controlamos lo que Google publica, oculta o elimina.</p>

      <h2>9. Lo que no garantizamos</h2>
      <p>Hacemos fácil que tus clientes dejen reseñas, pero no podemos garantizar un número exacto de reseñas ni de estrellas: eso depende de tus clientes y de Google.</p>

      <h2>10. Datos</h2>
      <p>Los datos de tu club de clientes son tuyos. Lee nuestra <a href="/privacidad">política de privacidad</a>.</p>

      <h2>11. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Panamá.</p>

      <h2>Contacto</h2>
      <p><a href={salesWhatsAppUrl("Hola, tengo una consulta sobre los términos de FiveTap.")}>Escríbenos por WhatsApp</a>.</p>
    </LegalPage>
  );
}
