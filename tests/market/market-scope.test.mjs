// L1A — pure market-scope resolution contract.
//
// Covers closeout items A–N. This exercises the DECISION CONTRACT only; no
// browser, GPS or IP infrastructure exists or is implemented here.
import assert from "node:assert/strict";
import test from "node:test";

import {
  GLOBAL_MARKET,
  GLOBAL_SCOPE,
  MARKET_SOURCE_PRECEDENCE,
  PLATFORM_SCOPE,
  countryScope,
  createPreferences,
  isGlobalScope,
  marketCountryFilter,
  parseMarketScope,
  resolveActiveMarket,
  selectCurrency,
  selectLocale,
  selectMarket,
  serializeMarketScope,
} from "../../lib/market/market-scope.ts";
import { isPriceFilterApplicable, money } from "../../lib/market/currency-registry.ts";

test("platform scope is global and is not a country", () => {
  assert.equal(PLATFORM_SCOPE, "GLOBAL");
  assert.equal(isGlobalScope(GLOBAL_SCOPE), true);
});

test("the declared precedence order is manual > account > browser > gps > ip > fallback", () => {
  assert.deepEqual([...MARKET_SOURCE_PRECEDENCE], [
    "manual",
    "account",
    "browser",
    "gps",
    "ip",
    "fallback",
  ]);
});

/* ---------------------------------------------------------------- A – H --- */

test("A — a manual country beats account, browser, gps and ip", () => {
  const resolved = resolveActiveMarket({
    manual: "SY",
    account: "SA",
    browser: "EG",
    gps: "TR",
    ip: "AE",
  });
  assert.equal(resolved.source, "manual");
  assert.equal(resolved.scope.kind, "country");
  assert.equal(resolved.scope.countryCode, "SY");
});

test("A — a manual choice is never silently overwritten, even by unanimous others", () => {
  const resolved = resolveActiveMarket({ manual: "SY", account: "OM", browser: "OM", gps: "OM", ip: "OM" });
  assert.equal(resolved.scope.countryCode, "SY");
  assert.equal(resolved.source, "manual");
});

test("B — an explicit manual GLOBAL beats every lower signal", () => {
  const resolved = resolveActiveMarket({
    manual: "GLOBAL",
    account: "SA",
    browser: "EG",
    gps: "TR",
    ip: "OM",
  });
  assert.equal(resolved.source, "manual");
  assert.equal(resolved.scope.kind, "global");
  assert.equal(marketCountryFilter(resolved.scope), null);
});

test("B — manual GLOBAL is accepted in any casing and with surrounding space", () => {
  for (const value of ["GLOBAL", "global", " Global "]) {
    const resolved = resolveActiveMarket({ manual: value, ip: "OM" });
    assert.equal(resolved.scope.kind, "global", `manual=${JSON.stringify(value)}`);
    assert.equal(resolved.source, "manual");
  }
});

test("C — an invalid manual value is skipped and a valid account value wins", () => {
  for (const bogus of ["", "   ", "XX", "ZZZ", "Oman", "SAU", null]) {
    const resolved = resolveActiveMarket({ manual: bogus, account: "SA", ip: "OM" });
    assert.equal(resolved.source, "account", `manual=${JSON.stringify(bogus)}`);
    assert.equal(resolved.scope.countryCode, "SA");
  }
});

test("C — an invalid manual value does not collapse the result to GLOBAL", () => {
  const resolved = resolveActiveMarket({ manual: "XX", ip: "AE" });
  assert.equal(resolved.scope.kind, "country");
  assert.equal(resolved.scope.countryCode, "AE");
  assert.equal(resolved.source, "ip");
});

test("D — account beats browser, gps and ip", () => {
  const resolved = resolveActiveMarket({ account: "SA", browser: "EG", gps: "TR", ip: "AE" });
  assert.equal(resolved.source, "account");
  assert.equal(resolved.scope.countryCode, "SA");
});

