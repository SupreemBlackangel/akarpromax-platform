// L1A — canonical country registry behaviour.
import assert from "node:assert/strict";
import test from "node:test";

import {
  COUNTRY_CODES,
  COUNTRY_REGISTRY,
  countryName,
  getCountry,
  isKnownCountry,
  normalizeCountryCode,
} from "../../lib/market/country-registry.ts";
import { ACTIVE_CURRENCY_CODES } from "../../lib/market/currency-registry.ts";

const REQUIRED = [
  "DZ", "BH", "KM", "DJ", "EG", "IQ", "JO", "KW", "LB", "LY", "MR", "MA",
  "OM", "PS", "QA", "SA", "SO", "SD", "SY", "TN", "AE", "YE", "TR",
];

test("A — registry contains every required country code, exactly once", () => {
  for (const code of REQUIRED) {
    assert.ok(COUNTRY_CODES.includes(code), `missing country: ${code}`);
  }
  assert.equal(COUNTRY_CODES.length, REQUIRED.length);
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length, "duplicate country code");
});

test("A — every country carries ar/en/tr names and an ISO alpha-2 code", () => {
  for (const country of COUNTRY_REGISTRY) {
    assert.match(country.code, /^[A-Z]{2}$/, `${country.code} is not ISO alpha-2 uppercase`);
    assert.ok(country.nameAr.length > 0, `${country.code} has no Arabic name`);
    assert.ok(country.nameEn.length > 0, `${country.code} has no English name`);
    assert.ok(country.nameTr.length > 0, `${country.code} has no Turkish name`);
    assert.match(country.phoneCode, /^\+\d+$/, `${country.code} has a bad phone code`);
  }
});

test("D — GLOBAL is not a country in the registry", () => {
  for (const bogus of ["GLOBAL", "ALL", "WORLD", "XX", "*", ""]) {
    assert.equal(COUNTRY_CODES.includes(bogus), false, `${bogus} must not be a country`);
    assert.equal(isKnownCountry(bogus), false, `${bogus} must not resolve to a country`);
  }
  assert.equal(normalizeCountryCode("GLOBAL"), null);
});

test("each country owns its own currency; there is no shared OMR default", () => {
  const currencies = COUNTRY_REGISTRY.map((country) => country.officialCurrencyCode);
  const omr = COUNTRY_REGISTRY.filter((c) => c.officialCurrencyCode === "OMR").map((c) => c.code);
  assert.deepEqual(omr, ["OM"], "OMR must belong to Oman only");

  assert.equal(getCountry("SA").officialCurrencyCode, "SAR");
  assert.equal(getCountry("TR").officialCurrencyCode, "TRY");
  assert.equal(getCountry("SY").officialCurrencyCode, "SYP");

  for (const code of currencies) {
    if (code === null) continue;
    assert.ok(ACTIVE_CURRENCY_CODES.includes(code), `${code} is not in the currency registry`);
  }
});

test("PS official-currency metadata is null; ILS pricing is a separate capability", () => {
  // No sovereign currency is fabricated for PS. Country official-currency
  // METADATA != allowed publisher PRICING currencies: ILS is active in the
  // pricing registry, so PS listings may be priced in ILS or any active code.
  assert.equal(getCountry("PS").officialCurrencyCode, null);
  assert.ok(ACTIVE_CURRENCY_CODES.includes("ILS"));
});

test("map centres are optional and never gate behaviour", () => {
  for (const country of COUNTRY_REGISTRY) {
    const lat = country.mapCenterLat;
    const lng = country.mapCenterLng;
    assert.ok(lat === null || (typeof lat === "number" && lat >= -90 && lat <= 90), `${country.code} lat`);
    assert.ok(lng === null || (typeof lng === "number" && lng >= -180 && lng <= 180), `${country.code} lng`);
    assert.equal(country.measurementSystem, "metric");
    assert.equal(country.publicationsEnabled, true);
  }
});

test("country codes normalise from any casing, and reject junk", () => {
  assert.equal(normalizeCountryCode("sa"), "SA");
  assert.equal(normalizeCountryCode(" Tr "), "TR");
  assert.equal(normalizeCountryCode("SAU"), null);
  assert.equal(normalizeCountryCode(null), null);
  assert.equal(getCountry("om").nameEn, "Oman");
});

test("adding a future locale needs no schema change", () => {
  const sa = getCountry("SA");
  assert.equal(countryName(sa, "ar"), "السعودية");
  assert.equal(countryName(sa, "en"), "Saudi Arabia");
  assert.equal(countryName(sa, "tr"), "Suudi Arabistan");
  // Unknown locale falls back to English via the overlay point, no new column.
  assert.equal(countryName(sa, "fr"), "Saudi Arabia");
  assert.equal(
    countryName({ ...sa, localizedNames: { fr: "Arabie saoudite" } }, "fr"),
    "Arabie saoudite",
  );
});
