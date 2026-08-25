/**
 * Pure request/response contract for the OWNER-DEFERRED currency conversion
 * endpoint (`POST /api/currencies/convert`).
 *
 * Extracted so the route's behaviour is unit-testable without Next.js and
 * without a database connection.
 *
 * OWNER DECISION — currency conversion is DEFERRED. The canonical product
 * behaviour is: no FX, no automatic conversion, no exchange-rate lookup, no
 * display-currency conversion. The publisher-selected `amount + currencyCode`
 * is the source of truth.
 *
 * The historical route path is preserved for compatibility, but it must never
 * execute a conversion. This resolver:
 *
 *   - takes no rate input and reads no rate data,
 *   - never touches the database,
 *   - never imports or invokes `CurrencyService`,
 *   - returns a stable structured refusal that mirrors the shape used by the
 *     canonical registry contract in `lib/market/currency-api.ts`
 *     (`success` / `conversionSupported` / `error` / `message` / `messageEn`).
 *
 * There is deliberately NO runtime bypass (no `ENABLE_FX`, no environment
 * flag, no query parameter). Reactivation requires a future reviewed FX
 * architecture, not a switch.
 */

export type CurrencyConversionErrorCode = "CURRENCY_CONVERSION_DISABLED";

/** Not Implemented — the capability is recognised but intentionally not served. */
export const CURRENCY_CONVERSION_DISABLED_STATUS = 501 as const;

export const CURRENCY_CONVERSION_DISABLED_MESSAGES: Readonly<{ ar: string; en: string }> =
  Object.freeze({
    ar: "تحويل العملات غير مدعوم حالياً. السعر يبقى بالعملة التي اختارها الناشر.",
    en: "Currency conversion is not supported at this time.",
  });

export type CurrencyConversionDisabledBody = {
  success: false;
  conversionSupported: false;
  error: CurrencyConversionErrorCode;
  message: string;
  messageEn: string;
};

export type CurrencyConversionDisabledResponse = {
  status: typeof CURRENCY_CONVERSION_DISABLED_STATUS;
  body: CurrencyConversionDisabledBody;
};

/**
 * Always refuses. Accepts no input at all: nothing about the caller's request
 * can make this endpoint convert, so nothing about the caller's request is
 * read, echoed, or validated.
 */
export function resolveDisabledCurrencyConversion(): CurrencyConversionDisabledResponse {
  return {
    status: CURRENCY_CONVERSION_DISABLED_STATUS,
    body: {
      success: false,
      conversionSupported: false,
      error: "CURRENCY_CONVERSION_DISABLED",
      message: CURRENCY_CONVERSION_DISABLED_MESSAGES.ar,
      messageEn: CURRENCY_CONVERSION_DISABLED_MESSAGES.en,
    },
  };
}