test("E — browser beats gps and ip", () => {
  const resolved = resolveActiveMarket({ browser: "EG", gps: "TR", ip: "AE" });
  assert.equal(resolved.source, "browser");
  assert.equal(resolved.scope.countryCode, "EG");
});

test("F — gps beats ip", () => {
  const resolved = resolveActiveMarket({ gps: "TR", ip: "AE" });
  assert.equal(resolved.source, "gps");
  assert.equal(resolved.scope.countryCode, "TR");
});

test("G — ip is used only when every stronger signal is absent or invalid", () => {
  const only = resolveActiveMarket({ ip: "AE" });
  assert.equal(only.source, "ip");
  assert.equal(only.scope.countryCode, "AE");

  const withJunkAbove = resolveActiveMarket({ manual: "", account: null, browser: "  ", gps: "ZZ", ip: "AE" });
  assert.equal(withJunkAbove.source, "ip");
  assert.equal(withJunkAbove.scope.countryCode, "AE");

  const outrankedByGps = resolveActiveMarket({ gps: "TR", ip: "AE" });
  assert.notEqual(outrankedByGps.source, "ip");
});

test("H — with no valid signal at all the result is the GLOBAL fallback", () => {
  for (const signals of [{}, { manual: null }, { ip: "XX" }, { account: "", browser: "  ", gps: "ZZZ", ip: null }]) {
    const resolved = resolveActiveMarket(signals);
    assert.equal(resolved.source, "fallback", JSON.stringify(signals));
    assert.equal(resolved.scope.kind, "global");
    assert.equal(marketCountryFilter(resolved.scope), null);
  }
});

test("H — the fallback is GLOBAL, never Oman or any other implicit country", () => {
  const resolved = resolveActiveMarket({});
  assert.equal(resolved.scope.kind, "global");
  assert.equal("countryCode" in resolved.scope, false);
});

/* ---------------------------------------------------------------- I – J --- */

test("I — GLOBAL serialises and parses back to the same state", () => {
  assert.equal(serializeMarketScope(GLOBAL_SCOPE), GLOBAL_MARKET);
  assert.equal(parseMarketScope(serializeMarketScope(GLOBAL_SCOPE)).kind, "global");

  const sa = countryScope("SA");
  assert.equal(serializeMarketScope(sa), "SA");
  assert.equal(parseMarketScope(serializeMarketScope(sa)).countryCode, "SA");
});

test("I — parsing is tolerant of casing but never invents a country", () => {
  assert.equal(parseMarketScope("sa").countryCode, "SA");
  assert.equal(parseMarketScope("global").kind, "global");
  for (const junk of [null, undefined, "", "   ", "XX", "ZZZ", "Oman"]) {
    assert.equal(parseMarketScope(junk).kind, "global", `${String(junk)} should be global`);
  }
});

test("J — GLOBAL produces a null DB country filter; a country produces its code", () => {
  assert.equal(marketCountryFilter(GLOBAL_SCOPE), null);
  assert.equal(marketCountryFilter(parseMarketScope("GLOBAL")), null);
  assert.equal(marketCountryFilter(countryScope("SA")), "SA");
  assert.equal(marketCountryFilter(countryScope("tr")), "TR");
});

test("J — GLOBAL can never become a country scope object", () => {
  assert.throws(() => countryScope("GLOBAL"));
  assert.throws(() => countryScope("ALL"));
  assert.throws(() => countryScope("XX"));
});

/* ---------------------------------------------------------------- K – N --- */

test("K — changing the market does not change the selected currency (SA -> SY keeps USD)", () => {
  let prefs = createPreferences({ scope: countryScope("SA"), currencyCode: "USD", locale: "ar" });
  prefs = selectMarket(prefs, countryScope("SY"));
  assert.equal(prefs.scope.countryCode, "SY");
  assert.equal(prefs.currencyCode, "USD");
  assert.equal(prefs.locale, "ar");

  prefs = selectMarket(prefs, GLOBAL_SCOPE);
  assert.equal(prefs.scope.kind, "global");
  assert.equal(prefs.currencyCode, "USD");
});

