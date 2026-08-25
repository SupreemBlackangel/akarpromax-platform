// L1A — the canonical Postgres geo schema must not carry an OMR default.
import assert from "node:assert/strict";
import test from "node:test";

import { countries } from "../../lib/db/schemas/geo-schema.ts";
import { currencies } from "../../lib/db/schemas/currency-schema.ts";

test("C — countries.currency_code has no column default at all", () => {
  const column = countries.currencyCode;
  assert.ok(column, "countries.currencyCode is missing from the schema");
  assert.equal(column.hasDefault, false, "currency_code must not declare a default");
  assert.equal(column.default, undefined, `currency_code default is ${String(column.default)}`);
});

test("C — no column anywhere in the geo schema defaults to a currency code", () => {
  const CURRENCY_LIKE = /^[A-Z]{3}$/;
  for (const [name, column] of Object.entries(countries)) {
    if (!column || typeof column !== "object" || !("default" in column)) continue;
    const value = column.default;
    if (typeof value !== "string") continue;
    assert.equal(
      CURRENCY_LIKE.test(value),
      false,
      `countries.${name} defaults to the currency-like value "${value}"`,
    );
  }
});

test("C — countries.code is the only country identity; there is no default country", () => {
  assert.equal(countries.code.hasDefault, false);
  assert.equal(countries.code.notNull, true);
});

test("the currencies table still exposes the registry columns the API reads", () => {
  for (const field of ["code", "symbol", "nameAr", "nameEn", "nameTr", "isActive"]) {
    assert.ok(currencies[field], `currencies.${field} is missing`);
  }
});
