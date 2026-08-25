/**
 * Pure request/response contract for the canonical currency registry API.
 *
 * Extracted so the route's behaviour is unit-testable without Next.js.
 *
 * PUBLIC ROUTE: this resolver backs the MANDATORY public route
 * `GET /api/currencies` (and the additional `/api/market/currencies` alias).
 * It serves both shapes the pre-L1A `/api/currencies` route supported —
 *
 *   (no code)      -> the full active registry
 *   ?code=USD      -> exactly one canonical currency object
 *   ?code=XXX      -> HTTP 404, structured
 *
 * — but backed by CURRENCY_REGISTRY instead of a database table, and WITHOUT
 * any of the conversion machinery. There is no FX, no exchange rate in the
 * payload, and no default-currency field: the platform nominates none. The
 * publisher chooses the listing currency; a currency chosen in a search form
 * only filters to listings already priced in it.
 */

import {
  ACTIVE_CURRENCY_CODES,
  CURRENCY_REGISTRY,
  getCurrency,
  type CurrencyDefinition,
} from "@/lib/market/currency-registry";

export type CurrencyApiErrorCode = "CURRENCY_NOT_FOUND";

export const CURRENCY_PUBLIC_MESSAGES: Readonly<
  Record<CurrencyApiErrorCode, { ar: string; en: string }>
> = Object.freeze({
  CURRENCY_NOT_FOUND: Object.freeze({
    ar: "العملة غير موجودة ضمن العملات المدعومة.",
    en: "The requested currency is not part of the supported registry.",
  }),
});

/** The public shape of one currency. Deliberately carries no rate, no default. */
export type CurrencyPayload = {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  decimals: number;
  displayOrder: number;
};

export type CurrencyListBody = {
  success: true;
  conversionSupported: false;
  count: number;
  codes: readonly string[];
  data: CurrencyPayload[];
};

export type CurrencySingleBody = {
  success: true;
  conversionSupported: false;
  data: CurrencyPayload;
};

export type CurrencyErrorBody = {
  success: false;
  error: CurrencyApiErrorCode;
  message: string;
  messageEn: string;
};

export type CurrencyApiResponse = {
  status: number;
  body: CurrencyListBody | CurrencySingleBody | CurrencyErrorBody;
};

export function toCurrencyPayload(currency: CurrencyDefinition): CurrencyPayload {
  return {
    code: currency.code,
    symbol: currency.symbol,
    nameAr: currency.nameAr,
    nameEn: currency.nameEn,
    nameTr: currency.nameTr,
    decimals: currency.decimals,
    displayOrder: currency.displayOrder,
  };
}

/**
 * Resolves a currency registry request. Never throws; never converts.
 */
export function resolveCurrencyRequest(
  params: { code?: string | null } = {},
): CurrencyApiResponse {
  const requested = params.code?.trim();

  if (requested) {
    const currency = getCurrency(requested);
    if (!currency) {
      const message = CURRENCY_PUBLIC_MESSAGES.CURRENCY_NOT_FOUND;
      return {
        status: 404,
        body: {
          success: false,
          error: "CURRENCY_NOT_FOUND",
          message: message.ar,
          messageEn: message.en,
        },
      };
    }
    return {
      status: 200,
      body: { success: true, conversionSupported: false, data: toCurrencyPayload(currency) },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      conversionSupported: false,
      count: CURRENCY_REGISTRY.length,
      codes: ACTIVE_CURRENCY_CODES,
      data: CURRENCY_REGISTRY.map(toCurrencyPayload),
    },
  };
}
