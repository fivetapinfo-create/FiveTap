import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { REPLACEMENT_FEE, WAITER_CARD_PRICE, PLANS, money } from "@/lib/contract";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Términos del servicio — FiveTap" };

export default function Terms() {
  return (
    <LegalPage title="Términos del servicio" updated="10 de noviembre de 2026">
      <p>Estos términos explican cómo funciona FiveTap para los negocios que lo contratan. Si firmaste un contrato con nosotros, el contrato manda sobre esta página.</p>

      <h2>1. Qué es FiveTap</h2>
      <p>FiveTap instala placas y tarjetas NFC en tu local. Tus clientes las tocan con el celular y pueden dejar una reseña en Google, escribirle en privado al gerente o unirse a tu club de clientes. Incluye FiveTap Business, la app del local con tus resultados en tiempo real, avisos al celular y un reporte mensual.</p>

      <h2>2. Planes y precios</h2>
      <ul>
        <li><b>{PLANS.monthly.name}:</b> {money(PLANS.monthly.price)} al mes con 10 placas, instalación y FiveTap Business incluidos.</li>
        <li><b>{PLANS.annual.name}:</b> {money(PLANS.annual.price)} al año, con placas personalizadas con la marca de tu local (cantidad según cotización) y 2 tarjetas para meseros. Se paga en un solo pago o en dos partes: la mitad en línea y la mitad en efectivo el día de la instalación.</li>
        <li><b>1 placa:</b> {money(PLANS.plaque.price)} al mes, con FiveTap Business.</li>
        <li><b>Pago único:</b> 2 placas por $60, 3 por $85, 4 por $100 y 6 por $132; tarjetas para meseros desde {money(WAITER_CARD_PRICE)}. Estas piezas llevan directo a tu página de reseñas de Google, sin las funciones del plan.</li>
      </ul>
      <p>Los planes se cobran de forma automática por PayPal, o por Yappy o transferencia si así lo acordamos.</p>

      <h2>3. Instalación</h2>
      <p>La instalación de las placas y de FiveTap Business está incluida en los planes. La hacemos en una sola visita y dejamos todo funcionando.</p>

      <h2>4. Cancelación</h2>
      <p>El Plan Mensual y el Plan Placa no tienen permanencia: los cancelas cuando quieras, desde PayPal o avisándonos, y no se vuelve a cobrar. El servicio sigue hasta el final del período ya pagado. El Plan Anual cubre 12 meses y, pasada la prueba, no se reembolsa. Al cancelar un plan, retiramos las placas incluidas en él.</p>

      <h2>5. Cambio y reposición de placas</h2>
      <p>Cambiamos gratis las piezas gastadas por el uso. Si una se pierde o se rompe, reponerla cuesta {money(REPLACEMENT_FEE)}. Si el servicio falla por nuestra causa más de 72 horas seguidas, ese mes no se cobra.</p>

      <h2>6. Precio congelado</h2>
      <p>Tu precio no sube mientras tu plan siga activo sin interrupción.</p>

      <h2>7. Reglas de Google</h2>
      <p>FiveTap muestra el botón de reseña a todos tus clientes. Te comprometes a no ofrecer descuentos ni premios a cambio de reseñas y a no filtrar quién puede dejarlas. No controlamos lo que Google publica, oculta o elimina.</p>

      <h2>8. Lo que no garantizamos</h2>
      <p>Hacemos fácil que tus clientes dejen reseñas, pero no podemos garantizar un número exacto de reseñas ni de estrellas: eso depende de tus clientes y de Google.</p>

      <h2>9. Datos</h2>
      <p>Los datos de tu club de clientes son tuyos. Lee nuestra <a href="/privacidad">política de privacidad</a>.</p>

      <h2>10. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Panamá.</p>

      <h2>Contacto</h2>
      <p><a href={salesWhatsAppUrl("Hola, tengo una consulta sobre los términos de FiveTap.")}>Escríbenos por WhatsApp</a>.</p>
    </LegalPage>
  );
}
