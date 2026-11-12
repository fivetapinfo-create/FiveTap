// FiveTap Test: one review plaque with FiveTap Business, valid for 30 days. It cancels by
// itself after day 29 (so it never runs into a second month) and the venue picks a plan.
// If they do, the test price comes off their first month. Asked for by WhatsApp to the
// founder; any specific quantity is quoted.

/** What the offer says: valid for 30 days. */
export const TEST_DAYS = 30;
/** Last day the test works; it pauses by itself the day after. */
export const TEST_ACTIVE_DAYS = 29;

/** The one public test. (In person the founder can still start a test without the app.) */
export const TEST_OFFER = {
  key: "test-placa",
  name: "FiveTap Test",
  detail: "1 placa NFC de reseñas + FiveTap Business",
  price: 40,
} as const;

/** The founder's WhatsApp for quotes, as people read it and as wa.me needs it. */
export const FOUNDER_PHONE = "6171-9111";
export const founderWhatsApp = (text: string) => `https://wa.me/50761719111?text=${encodeURIComponent(text)}`;
