// WhatsApp numbers are stored as digits with the country code (Panamá by default).

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const full = input.trim().startsWith("+") || digits.length > 8 ? digits : `507${digits}`;
  return full.length >= 10 && full.length <= 15 ? full : null;
}

/** "50761719111" → "+507 6171-9111" (other countries: "+<digits>"). */
export function formatPhone(digits: string): string {
  if (digits.startsWith("507") && digits.length === 11) return `+507 ${digits.slice(3, 7)}-${digits.slice(7)}`;
  return `+${digits}`;
}

export const waLink = (digits: string) => `https://wa.me/${digits}`;
