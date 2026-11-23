// Versions of the texts a person accepts. When a text changes, its version changes too, and
// every consent saved from then on records the version that person actually saw.
export const PRIVACY_VERSION = "privacidad-v3-2026-11-23";
export const TERMS_VERSION = "terminos-v3-2026-11-23";
export const PRIVACY_UPDATED = "23 de noviembre de 2026";

/** What a guest accepted when joining the club or creating a loyalty card. */
export const CLUB_CONSENT_VERSION = `club-v2|${PRIVACY_VERSION}`;
export const CARD_CONSENT_VERSION = `tarjeta-v2|${PRIVACY_VERSION}`;

/** How long guest activity is kept before the daily job deletes it (months). */
export const RETENTION = { activityMonths: 24, reservationsMonths: 12 } as const;
