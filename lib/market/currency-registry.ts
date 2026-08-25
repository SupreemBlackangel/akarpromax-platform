/**
 * AkarProMax canonical currency registry (L1A).
 *
 * THE CURRENCY RULE (binding — do not "improve" this away):
 *
 *   The LISTING PUBLISHER chooses the currency the price is expressed in.
 *   That currency is part of the listing and never changes.
 *
 *   A VISITOR does NOT choose a display currency and receive a converted
 *   value. There is no FX, no rate lookup, and no currency calculator.
 *
 *   A currency MAY be selected in a search/filter form. Doing so filters to
 *   listings already priced in that currency. It never converts anything and
 *   never compares amounts across currencies.
 *
 * Consequences enforced here:
 *  - There is NO global monetary default. No `DEFAULT_CURRENCY` is exported.
 *  - There is NO FX conversion in this module, and none may be added here.
 *  - This is the single source of truth for the active currency list. UI
 *    components and API routes must read from here (or from the API route that
 *    serves it) instead of hard-coding their own currency arrays.
 *
 * A country's *official* currency and a listing's *pricing* currency are two
 * different concepts. See `country-registry.ts` for the former; a listing may
 * legitimately be priced in any active currency in this registry.
 */

export type CurrencyCode =
  | "AED"
  | "BHD"
  | "DZD"
  | "DJF"
  | "EGP"
  | "ILS"
  | "IQD"
  | "JOD"
  | "KMF"
  | "KWD"
  | "LBP"
  | "LYD"
  | "MAD"
  | "MRU"
  | "OMR"
  | "QAR"
  | "SAR"
  | "SDG"
  | "SOS"
  | "SYP"
  | "TND"
  | "YER"
  | "TRY"
  | "USD"
  | "EUR";

export type CurrencyDefinition = {
  /** ISO 4217 alpha-3 code. Also the primary key of the `currencies` table. */
  readonly code: CurrencyCode;
  readonly symbol: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly nameTr: string;
  /** ISO 4217 minor units. Used for display/rounding only — never for FX. */
  readonly decimals: 0 | 2 | 3;
  readonly displayOrder: number;
};

