// The training center of FiveTap Business: short guides written for owners, managers and
// their staff. Only guides for what the business actually has are shown (orders and
// reservations appear when those modules are on).

import type { ModuleKey } from "./orders";

export type Guide = { key: string; title: string; minutes: number; module?: ModuleKey; who: string; steps: string[]; tip?: string };

export const GUIDES: Guide[] = [
  {
    key: "inicio", title: "Tu FiveTap en 2 minutos", minutes: 2, who: "Dueño y gerente",
    steps: [
      "En Inicio ves, en tiempo real, cuántos clientes tocaron tus placas, cuántos fueron a dejar su reseña en Google y los mensajes privados nuevos.",
      "La página se actualiza sola cada minuto; no hace falta recargarla.",
      "Instala FiveTap como app desde Configuración: así te llegan los avisos al celular.",
      "Abajo tienes las secciones: Inicio, Mensajes, Club, Reporte y Ajustes.",
    ],
  },
  {
    key: "placas", title: "Cómo funcionan tus placas NFC", minutes: 3, who: "Todo el equipo",
    steps: [
      "El cliente acerca su teléfono a la placa y se abre tu página. No descarga nada.",
      "En iPhone se acerca la parte de arriba del teléfono; en Android, la parte de atrás, con NFC activado (casi todos lo traen activado).",
      "Deja cada placa a la vista, donde el cliente pueda tocarla sin pedir permiso.",
      "No muevas una placa a otro negocio ni la regrabes: su enlace es único y lleva a tu página.",
      "Si una placa no abre, escríbenos en Soporte indicando cuál es (por ejemplo, Mesa 4).",
    ],
  },
  {
    key: "resenas", title: "Reseñas y mensajes privados", minutes: 3, who: "Dueño y gerente",
    steps: [
      "El botón para dejar reseña en Google aparece para todos los clientes, siempre. Es una regla de Google: no se filtra a nadie.",
      "No ofrezcas descuentos ni regalos a cambio de reseñas, y no pidas solo 5 estrellas: Google lo prohíbe y puede borrar reseñas.",
      "Si un cliente tuvo un problema puede escribirte en privado: el mensaje te llega al instante.",
      "Responde rápido, mientras el cliente sigue en el local, y marca el mensaje como resuelto.",
    ],
    tip: "Un problema resuelto a tiempo suele convertirse en una buena reseña.",
  },
  {
    key: "equipo", title: "Capacitación del personal", minutes: 3, who: "Meseros y personal",
    steps: [
      "Al final del servicio, si el cliente se ve contento, invítalo: “Si le gustó, acerque su teléfono a la placa y déjenos su opinión; toma 10 segundos”.",
      "No insistas, no ofrezcas nada a cambio y no pidas una calificación específica.",
      "Si el cliente tuvo un problema, avísale que puede escribirle al gerente en privado desde la misma placa.",
      "Si tienes tarjeta FiveTap con tu nombre, el ranking del equipo muestra cuántos clientes llevaste a dejar su reseña.",
    ],
  },
  {
    key: "club", title: "Club de clientes y promociones", minutes: 3, who: "Dueño y gerente",
    steps: [
      "Desde la placa, tus clientes pueden unirse a tu club con su nombre, WhatsApp y cumpleaños, dando su permiso.",
      "En Club escribes una promoción y la envías a cada cliente desde tu WhatsApp.",
      "Envía solo a quien dio su permiso y respeta a quien pide no recibir más (Ley 81 de 2019 de datos personales).",
      "Puedes descargar la lista en Excel.",
    ],
  },
  {
    key: "pagina", title: "Mi página: promociones y catálogo", minutes: 4, who: "Dueño y gerente",
    steps: [
      "En Mi página creas promociones con título, descripción, foto y fechas. Si están activas y en fecha, se ven al instante en tus placas.",
      "Pausa una promoción cuando se termine o ponle fecha de fin.",
      "Agrega tus productos o servicios con foto, categoría y precio. Ocúltalos si se agotan.",
      "La portada, el horario, la ubicación y las redes los actualiza FiveTap: pídelos en Soporte.",
    ],
  },
  {
    key: "pedidos", title: "Pedidos desde la placa", minutes: 4, module: "orders", who: "Gerente y personal",
    steps: [
      "El cliente pide desde la mesa: la mesa se toma sola de la placa. Te llega un aviso al celular.",
      "En Pedidos toca Aceptar y preparar, luego Marcar listo y, al servirlo, Entregado. El cliente ve cada paso en su teléfono.",
      "Si se acabó algo, usa Ajustar para cambiar la cantidad; el cliente ve que el pedido fue modificado.",
      "Si no puedes atenderlo, cancélalo con un motivo.",
      "El cobro se hace en el local, como siempre: FiveTap no cobra los pedidos.",
    ],
  },
  {
    key: "reservas", title: "Reservas desde la placa", minutes: 4, module: "reservations", who: "Dueño y gerente",
    steps: [
      "Los clientes reservan solo en los días y horas en que estás abierto. Te llega un aviso al celular.",
      "En Reservas, toca Confirmar por WhatsApp: se abre WhatsApp con el mensaje listo y tú lo envías.",
      "El día de la reserva marca Llegó o No vino; así ves cuántos no llegan.",
      "Anota también las reservas que te hacen por teléfono, para tener todo en un solo lugar.",
      "En Ajustes de reservas defines cuántas personas como máximo, con cuántos días de anticipación y con cuántas horas de aviso.",
    ],
  },
  {
    key: "informes", title: "Tus informes y resultados", minutes: 2, who: "Dueño",
    steps: [
      "En Reporte ves los toques, las visitas a Google, los mensajes y el club del mes.",
      "El día de la instalación anotamos tus reseñas en Google: así comparas el antes y el después.",
      "Si activaste los avisos, cada mañana te llega el resumen de ayer y el día 1 el resumen del mes.",
      "En Clientes ves quiénes vuelven: tu club y tus reservas juntos, con visitas y cumpleaños.",
    ],
  },
  {
    key: "renovar", title: "Cómo renovar tu plan", minutes: 1, who: "Dueño",
    steps: [
      "Un día antes de que venza tu plan te llega un aviso al celular, y en Inicio aparece el botón Renovar.",
      "En Renovar eliges cómo pagar: efectivo, Yappy o transferencia. Ahí ves el monto y los datos para pagar.",
      "Si pagas por Yappy o transferencia, toca Enviar comprobante: se abre WhatsApp con Sebastián y le mandas la captura.",
      "Si pagas en efectivo, coordinas con él el día y el lugar. Al confirmar tu pago te llega tu recibo.",
    ],
  },
  {
    key: "seguridad", title: "Accesos y seguridad", minutes: 2, who: "Dueño",
    steps: [
      "El dueño y el gerente tienen cada uno su código privado. Sin el código, el enlace no abre aunque lo reenvíen.",
      "El gerente no ve pagos ni la suscripción.",
      "Si el gerente deja el negocio, cámbiale el código en Configuración: el anterior deja de funcionar.",
    ],
  },
  {
    key: "soporte", title: "Cómo pedir ayuda", minutes: 1, who: "Dueño y gerente",
    steps: [
      "En Soporte escribes tu duda o problema y te respondemos ahí mismo, con aviso al celular.",
      "Para algo urgente también puedes escribirnos por WhatsApp desde Ayuda.",
    ],
  },
];

export const guidesFor = (mods: Record<ModuleKey, boolean>) => GUIDES.filter((g) => !g.module || mods[g.module]);