test("K — selecting a market never auto-assigns that country's currency", () => {
  assert.equal(createPreferences({ scope: countryScope("OM") }).currencyCode, null);
  const started = createPreferences({ scope: countryScope("SA"), currencyCode: "EUR" });
  assert.equal(selectMarket(started, countryScope("OM")).currencyCode, "EUR");
});

test("L — changing the currency does not change the market (USD -> EUR keeps SY)", () => {
  let prefs = createPreferences({ scope: countryScope("SY"), currencyCode: "USD" });
  prefs = selectCurrency(prefs, "EUR");
  assert.equal(prefs.currencyCode, "EUR");
  assert.equal(prefs.scope.countryCode, "SY");

  prefs = selectCurrency(prefs, "TRY");
  assert.equal(prefs.scope.countryCode, "SY");
});

test("L — language is independent of both market and currency", () => {
  let prefs = createPreferences({ scope: countryScope("TR"), currencyCode: "TRY", locale: "tr" });
  prefs = selectLocale(prefs, "en");
  assert.equal(prefs.locale, "en");
  assert.equal(prefs.scope.countryCode, "TR");
  assert.equal(prefs.currencyCode, "TRY");
});

test("M — an unsupported currency is rejected, not silently defaulted", () => {
  const prefs = createPreferences({ scope: GLOBAL_SCOPE });
  for (const bad of ["XXX", "GBP", "JPY", "", "usdollar"]) {
    assert.throws(() => selectCurrency(prefs, bad), `${bad} should be rejected`);
  }
  assert.equal(createPreferences({ currencyCode: "XXX" }).currencyCode, null);
  assert.equal(selectCurrency(prefs, "usd").currencyCode, "USD");
});

test("N — the currency preference is a FILTER only; no conversion ever occurs", () => {
  // A Syrian listing published as 120000 USD.
  const listing = money(120000, "USD");

  let prefs = createPreferences({ scope: countryScope("SY"), currencyCode: "EUR" });
  assert.equal(isPriceFilterApplicable(prefs.currencyCode, listing.currencyCode), false);
  assert.equal(listing.amount, 120000);
  assert.equal(listing.currencyCode, "USD");

  prefs = selectCurrency(prefs, "USD");
  assert.equal(isPriceFilterApplicable(prefs.currencyCode, listing.currencyCode), true);
  assert.equal(listing.amount, 120000, "the listing amount must never be recomputed");
  assert.equal(listing.currencyCode, "USD");
});

test("N — the preference module exposes no conversion surface", async () => {
  const mod = await import("../../lib/market/market-scope.ts");
  for (const name of Object.keys(mod)) {
    assert.equal(
      /convert|exchange|\bfx\b|rate/i.test(name),
      false,
      `market-scope must not expose conversion API: ${name}`,
    );
  }
});

test("preference objects are immutable snapshots", () => {
  const prefs = createPreferences({ scope: countryScope("SA"), currencyCode: "SAR" });
  assert.equal(Object.isFrozen(prefs), true);
  const next = selectMarket(prefs, countryScope("TR"));
  assert.notEqual(next, prefs);
  assert.equal(prefs.scope.countryCode, "SA", "the original preference must not mutate");
});

test("owner correction — ILS is selectable and stays independent of the market", () => {
  let prefs = createPreferences({ scope: countryScope("PS"), currencyCode: "USD" });
  prefs = selectCurrency(prefs, "ILS");
  assert.equal(prefs.currencyCode, "ILS");
  assert.equal(prefs.scope.countryCode, "PS", "currency change must not move the market");

  // market change keeps ILS; selecting PS never auto-assigns any currency
  prefs = selectMarket(prefs, countryScope("JO"));
  assert.equal(prefs.currencyCode, "ILS");
  assert.equal(createPreferences({ scope: countryScope("PS") }).currencyCode, null);
  assert.equal(createPreferences({ currencyCode: "ILS" }).currencyCode, "ILS");
});
