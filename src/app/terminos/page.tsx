import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { REPLACEMENT_FEE, money } from "@/lib/contract";
import { PRIVACY_UPDATED, TERMS_VERSION } from "@/lib/legal";
import { FOUNDER_PHONE, ONE_TIME } from "@/lib/test-kit";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Términos del servicio — Fivetap" };

export default function Terms() {
  return (
    <LegalPage title="Términos del servicio" updated={PRIVACY_UPDATED}>
      <p>
        Estos términos explican cómo funciona Fivetap. La parte A aplica a los negocios que lo contratan; la parte B, a las personas que
        tocan una placa o tarjeta. Si un negocio firmó un contrato o aceptó una cotización por escrito, lo firmado manda sobre esta página.
      </p>

      <h2>A. Para negocios</h2>

      <h3>1. Qué es Fivetap</h3>
      <p>
        Fivetap instala placas y tarjetas NFC en tu negocio. Tus clientes las tocan con el celular y pueden dejar una reseña en Google,
        escribirte en privado, calificar al personal o unirse a tu club. Incluye Fivetap Business, la app privada del negocio con
        resultados en tiempo real, avisos al celular y un reporte mensual.
      </p>

      <h3>2. Precio: siempre por escrito y sin sorpresas</h3>
      <ul>
        <li><b>Servicio mensual:</b> cada negocio recibe una cotización por escrito según sus mesas, su equipo y lo que necesita. La cotización indica la mensualidad, el plazo y si el precio incluye ITBMS.</li>
        <li><b>Sin cobro de instalación:</b> el primer mes se paga el día de la instalación y luego se paga mes a mes.</li>
        <li><b>Precio final:</b> se cobra exactamente lo que dice la cotización firmada. No hay cargos escondidos ni comisiones que no estén escritas.</li>
        <li><b>Precio fijo:</b> durante el plazo firmado tu precio no sube.</li>
        <li><b>Piezas de pago único:</b> placa NFC {money(ONE_TIME.plaque)}, tarjeta NFC {money(ONE_TIME.card)}, Pack Dúo (2 placas) {money(ONE_TIME.packs[0].price)} y Pack Local (4 placas) {money(ONE_TIME.packs[1].price)}, de 1 a {ONE_TIME.max} piezas. Llevan directo a la página de reseñas de Google del local, son del cliente desde que las paga y no incluyen Fivetap Business ni mensualidad.</li>
      </ul>
      <p>Pagos por Yappy, transferencia, efectivo o PayPal, siempre con recibo.</p>

      <h3>3. Garantía de 30 días</h3>
      <p>Si en el primer mes Fivetap no cumple lo prometido, el negocio puede cancelar sin pagar más mensualidades ni penalidad.</p>

      <h3>4. Plazo, aviso de renovación y cancelación</h3>
      <ul>
        <li><b>Mes a mes:</b> se cancela avisando con 30 días de anticipación.</li>
        <li><b>Con plazo (por ejemplo 12 o 24 meses):</b> si el negocio cancela antes de terminar el plazo sin una causa atribuible a Fivetap, paga 2 mensualidades o las que falten, lo que sea menor.</li>
        <li><b>Aviso de renovación:</b> Fivetap avisa en Fivetap Business 60 días y 14 días antes de que termine el plazo, y te contacta para revisar tus resultados. Ningún plazo nuevo empieza sin la firma del negocio.</li>
        <li><b>Cancelar es igual de fácil que contratar:</b> desde Fivetap Business, en Ajustes → «Cancelar el servicio» (un toque, sin llamadas), o con un mensaje por WhatsApp. Te confirmamos la fecha en que termina.</li>
        <li>Al terminar, el negocio devuelve las placas y tarjetas del servicio mensual dentro de los 10 días siguientes.</li>
      </ul>

      <h3>5. Placas y tarjetas</h3>
      <p>
        En el servicio mensual las piezas son de Fivetap y se entregan en préstamo mientras el servicio esté activo. Cambiamos gratis las
        gastadas por el uso normal; una pieza perdida o rota por mal uso cuesta {money(REPLACEMENT_FEE)}. Si el servicio falla por causa
        de Fivetap más de 72 horas seguidas, ese período no se cobra.
      </p>

      <h3>6. Pagos atrasados</h3>
      <p>
        Avisamos 3 días antes de cada vencimiento y el mismo día. Después hay 5 días de gracia. Si el pago no se registra, al sexto día las
        placas y Fivetap Business se pausan hasta ponerse al día. No se borra ningún dato y todo vuelve a funcionar el mismo día del pago.
      </p>

      <h3>7. Reglas de Google</h3>
      <p>
        Fivetap muestra el botón de reseña a todos los clientes. El negocio se compromete a no ofrecer descuentos ni premios a cambio de
        reseñas y a no filtrar quién puede dejarlas. No controlamos lo que Google publica, oculta o elimina.
      </p>

      <h3>8. Lo que no garantizamos</h3>
      <p>Hacemos fácil que tus clientes dejen reseñas, pero no garantizamos un número de reseñas, de estrellas ni de ventas.</p>

      <h3>9. Datos de tus clientes y de tu equipo</h3>
      <p>
        Los datos de tu club y de tus clientes son tuyos: no se venden y se entregan o borran al terminar. Envía promociones solo a quien
        está en tu club y atiende el mismo día a quien pida la baja (responde BAJA). Si registras a tu equipo, infórmales que su nombre y
        su avatar se muestran en su tarjeta y que reciben calificaciones de los clientes. Lee nuestra <a href="/privacidad">política de privacidad</a>.
      </p>

      <h3>10. Tu marca y nuestras licencias</h3>
      <p>
        Nos autorizas a usar tu nombre, logo y colores solo para tus placas, tu página y tus materiales de Fivetap. Fivetap sigue siendo
        dueño de su plataforma y de su diseño. Usamos software de código abierto con licencias que permiten el uso comercial (por ejemplo
        Next.js, React y three.js, con licencia MIT) y tipografías con licencia que permite el uso comercial.
      </p>

      <h2>B. Para quien toca una placa</h2>
      <ul>
        <li>Usar Fivetap es gratis y no necesitas crear una cuenta.</li>
        <li>Tus calificaciones y comentarios deben ser honestos y sin insultos, amenazas ni datos de otras personas. Podemos borrar los que no lo sean.</li>
        <li>Las promociones, productos, precios y reservas son responsabilidad de cada local.</li>
        <li>Tus datos se tratan como explica la <a href="/privacidad">política de privacidad</a>.</li>
      </ul>

      <h2>Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Panamá. Versión: <code>{TERMS_VERSION}</code>.</p>

      <h2>Contacto</h2>
      <p>
        info@getfivetap.com · <a href={salesWhatsAppUrl("Hola, tengo una consulta sobre los términos de Fivetap.")}>WhatsApp</a> · {FOUNDER_PHONE}
      </p>
    </LegalPage>
  );
}
