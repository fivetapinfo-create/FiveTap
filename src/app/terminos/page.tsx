import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { REPLACEMENT_FEE, SETUP_FEE, TRIAL_DAYS, WAITER_CARD_PRICE, PLANS, money } from "@/lib/contract";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Términos del servicio — FiveTap" };

export default function Terms() {
  return (
    <LegalPage title="Términos del servicio" updated="29 de octubre de 2026">
      <p>Estos términos explican cómo funciona FiveTap para los negocios que lo contratan. Si firmaste un contrato con nosotros, el contrato manda sobre esta página.</p>

      <h2>1. Qué es FiveTap</h2>
      <p>FiveTap instala placas y tarjetas con NFC y código QR en tu local. Tus clientes las tocan con el celular y pueden dejar una reseña en Google, escribirle en privado al gerente o unirse a tu club de clientes. Incluye una página privada con tus resultados y un reporte mensual.</p>

      <h2>2. Planes y precios</h2>
      <ul>
        <li><b>{PLANS.monthly.name}:</b> {money(PLANS.monthly.price)} al mes, más {money(SETUP_FEE)} de instalación (pago único).</li>
        <li><b>{PLANS.annual.name}:</b> {money(PLANS.annual.price)} al año, por adelantado, con la instalación incluida.</li>
        <li><b>{PLANS.plaque.name}:</b> {money(PLANS.plaque.price)} al mes por placa.</li>
        <li><b>Pago único:</b> oferta de 2 placas por $60 y tarjetas para meseros a {money(WAITER_CARD_PRICE)} cada una. Estas piezas llevan directo a tu página de reseñas de Google, sin las funciones del plan.</li>
      </ul>
      <p>Los planes se cobran de forma automática por PayPal, o por Yappy o transferencia si así lo acordamos.</p>

      <h2>3. Prueba de {TRIAL_DAYS} días</h2>
      <p>Tienes {TRIAL_DAYS} días desde la instalación para probar el plan. Si no te convence, avísanos antes de que terminen y no se cobra el plan. La instalación y las piezas de pago único no son reembolsables.</p>

      <h2>4. Cancelación</h2>
      <p>El Plan Mensual y el Plan Placa no tienen permanencia: los cancelas cuando quieras, desde PayPal o avisándonos, y no se vuelve a cobrar. El servicio sigue hasta el final del período ya pagado. El Plan Anual cubre 12 meses y, pasada la prueba, no se reembolsa. Al cancelar un plan, retiramos las placas incluidas en él.</p>

      <h2>5. Garantía y reposición</h2>
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
