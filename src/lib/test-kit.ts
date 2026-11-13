// FiveTap Test: 1 to 4 pieces (review plaques and waiter cards) with FiveTap Business, valid
// for 30 days. It cancels by itself after day 29 (so it never runs into a second month) and
// the venue picks a plan; what it paid comes off its first month. Asked for by WhatsApp to
// the founder; more pieces or a specific quantity are quoted.

/** What the offer says: valid for 30 days. */
export const TEST_DAYS = 30;
/** Last day the test works; it pauses by itself the day after. */
export const TEST_ACTIVE_DAYS = 29;

/**
 * The public test: priced per piece, from 1 up to TEST_MAX_PIECES pieces, all with FiveTap
 * Business. More pieces or a specific quantity are quoted by the founder. What the venue
 * paid comes off its first month if it picks a plan. (In person the founder can still
 * start a test without the app.)
 */
export const TEST_MAX_PIECES = 4;
export const TEST_OFFER = {
  key: "test-placa",
  name: "FiveTap Test",
  detail: "Placas de reseñas y tarjetas de meseros con FiveTap Business",
  /** Price of one review plaque; the headline "desde" price. */
  price: 40,
  plaque: 40,
  card: 30,
} as const;
/** "Placa $40 · tarjeta de mesero $30 · de 1 a 4 piezas" */
export const TEST_PRICES = `placa de reseñas $${TEST_OFFER.plaque} · tarjeta de mesero $${TEST_OFFER.card} · de 1 a ${TEST_MAX_PIECES} piezas`;

/** The founder's WhatsApp for quotes, as people read it and as wa.me needs it. */
export const FOUNDER_PHONE = "6171-9111";
export const founderWhatsApp = (text: string) => `https://wa.me/50761719111?text=${encodeURIComponent(text)}`;
