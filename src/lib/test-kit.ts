// FiveTap Test: one piece valid for 30 days, with FiveTap Business. It cancels by itself
// after day 29 (so it never runs into a second month) and the venue picks a plan. Asked for by WhatsApp to the founder; more
// than 4 pieces or a specific quantity is quoted.

/** What the offer says: valid for 30 days. */
export const TEST_DAYS = 30;
/** Last day the test works; it pauses by itself the day after. */
export const TEST_ACTIVE_DAYS = 29;

export const TEST_PIECES = [
  { key: "test-placa", name: "Placa de reseñas", detail: "1 placa NFC grande + FiveTap Business", monthly: 40 },
  { key: "test-mesero", name: "Tarjeta de mesero", detail: "1 tarjeta NFC con cordón + FiveTap Business", monthly: 25 },
] as const;

/** The founder's WhatsApp for quotes, as people read it and as wa.me needs it. */
export const FOUNDER_PHONE = "6171-9111";
export const founderWhatsApp = (text: string) => `https://wa.me/50761719111?text=${encodeURIComponent(text)}`;

/** FiveTap Mini: monthly kits for small venues (1 to 5 plaques), asked for by WhatsApp. */
export const MINI_KITS = [
  { key: "mini-1", name: "Mini 1", plaques: 1, monthly: 40 },
  { key: "mini-2", name: "Mini 2", plaques: 2, monthly: 55 },
  { key: "mini-3", name: "Mini 3", plaques: 3, monthly: 69 },
  { key: "mini-4", name: "Mini 4", plaques: 4, monthly: 79 },
  { key: "mini-5", name: "Mini 5", plaques: 5, monthly: 89, best: true },
] as const;
export const MINI_EXTRA_CARD = 15;
export const MINI_INCLUDES = [
  "Placas NFC listas para usar, configuradas con tu Google",
  "FiveTap Business, la app del dueño y el gerente",
  "Mensajes privados de tus clientes al instante",
  "Club de clientes para tus promociones",
  "Resumen diario y reporte mensual",
  "Configuración inicial y explicación de uso",
];