export const CURRENCY_REGISTRY: readonly CurrencyDefinition[] = Object.freeze([
  { code: "AED", symbol: "د.إ", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", nameTr: "BAE Dirhemi", decimals: 2, displayOrder: 10 },
  { code: "BHD", symbol: "د.ب", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", nameTr: "Bahreyn Dinarı", decimals: 3, displayOrder: 20 },
  { code: "DZD", symbol: "د.ج", nameAr: "دينار جزائري", nameEn: "Algerian Dinar", nameTr: "Cezayir Dinarı", decimals: 2, displayOrder: 30 },
  { code: "DJF", symbol: "Fdj", nameAr: "فرنك جيبوتي", nameEn: "Djiboutian Franc", nameTr: "Cibuti Frangı", decimals: 0, displayOrder: 40 },
  { code: "EGP", symbol: "ج.م", nameAr: "جنيه مصري", nameEn: "Egyptian Pound", nameTr: "Mısır Lirası", decimals: 2, displayOrder: 50 },
  { code: "IQD", symbol: "د.ع", nameAr: "دينار عراقي", nameEn: "Iraqi Dinar", nameTr: "Irak Dinarı", decimals: 3, displayOrder: 60 },
  // Active PRICING currency for listings in the Palestinian market (owner
  // decision). This is publisher pricing capability only — PS's official
  // currency metadata in country-registry.ts remains null, because country
  // official-currency metadata != allowed publisher pricing currencies.
  { code: "ILS", symbol: "₪", nameAr: "شيكل إسرائيلي جديد", nameEn: "Israeli New Shekel", nameTr: "İsrail Yeni Şekeli", decimals: 2, displayOrder: 65 },
  { code: "JOD", symbol: "د.أ", nameAr: "دينار أردني", nameEn: "Jordanian Dinar", nameTr: "Ürdün Dinarı", decimals: 3, displayOrder: 70 },
  { code: "KMF", symbol: "CF", nameAr: "فرنك قمري", nameEn: "Comorian Franc", nameTr: "Komor Frangı", decimals: 0, displayOrder: 80 },
  { code: "KWD", symbol: "د.ك", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", nameTr: "Kuveyt Dinarı", decimals: 3, displayOrder: 90 },
  { code: "LBP", symbol: "ل.ل", nameAr: "ليرة لبنانية", nameEn: "Lebanese Pound", nameTr: "Lübnan Lirası", decimals: 2, displayOrder: 100 },
  { code: "LYD", symbol: "د.ل", nameAr: "دينار ليبي", nameEn: "Libyan Dinar", nameTr: "Libya Dinarı", decimals: 3, displayOrder: 110 },
  { code: "MAD", symbol: "د.م", nameAr: "درهم مغربي", nameEn: "Moroccan Dirham", nameTr: "Fas Dirhemi", decimals: 2, displayOrder: 120 },
  { code: "MRU", symbol: "أ.م", nameAr: "أوقية موريتانية", nameEn: "Mauritanian Ouguiya", nameTr: "Moritanya Ugiyası", decimals: 2, displayOrder: 130 },
  { code: "OMR", symbol: "ر.ع", nameAr: "ريال عماني", nameEn: "Omani Rial", nameTr: "Umman Riyali", decimals: 3, displayOrder: 140 },
  { code: "QAR", symbol: "ر.ق", nameAr: "ريال قطري", nameEn: "Qatari Riyal", nameTr: "Katar Riyali", decimals: 2, displayOrder: 150 },
  { code: "SAR", symbol: "ر.س", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", nameTr: "Suudi Riyali", decimals: 2, displayOrder: 160 },
  { code: "SDG", symbol: "ج.س", nameAr: "جنيه سوداني", nameEn: "Sudanese Pound", nameTr: "Sudan Lirası", decimals: 2, displayOrder: 170 },
  { code: "SOS", symbol: "S", nameAr: "شلن صومالي", nameEn: "Somali Shilling", nameTr: "Somali Şilini", decimals: 2, displayOrder: 180 },
  { code: "SYP", symbol: "ل.س", nameAr: "ليرة سورية", nameEn: "Syrian Pound", nameTr: "Suriye Lirası", decimals: 2, displayOrder: 190 },
  { code: "TND", symbol: "د.ت", nameAr: "دينار تونسي", nameEn: "Tunisian Dinar", nameTr: "Tunus Dinarı", decimals: 3, displayOrder: 200 },
  { code: "YER", symbol: "ر.ي", nameAr: "ريال يمني", nameEn: "Yemeni Rial", nameTr: "Yemen Riyali", decimals: 2, displayOrder: 210 },
  { code: "TRY", symbol: "₺", nameAr: "ليرة تركية", nameEn: "Turkish Lira", nameTr: "Türk Lirası", decimals: 2, displayOrder: 220 },
  { code: "USD", symbol: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", nameTr: "ABD Doları", decimals: 2, displayOrder: 230 },
  { code: "EUR", symbol: "€", nameAr: "يورو", nameEn: "Euro", nameTr: "Euro", decimals: 2, displayOrder: 240 },
]);

export const ACTIVE_CURRENCY_CODES: readonly CurrencyCode[] = Object.freeze(
  CURRENCY_REGISTRY.map((currency) => currency.code),
);

const BY_CODE = new Map<string, CurrencyDefinition>(
  CURRENCY_REGISTRY.map((currency) => [currency.code, currency]),
);

export function isSupportedCurrency(code: string | null | undefined): code is CurrencyCode {
  if (!code) return false;
  return BY_CODE.has(code.trim().toUpperCase());
}

export function getCurrency(code: string | null | undefined): CurrencyDefinition | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.trim().toUpperCase());
}

/**
 * Canonical monetary contract. A bare number is never a price: an amount only
 * has meaning together with the currency it was entered in.
 */
export type MonetaryAmount = {
  readonly amount: number;
  readonly currencyCode: CurrencyCode;
};

export class UnsupportedCurrencyError extends Error {
  readonly currencyCode: string;

  constructor(code: string) {
    super(`Unsupported currency code: ${code}`);
    this.name = "UnsupportedCurrencyError";
    this.currencyCode = code;
  }
}

/**
 * Builds a MonetaryAmount, refusing anything the registry does not know.
 * The result is frozen: formatting or display code cannot strip the currency
 * off the underlying data.
 */
export function money(amount: number, currencyCode: string): MonetaryAmount {
  const currency = getCurrency(currencyCode);
  if (!currency) throw new UnsupportedCurrencyError(String(currencyCode));
  if (!Number.isFinite(amount)) throw new TypeError(`Amount must be a finite number, received: ${amount}`);
  return Object.freeze({ amount, currencyCode: currency.code });
}

export type MoneyParts = {
  /** The number, localised. Never meaningful on its own. */
  readonly formatted: string;
  readonly symbol: string;
  readonly currencyCode: CurrencyCode;
};

/**
 * Formats for display in the ORIGINAL listing currency. Never converts.
 *
 * Returns the parts separately so no caller can render an amount that has lost
 * its currency identity.
 */
export function formatMoneyParts(value: MonetaryAmount, locale = "ar"): MoneyParts {
  const currency = getCurrency(value.currencyCode);
  if (!currency) throw new UnsupportedCurrencyError(value.currencyCode);
  return Object.freeze({
    formatted: value.amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: currency.decimals,
    }),
    symbol: currency.symbol,
    currencyCode: currency.code,
  });
}

/**
 * Convenience string form. Always carries the currency with the number — an
 * amount is never rendered bare.
 */
export function formatMoney(value: MonetaryAmount, locale = "ar"): string {
  const parts = formatMoneyParts(value, locale);
  return `${parts.formatted} ${parts.symbol}`;
}

/**
 * Two amounts are only numerically comparable when they carry the same
 * currency. With no FX layer in the platform, comparing raw numbers across
 * currencies is meaningless and must never be done silently.
 */
export function isComparable(a: MonetaryAmount, b: MonetaryAmount): boolean {
  return a.currencyCode === b.currencyCode;
}

/**
 * Price-range filtering guard.
 *
 * A currency selected in a search form filters to listings already priced in
 * that currency. A min/max numeric filter is only semantically valid within a
 * single currency; with no FX layer, applying it across currencies would be
 * comparing unlike units, so this returns false instead.
 */
export function isPriceFilterApplicable(
  filterCurrency: string | null | undefined,
  listingCurrency: string | null | undefined,
): boolean {
  const filter = getCurrency(filterCurrency);
  const listing = getCurrency(listingCurrency);
  if (!filter || !listing) return false;
  return filter.code === listing.code;
}
