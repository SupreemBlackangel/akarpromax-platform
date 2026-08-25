/**
 * L1C-0.5A — Services currency policy (single enforcement point).
 *
 * BINDING PLATFORM RULE (do not "improve" this away):
 *   There is NO global currency default, NO OMR fallback, NO SAR fallback and
 *   NO automatic substitution. The publisher / requester chooses the currency;
 *   the original amount together with its currency code is the source of truth.
 *   There is no FX anywhere, and a currency is never inferred from a country.
 *
 * Services owns NO currency list of its own. Validation delegates to the single
 * canonical registry in `lib/market/currency-registry.ts` (25 active codes,
 * ILS included). A supplied code is trimmed and upper-cased through that
 * registry; a missing or unknown code is a deterministic validation failure,
 * never a silent replacement.
 */
import { getCurrency } from "@/lib/market/currency-registry";
import { SERVICE_ERROR_CODES } from "@services/constants";

export type ServicesCurrencyErrorCode =
  | typeof SERVICE_ERROR_CODES.CURRENCY_REQUIRED
  | typeof SERVICE_ERROR_CODES.CURRENCY_UNSUPPORTED;

/** Thrown by the domain layer when a monetary write has no usable currency. */
export class ServicesCurrencyError extends Error {
  readonly code: ServicesCurrencyErrorCode;

  constructor(code: ServicesCurrencyErrorCode) {
    super(code);
    this.name = "ServicesCurrencyError";
    this.code = code;
  }
}

export type CurrencyResolution =
  | { ok: true; code: string }
  | { ok: false; error: ServicesCurrencyErrorCode };

/**
 * Route-boundary form: resolves a caller-supplied currency without throwing so
 * the route can answer with a deterministic 400 instead of a 500.
 */
export function resolveCurrencyCode(value: unknown): CurrencyResolution {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { ok: false, error: SERVICE_ERROR_CODES.CURRENCY_REQUIRED };
  const currency = getCurrency(raw);
  if (!currency) return { ok: false, error: SERVICE_ERROR_CODES.CURRENCY_UNSUPPORTED };
  return { ok: true, code: currency.code };
}

/**
 * Domain form: the last line of defence before a monetary row is written.
 * Throws rather than inventing a currency, so no write can ever reach storage
 * carrying a platform-chosen code.
 */
export function requireCurrencyCode(value: unknown): string {
  const resolved = resolveCurrencyCode(value);
  if (!resolved.ok) throw new ServicesCurrencyError(resolved.error);
  return resolved.code;
}

/** Maps a currency validation failure onto its HTTP status (always 400). */
export const SERVICES_CURRENCY_HTTP_STATUS = 400;
