/**
 * AkarProMax market scope + preference resolution (L1A).
 *
 * Five concepts stay separate for the whole life of the platform. Nothing in
 * this module derives one from another:
 *
 *   PLATFORM SCOPE   — always GLOBAL. Not configurable, not a country.
 *   USER LOCATION    — where the device currently is. An input, never an answer.
 *   ACTIVE MARKET    — the country the user chose to browse, or GLOBAL.
 *   INTERFACE LANG   — chosen independently of market.
 *   CURRENCY         — a search/filter preference, chosen independently of
 *                      market and of language. It selects listings already
 *                      priced in that currency. It is NOT a display currency:
 *                      no amount is ever converted for a visitor.
 *
 * GLOBAL is an application-level state, never a row in the `countries` table.
 */

import { isKnownCountry, normalizeCountryCode } from "@/lib/market/country-registry";
import { isSupportedCurrency } from "@/lib/market/currency-registry";

/** The platform's own scope. There is no other value. */
export const PLATFORM_SCOPE = "GLOBAL" as const;

/**
 * Sentinel for "no country filter". Deliberately not an ISO alpha-2 value, so
 * it can never be mistaken for — or persisted as — a country row.
 */
export const GLOBAL_MARKET = "GLOBAL" as const;

export type MarketScope =
  | { readonly kind: "global" }
  | { readonly kind: "country"; readonly countryCode: string };

export const GLOBAL_SCOPE: MarketScope = Object.freeze({ kind: "global" });

export function countryScope(code: string): MarketScope {
  const normalized = normalizeCountryCode(code);
  if (!normalized || !isKnownCountry(normalized)) {
    throw new Error(`Unknown country code for market scope: ${code}`);
  }
  return Object.freeze({ kind: "country", countryCode: normalized });
}

/** Parses any external representation of a market scope. Unknown => GLOBAL. */
export function parseMarketScope(value: string | null | undefined): MarketScope {
  if (!value) return GLOBAL_SCOPE;
  const raw = value.trim();
  if (!raw || raw.toUpperCase() === GLOBAL_MARKET) return GLOBAL_SCOPE;
  const normalized = normalizeCountryCode(raw);
  if (!normalized || !isKnownCountry(normalized)) return GLOBAL_SCOPE;
  return Object.freeze({ kind: "country", countryCode: normalized });
}

/** Serialises a scope for URLs/storage. GLOBAL stays the explicit sentinel. */
export function serializeMarketScope(scope: MarketScope): string {
  return scope.kind === "global" ? GLOBAL_MARKET : scope.countryCode;
}

/** The country filter to apply to a query. `null` means: do not filter. */
export function marketCountryFilter(scope: MarketScope): string | null {
  return scope.kind === "global" ? null : scope.countryCode;
}

export function isGlobalScope(scope: MarketScope): boolean {
  return scope.kind === "global";
}

/* ------------------------------------------------------------------------ */
/* Preference resolution                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Ordered highest-priority-first. A manual choice always wins and is never
 * silently overwritten by a lower-priority signal.
 */
export const MARKET_SOURCE_PRECEDENCE = Object.freeze([
  "manual",
  "account",
  "browser",
  "gps",
  "ip",
  "fallback",
] as const);

export type MarketSource = (typeof MARKET_SOURCE_PRECEDENCE)[number];

export type MarketSignals = {
  /** Explicit in-session choice by the user. Highest priority. */
  readonly manual?: string | null;
  /** Saved on the user's account. */
  readonly account?: string | null;
  /** Saved in this browser (cookie / local storage). */
  readonly browser?: string | null;
  /** Only present when the user granted geolocation permission. */
  readonly gps?: string | null;
  /** Server-side IP inference. Weakest signal before the global fallback. */
  readonly ip?: string | null;
};

export type ResolvedMarket = {
  readonly scope: MarketScope;
  readonly source: MarketSource;
};

/**
 * Resolves the active market from all available signals.
 *
 * Unknown/blank signals are skipped rather than being allowed to force GLOBAL,
 * so a bad IP lookup can never override a saved account preference.
 */
export function resolveActiveMarket(signals: MarketSignals = {}): ResolvedMarket {
  for (const source of MARKET_SOURCE_PRECEDENCE) {
    if (source === "fallback") break;
    const candidate = signals[source];
    const normalized = normalizeCountryCode(candidate ?? null);
    if (candidate && candidate.trim().toUpperCase() === GLOBAL_MARKET) {
      return { scope: GLOBAL_SCOPE, source };
    }
    if (normalized && isKnownCountry(normalized)) {
      return { scope: Object.freeze({ kind: "country", countryCode: normalized }), source };
    }
  }
  return { scope: GLOBAL_SCOPE, source: "fallback" };
}

/* ------------------------------------------------------------------------ */
/* Market + currency preference state                                        */
/* ------------------------------------------------------------------------ */

export type MarketPreferences = {
  readonly scope: MarketScope;
  /**
   * The visitor's currency FILTER preference, not a display currency.
   * null = no currency filter chosen. Never auto-assigned from the market.
   */
  readonly currencyCode: string | null;
  readonly locale: string;
};

export function createPreferences(input: {
  scope?: MarketScope;
  currencyCode?: string | null;
  locale?: string;
} = {}): MarketPreferences {
  const currency = input.currencyCode ?? null;
  return Object.freeze({
    scope: input.scope ?? GLOBAL_SCOPE,
    currencyCode: currency && isSupportedCurrency(currency) ? currency.trim().toUpperCase() : null,
    locale: input.locale ?? "ar",
  });
}

/**
 * Changing the active market NEVER rewrites the user's chosen currency.
 * SA -> SY leaves USD as USD.
 */
export function selectMarket(prefs: MarketPreferences, next: MarketScope): MarketPreferences {
  return Object.freeze({ ...prefs, scope: next });
}

/**
 * Changing the currency filter NEVER changes the active market, and never
 * converts any stored price. USD -> EUR leaves the country alone and leaves
 * every USD-priced listing priced in USD; it only changes which listings the
 * currency-aware filter selects.
 */
export function selectCurrency(prefs: MarketPreferences, code: string): MarketPreferences {
  if (!isSupportedCurrency(code)) {
    throw new Error(`Unsupported currency code: ${code}`);
  }
  return Object.freeze({ ...prefs, currencyCode: code.trim().toUpperCase() });
}

export function selectLocale(prefs: MarketPreferences, locale: string): MarketPreferences {
  return Object.freeze({ ...prefs, locale });
}
