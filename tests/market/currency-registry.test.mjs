// L1A — canonical currency registry behaviour.
import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CURRENCY_CODES,
  CURRENCY_REGISTRY,
  UnsupportedCurrencyError,
  formatMoney,
  formatMoneyParts,
  getCurrency,
  isComparable,
  isPriceFilterApplicable,
  isSupportedCurrency,
  money,
} from "../../lib/market/currency-registry.ts";

const REQUIRED = [
  "AED", "BHD", "DZD", "DJF", "EGP", "ILS", "IQD", "JOD", "KMF", "KWD",
  "LBP", "LYD", "MAD", "MRU", "OMR", "QAR", "SAR", "SDG", "SOS", "SYP",
  "TND", "YER", "TRY", "USD", "EUR",
];

test("B — registry contains every required currency code", () => {
  for (const code of REQUIRED) {
    assert.ok(ACTIVE_CURRENCY_CODES.includes(code), `missing currency: ${code}`);
  }
  assert.equal(ACTIVE_CURRENCY_CODES.length, REQUIRED.length);
  assert.equal(new Set(ACTIVE_CURRENCY_CODES).size, ACTIVE_CURRENCY_CODES.length);
});

test("B — every registry entry is fully populated for ar/en/tr", () => {
  for (const currency of CURRENCY_REGISTRY) {
    assert.ok(currency.symbol.length > 0, `${currency.code} has no symbol`);
    assert.ok(currency.nameAr.length > 0, `${currency.code} has no Arabic name`);
    assert.ok(currency.nameEn.length > 0, `${currency.code} has no English name`);
    assert.ok(currency.nameTr.length > 0, `${currency.code} has no Turkish name`);
    assert.ok([0, 2, 3].includes(currency.decimals), `${currency.code} has bad decimals`);
  }
});

test("C — the registry module exposes no platform-wide default currency", async () => {
  const mod = await import("../../lib/market/currency-registry.ts");
  const exported = Object.keys(mod);
  for (const name of exported) {
    assert.ok(
      !/^DEFAULT_/.test(name) && !/DEFAULT_CURRENCY/.test(name),
      `registry must not export a global default (${name})`,
    );
  }
  // and no entry claims to be "the" default
  for (const currency of CURRENCY_REGISTRY) {
    assert.equal("isDefault" in currency, false, `${currency.code} carries an isDefault flag`);
  }
});

test("F — the L1A currency path exposes no FX conversion at all", async () => {
  const mod = await import("../../lib/market/currency-registry.ts");
  for (const name of Object.keys(mod)) {
    assert.ok(
      !/convert|exchange|fx|rate/i.test(name),
      `L1A currency module must not expose conversion API: ${name}`,
    );
  }
});

test("F — a price keeps its own currency; nothing is converted", () => {
  const syrianListing = money(120000, "USD");
  assert.deepEqual(syrianListing, { amount: 120000, currencyCode: "USD" });
  assert.equal(formatMoney(syrianListing, "en"), "120,000 $");

  // The same property could equally be listed in SYP or EUR.
  assert.equal(money(120000, "SYP").currencyCode, "SYP");
  assert.equal(money(120000, "EUR").currencyCode, "EUR");
});

test("F — cross-currency amounts are never treated as comparable numbers", () => {
  const usd = money(100, "USD");
  const syp = money(100, "SYP");
  assert.equal(isComparable(usd, syp), false);
  assert.equal(isComparable(usd, money(250, "USD")), true);

  assert.equal(isPriceFilterApplicable("USD", "SYP"), false);
  assert.equal(isPriceFilterApplicable("USD", "USD"), true);
  assert.equal(isPriceFilterApplicable("USD", null), false);
});

test("registry rejects unknown currencies instead of silently defaulting", () => {
  assert.equal(isSupportedCurrency("XXX"), false);
  assert.equal(isSupportedCurrency(null), false);
  assert.equal(getCurrency("xxx"), undefined);
  assert.throws(() => money(10, "XXX"), UnsupportedCurrencyError);
});

test("currency lookup is case and whitespace tolerant", () => {
  assert.equal(getCurrency(" try ")?.code, "TRY");
  assert.equal(money(5, "usd").currencyCode, "USD");
});

/* --- Correction H: a formatter may never erase currency identity ---------- */

test("H — a MonetaryAmount is frozen; display code cannot strip its currency", () => {
  const price = money(120000, "USD");
  assert.equal(Object.isFrozen(price), true);
  assert.throws(() => {
    "use strict";
    delete price.currencyCode;
  });
  formatMoney(price, "en");
  assert.deepEqual({ ...price }, { amount: 120000, currencyCode: "USD" });
});

test("H — formatMoneyParts keeps the currency code alongside the number", () => {
  const parts = formatMoneyParts(money(120000, "USD"), "en");
  assert.equal(parts.formatted, "120,000");
  assert.equal(parts.currencyCode, "USD");
  assert.equal(parts.symbol, "$");
  assert.equal(Object.isFrozen(parts), true);
});

test("H — no formatted output is ever a bare number", () => {
  for (const code of ACTIVE_CURRENCY_CODES) {
    const rendered = formatMoney(money(1234, code), "en");
    assert.equal(/^[\d.,\s]+$/.test(rendered), false, `${code} rendered without a currency marker`);
    assert.ok(rendered.includes(getCurrency(code).symbol));
  }
});

test("D — the publisher's currency survives every filter change (no conversion)", () => {
  // A Syrian listing entered as 120000 USD stays 120000 USD no matter what a
  // visitor selects. Selecting EUR only filters; it does not convert.
  const listing = money(120000, "USD");
  for (const visitorFilter of ["EUR", "SYP", "TRY", "USD"]) {
    assert.equal(listing.amount, 120000);
    assert.equal(listing.currencyCode, "USD");
    assert.equal(
      isPriceFilterApplicable(visitorFilter, listing.currencyCode),
      visitorFilter === "USD",
      `filter ${visitorFilter} against a USD listing`,
    );
  }
});

test("owner correction — ILS is an active pricing currency (25 total)", () => {
  assert.equal(ACTIVE_CURRENCY_CODES.length, 25);
  assert.ok(ACTIVE_CURRENCY_CODES.includes("ILS"));
  const ils = getCurrency("ILS");
  assert.equal(ils.symbol, "₪");
  assert.equal(ils.decimals, 2);
  // and it behaves like every other pricing currency — no FX involved
  const listing = money(950000, "ILS");
  assert.equal(listing.currencyCode, "ILS");
  assert.equal(formatMoney(listing, "en").includes("₪"), true);
  assert.equal(isPriceFilterApplicable("ILS", "ILS"), true);
  assert.equal(isPriceFilterApplicable("ILS", "USD"), false);
});
