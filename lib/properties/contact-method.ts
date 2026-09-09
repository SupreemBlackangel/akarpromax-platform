/**
 * How a visitor reaches the advertiser of a listing.
 *
 * One module for the whole path: the web form, the property API, the public
 * detail page, and the desktop bridge (where the office picks the method once
 * in its control panel and every listing it publishes carries it).
 *
 * `chat` is the platform's own thread (POST /api/messages); `whatsapp` hands the
 * visitor a wa.me link built from the advertiser's number.
 */

export const PROPERTY_CONTACT_METHODS = ['chat', 'whatsapp'] as const;
export type PropertyContactMethod = (typeof PROPERTY_CONTACT_METHODS)[number];

export const DEFAULT_PROPERTY_CONTACT_METHOD: PropertyContactMethod = 'chat';

export function isPropertyContactMethod(value: unknown): value is PropertyContactMethod {
  return typeof value === 'string' && (PROPERTY_CONTACT_METHODS as readonly string[]).includes(value);
}

/** Anything unrecognised — including the null a pre-migration row carries — reads as the chat default. */
export function normalizeContactMethod(value: unknown): PropertyContactMethod {
  const lowered = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return isPropertyContactMethod(lowered) ? lowered : DEFAULT_PROPERTY_CONTACT_METHOD;
}

/**
 * The digits wa.me wants: no `+`, no separators, no international prefix.
 *
 * A number is NOT rescued when it is still in local form (a leading zero, as in
 * 0501234567) — guessing the country code from the listing would silently route
 * the visitor to a stranger, so the caller rejects it and asks for the
 * international form instead.
 */
export function normalizeWhatsappNumber(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits.replace(/\D/g, '');
}

/** Whether the normalised digits can address a real WhatsApp account. */
export function isValidWhatsappNumber(raw: unknown): boolean {
  const digits = normalizeWhatsappNumber(raw);
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0');
}

export const WHATSAPP_FORMAT_MESSAGE =
  'رقم واتساب غير صالح — اكتبه بالصيغة الدولية بدون صفر أو + (مثال: 9665xxxxxxxx)';

/** `null` when the number cannot be dialled, so a caller never renders a dead link. */
export function whatsappLink(raw: unknown, message?: string): string | null {
  if (!isValidWhatsappNumber(raw)) return null;
  const digits = normalizeWhatsappNumber(raw);
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}
