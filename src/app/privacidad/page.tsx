import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { salesWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidad — FiveTap" };

export default function Privacy() {
  return (
    <LegalPage title="Política de privacidad" updated="29 de octubre de 2026">
      <p>Aquí explicamos qué datos recoge FiveTap, para qué los usamos y cómo puedes pedir que los borremos. Seguimos la Ley 81 de 2019 de protección de datos personales de la República de Panamá.</p>

      <h2>1. Si eres cliente de un local</h2>
      <ul>
        <li><b>Cuando tocas una placa:</b> registramos la fecha, la placa y el tipo de celular (iPhone, Android u otro) para contar las visitas. No pedimos tu nombre ni usamos cookies de publicidad.</li>
        <li><b>Si escribes al gerente:</b> guardamos tu mensaje y el nombre que quieras dejar, y se los mostramos solo al local.</li>
        <li><b>Si te unes al club:</b> guardamos tu nombre, tu WhatsApp y tu cumpleaños (opcional), con tu permiso, para que el local te envíe sus promociones.</li>
        <li><b>Si dejas una reseña:</b> la escribes directamente en Google. FiveTap no ve ni guarda tu reseña.</li>
      </ul>

      <h2>2. Quién decide sobre tus datos</h2>
      <p>El local es responsable de los datos de su club y de sus mensajes. FiveTap los guarda en su nombre para prestar el servicio. No vendemos datos ni los usamos para nuestra propia publicidad.</p>

      <h2>3. Tus derechos</h2>
      <p>Puedes pedir ver, corregir o borrar tus datos, o salirte del club, cuando quieras. Escríbele al local o a nosotros y lo hacemos sin costo.</p>

      <h2>4. Si eres un negocio cliente de FiveTap</h2>
      <p>Guardamos los datos de tu local y de quien firma el contrato (nombre, cargo, teléfono, correo, dirección) para darte el servicio, cobrar y mandarte tus reportes.</p>

      <h2>5. Con quién trabajamos</h2>
      <p>Usamos proveedores para que FiveTap funcione: Supabase (base de datos), Vercel (sitio web), Resend (correos) y PayPal (pagos). Solo reciben lo necesario para su tarea.</p>

      <h2>6. Cuánto tiempo guardamos los datos</h2>
      <p>Mientras el local tenga el servicio activo. Si el local cancela, borramos o entregamos sus datos cuando lo pida.</p>

      <h2>7. Seguridad</h2>
      <p>Los datos viajan cifrados y solo el local y el equipo de FiveTap pueden verlos, con accesos privados.</p>

      <h2>Contacto</h2>
      <p><a href={salesWhatsAppUrl("Hola, quiero ejercer mis derechos sobre mis datos en FiveTap.")}>Escríbenos por WhatsApp</a> para cualquier solicitud sobre tus datos.</p>
    </LegalPage>
  );
}
