import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_UPDATED, PRIVACY_VERSION, RETENTION } from "@/lib/legal";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidad — Fivetap" };

const EMAIL = "info@getfivetap.com";

export default function Privacy() {
  const months = RETENTION.activityMonths;
  return (
    <LegalPage title="Política de privacidad" updated={PRIVACY_UPDATED}>
      <p>
        Aquí explicamos, en palabras sencillas, qué datos recoge Fivetap, para qué los usamos, quién los recibe, cuánto tiempo los
        guardamos y cómo puedes verlos, corregirlos o borrarlos. Seguimos la Ley 81 de 2019 de protección de datos personales de la
        República de Panamá y su reglamento.
      </p>

      <h2>1. Quiénes somos</h2>
      <p>
        Fivetap es una plataforma de placas y tarjetas NFC para negocios en Panamá. Para cualquier tema de datos escríbenos a{" "}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a> o por <a href={salesWhatsAppUrl("Hola, tengo una consulta sobre mis datos en Fivetap.")}>WhatsApp</a>.
      </p>

      <h2>2. Qué datos pedimos y para qué</h2>
      <p>Pedimos solo lo necesario para cada cosa. Si no nos das un dato opcional, todo funciona igual.</p>
      <ul>
        <li><b>Cuando tocas una placa o tarjeta:</b> guardamos la fecha, qué placa fue y si tu celular es iPhone, Android u otro, para contar las visitas. No pedimos tu nombre, no guardamos tu IP ni usamos cookies de publicidad.</li>
        <li><b>Si calificas a un mesero o la atención:</b> guardamos las estrellas y el comentario que quieras dejar. Es anónimo: para evitar votos repetidos usamos una huella cifrada del día que no permite saber quién eres.</li>
        <li><b>Si escribes al encargado:</b> guardamos tu mensaje y, solo si los dejas, tu nombre y tu WhatsApp para que te respondan.</li>
        <li><b>Si te unes al club de un local:</b> guardamos tu nombre, tu WhatsApp y tu cumpleaños (opcional), con tu permiso, para que el local te envíe sus promociones. Guardamos también cuándo diste el permiso y qué versión de este texto aceptaste.</li>
        <li><b>Si creas una tarjeta de fidelidad:</b> guardamos tu nombre, tu WhatsApp y tus sellos para llevar tu tarjeta. Las promociones son aparte: solo las recibes si marcas esa casilla, que viene sin marcar.</li>
        <li><b>Si reservas o pides desde la placa:</b> guardamos tu nombre, el día, la hora, cuántas personas son o qué pediste, y tu WhatsApp si lo dejas, para que el local atienda tu reserva o tu pedido.</li>
        <li><b>Si dejas una reseña:</b> la escribes directamente en Google, con tu cuenta de Google. Fivetap no ve ni guarda tu reseña.</li>
        <li><b>Si trabajas en un local (meseros y equipo):</b> el local registra tu nombre y tu cargo, y Fivetap genera un avatar para tu tarjeta. El local ve las calificaciones que recibes. El local debe informarte de esto.</li>
        <li><b>Si eres un negocio cliente:</b> guardamos los datos del local y de quien firma (nombre, cargo, cédula o RUC, teléfono, correo y dirección) para prestar el servicio, cobrar, facturar y enviarte tus reportes. Cuando firmas un documento en línea guardamos tu firma, la fecha, la IP y el navegador como prueba de la firma.</li>
      </ul>

      <h2>3. Quién decide sobre tus datos</h2>
      <p>
        Cada local es responsable de los datos de sus clientes y de su equipo (club, mensajes, calificaciones, reservas y pedidos).
        Fivetap los guarda y los procesa en su nombre, solo para prestar el servicio. No vendemos datos, no los usamos para nuestra
        propia publicidad y no los compartimos con otros locales.
      </p>

      <h2>4. Inteligencia artificial</h2>
      <p>
        Tus datos no se usan para entrenar modelos de inteligencia artificial, ni nuestros ni de terceros. El equipo de Fivetap usa un
        asistente de IA solo para configurar las páginas de los negocios (textos, promociones y productos que el negocio publica); ese
        asistente no tiene acceso a los datos de los clientes de los locales.
      </p>

      <h2>5. Quién recibe datos</h2>
      <p>Usamos estos proveedores para que Fivetap funcione. Cada uno recibe solo lo necesario para su tarea:</p>
      <ul>
        <li><b>Supabase</b> (base de datos, servidores en Estados Unidos): guarda los datos del servicio.</li>
        <li><b>Vercel</b> (alojamiento del sitio, Estados Unidos): sirve las páginas y la app.</li>
        <li><b>Google</b>: cuando tocas «Califícanos» vas a Google. Además leemos de Google el número público de reseñas del local; no le enviamos datos tuyos.</li>
        <li><b>WhatsApp (Meta)</b>: cuando un local o Fivetap te escribe por WhatsApp, por ejemplo para confirmar una reserva o enviar un recibo.</li>
        <li><b>Resend y Zoho Mail</b>: envío y recepción de correos.</li>
        <li><b>PayPal</b>: cuando un negocio paga en línea.</li>
        <li><b>Apple y Google (notificaciones)</b>: solo si activas los avisos de la app en tu celular.</li>
      </ul>
      <p>Algunos de estos proveedores están fuera de Panamá. Trabajamos con empresas que protegen los datos con cifrado y controles de acceso.</p>

      <h2>6. Cuánto tiempo guardamos los datos</h2>
      <ul>
        <li><b>Visitas, mensajes, calificaciones y pedidos:</b> {months} meses. Después se borran solos.</li>
        <li><b>Reservas:</b> {RETENTION.reservationsMonths} meses después de la fecha de la reserva. Después se borran solas.</li>
        <li><b>Club de clientes:</b> hasta que te salgas o hasta que el local deje Fivetap.</li>
        <li><b>Tarjeta de fidelidad:</b> hasta que la borres tú o hasta que el local deje Fivetap.</li>
        <li><b>Datos de negocios clientes, contratos y recibos:</b> mientras dure el servicio y luego el tiempo que exija la ley para documentos comerciales y contables.</li>
      </ul>
      <p>Si un local deja Fivetap, le entregamos sus datos si los pide y luego los borramos.</p>

      <h2>7. Cookies</h2>
      <p>
        Fivetap usa solo cookies necesarias para que el servicio funcione: recordar que entraste a la app de tu negocio con tu código,
        mantener la sesión del panel interno y autorizar a quien sella las tarjetas de fidelidad. No usamos cookies de analítica, de
        publicidad ni de redes sociales, por eso no te pedimos aceptar cookies. Si algún día las usamos, te pediremos permiso antes y
        podrás rechazarlas.
      </p>

      <h2>8. Tus derechos: ver, corregir y borrar</h2>
      <p>Puedes pedir en cualquier momento ver tus datos, corregirlos, borrarlos, oponerte a su uso o recibir una copia. Es gratis.</p>
      <ul>
        <li><b>Salir de un club:</b> toca la placa del local, entra a «Club» y usa «Salir y borrar mis datos», o responde BAJA a cualquier promoción.</li>
        <li><b>Borrar tu tarjeta de fidelidad:</b> desde la propia tarjeta, en «Borrar mi tarjeta y mis datos».</li>
        <li><b>Cualquier otra solicitud:</b> escríbele al local o a nosotros a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Respondemos en un máximo de 10 días hábiles.</li>
      </ul>
      <p>Si no quedas conforme con nuestra respuesta, puedes acudir a la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).</p>

      <h2>9. Seguridad</h2>
      <p>
        Los datos viajan cifrados. Solo el local (con su código de acceso) y el equipo de Fivetap pueden verlos. Cada local ve solo sus
        propios datos, y revisamos la seguridad de la plataforma de forma periódica.
      </p>

      <h2>10. Menores de edad</h2>
      <p>El club, la tarjeta de fidelidad y las reservas son para mayores de edad. No pedimos a sabiendas datos de menores.</p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Si cambiamos algo importante lo publicaremos aquí con su nueva fecha. Cada permiso que das queda guardado con la versión del
        texto que aceptaste. Versión actual: <code>{PRIVACY_VERSION}</code>.
      </p>
    </LegalPage>
  );
}
