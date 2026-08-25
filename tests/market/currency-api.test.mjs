// L1A closeout — the canonical currency registry API must keep the capability
// the pre-L1A /api/currencies route had (list + ?code= + 404), without ever
// reintroducing FX, an exchange rate, or a default currency.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CURRENCY_PUBLIC_MESSAGES,
  resolveCurrencyRequest,
} from "../../lib/market/currency-api.ts";
import { ACTIVE_CURRENCY_CODES, CURRENCY_REGISTRY } from "../../lib/market/currency-registry.ts";

test("list — no code returns the full active registry", () => {
  const res = resolveCurrencyRequest();
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, CURRENCY_REGISTRY.length);
  assert.equal(res.body.data.length, ACTIVE_CURRENCY_CODES.length);
  assert.deepEqual([...res.body.codes], [...ACTIVE_CURRENCY_CODES]);
  for (const code of ACTIVE_CURRENCY_CODES) {
    assert.ok(res.body.data.some((c) => c.code === code), `missing ${code}`);
  }
});

test("list — an empty or whitespace code is treated as 'no code'", () => {
  for (const code of [null, undefined, "", "   "]) {
    const res = resolveCurrencyRequest({ code });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, CURRENCY_REGISTRY.length, `code=${JSON.stringify(code)}`);
  }
});

test("single — ?code=USD returns exactly one canonical currency object", () => {
  const res = resolveCurrencyRequest({ code: "USD" });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(Array.isArray(res.body.data), false, "a single lookup must not return an array");
  assert.equal(res.body.data.code, "USD");
  assert.equal(res.body.data.symbol, "$");
  assert.equal(res.body.data.nameEn, "US Dollar");
  assert.ok(res.body.data.nameAr.length > 0);
  assert.ok(res.body.data.nameTr.length > 0);
  assert.equal("count" in res.body, false);
});

test("single — lookup tolerates casing and surrounding whitespace", () => {
  assert.equal(resolveCurrencyRequest({ code: "usd" }).body.data.code, "USD");
  assert.equal(resolveCurrencyRequest({ code: " try " }).body.data.code, "TRY");
});

test("single — every registry code is retrievable one at a time", () => {
  for (const code of ACTIVE_CURRENCY_CODES) {
    const res = resolveCurrencyRequest({ code });
    assert.equal(res.status, 200, `${code} should resolve`);
    assert.equal(res.body.data.code, code);
  }
});

test("unknown — an unsupported code is a structured 404", () => {
  for (const code of ["XXX", "GBP", "JPY", "CHF", "1234"]) {
    const res = resolveCurrencyRequest({ code });
    assert.equal(res.status, 404, `${code} should be 404`);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, "CURRENCY_NOT_FOUND");
    assert.equal(res.body.message, CURRENCY_PUBLIC_MESSAGES.CURRENCY_NOT_FOUND.ar);
    assert.equal(res.body.messageEn, CURRENCY_PUBLIC_MESSAGES.CURRENCY_NOT_FOUND.en);
    assert.equal("data" in res.body, false, "a 404 must not carry a data payload");
  }
});

test("conversionSupported is false on every successful response", () => {
  assert.equal(resolveCurrencyRequest().body.conversionSupported, false);
  assert.equal(resolveCurrencyRequest({ code: "SAR" }).body.conversionSupported, false);
});

test("no response anywhere exposes an exchange rate or a default-currency flag", () => {
  const bodies = [
    resolveCurrencyRequest().body,
    resolveCurrencyRequest({ code: "OMR" }).body,
    resolveCurrencyRequest({ code: "XXX" }).body,
  ];
  for (const body of bodies) {
    const serialized = JSON.stringify(body);
    for (const forbidden of ["exchangeRate", "exchange_rate", "rate", "isDefault", "is_default", "toUSD"]) {
      assert.equal(
        serialized.toLowerCase().includes(forbidden.toLowerCase()),
        false,
        `payload exposed "${forbidden}": ${serialized.slice(0, 200)}`,
      );
    }
  }
});

test("no currency in the payload claims to be the platform default", () => {
  const { data } = resolveCurrencyRequest().body;
  for (const currency of data) {
    assert.equal("isDefault" in currency, false, `${currency.code} carries isDefault`);
    assert.deepEqual(
      Object.keys(currency).sort(),
      ["code", "decimals", "displayOrder", "nameAr", "nameEn", "nameTr", "symbol"],
      `${currency.code} payload shape drifted`,
    );
  }
});

test("the resolver module exposes no conversion surface", async () => {
  const mod = await import("../../lib/market/currency-api.ts");
  for (const name of Object.keys(mod)) {
    assert.equal(
      /convert|exchange|\bfx\b/i.test(name),
      false,
      `currency API must not expose conversion: ${name}`,
    );
  }
});

test("the resolver never throws, whatever it is handed", () => {
  for (const params of [undefined, {}, { code: null }, { code: "💥" }, { code: "a".repeat(500) }]) {
    const res = resolveCurrencyRequest(params);
    assert.ok(res.status === 200 || res.status === 404, `unexpected status for ${JSON.stringify(params)}`);
  }
});

test("owner correction — ?code=ILS resolves 200 with the canonical ILS object", () => {
  const res = resolveCurrencyRequest({ code: "ILS" });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.conversionSupported, false);
  assert.equal(res.body.data.code, "ILS");
  assert.equal(res.body.data.symbol, "₪");
  assert.ok(res.body.data.nameAr.length > 0);
});

test("owner correction — the active list is exactly 25 and includes ILS", () => {
  const res = resolveCurrencyRequest();
  assert.equal(res.body.count, 25);
  assert.ok(res.body.codes.includes("ILS"));
});
