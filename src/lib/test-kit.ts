// FiveTap Test: one piece to start with, monthly, with FiveTap Business. Asked for by
// WhatsApp to the founder; more than 4 pieces or a specific quantity is quoted.

export const TEST_PIECES = [
  { key: "test-placa", name: "Placa de reseñas", detail: "1 placa NFC grande + FiveTap Business", monthly: 40 },
  { key: "test-mesero", name: "Tarjeta de mesero", detail: "1 tarjeta NFC con cordón + FiveTap Business", monthly: 25 },
] as const;

/** The founder's WhatsApp for quotes, as people read it and as wa.me needs it. */
export const FOUNDER_PHONE = "6171-9111";
export const founderWhatsApp = (text: string) => `https://wa.me/50761719111?text=${encodeURIComponent(text)}`;
