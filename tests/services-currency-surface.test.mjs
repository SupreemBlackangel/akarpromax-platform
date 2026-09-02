// AkarProMax L1C-0.5B0 — the Services currency SURFACE obeys the platform rule.
//
// This tests the architectural rule, not four particular codes:
//   * no active Services surface may denominate an amount in a currency the
//     platform chose — no default, no fallback, no substitution;
//   * no Services file may declare a currency list of its own; the canonical
//     registry (lib/market/currency-registry.ts) is the only source;
//   * an amount whose currency is missing or unsupported is rendered as a
//     neutral marker, never as a bare number and never re-denominated;
//   * no FX, no country-to-currency inference.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ACTIVE_CURRENCY_CODES } from "../lib/market/currency-registry.ts";
import { formatMoney } from "../src/lib/services-client.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/** Every active Services surface that can render or send money. */
const SURFACE = [
  "src/lib/services-client.ts",
  "src/components/services/ServiceCards.tsx",
  "app/admin/services/admin-client.tsx",
  "app/services/page.tsx",
  "app/service-requests/[id]/offer/page.tsx",
  "app/service-requests/[id]/page.tsx",
  "app/dashboard/services/offers/page.tsx",
  "app/dashboard/services/offers/[id]/page.tsx",
  "app/dashboard/services/my-requests/page.tsx",
  "app/dashboard/services/matched-requests/page.tsx",
  "app/dashboard/services/jobs/[id]/page.tsx",
  "lib/services/currency-policy.ts",
  "lib/services/marketplace.ts",
  "lib/services/core.ts",
  "lib/services/compat/services-api.ts",
  "app/service-requests/new/page.tsx",
];

/**
 * M3 has landed in full.
 *
 * The client half came first: the wizard no longer hardcodes a currency, it
 * suggests one from the platform's country configuration and sends `null` when
 * the requester gave no budget. It is part of SURFACE now.
 *
 * The migration half followed on 2026-09-03. `service_requests.currency` had
 * kept `NOT NULL DEFAULT 'OMR'`, so the `null` the wizard sent was replaced by
 * the database with a currency the platform chose -- exactly what this file
 * exists to forbid, one layer down. Both the default and the NOT NULL are now
 * dropped, so a request with no budget carries no currency. The table was
 * empty, and the migration refused to run if it had not been.
 */
const MIGRATION_BOUND_EXCEPTIONS = [];

/** Currency symbols that name one currency in prose. */
const CURRENCY_SYMBOLS = ["ر.ع", "ر.س", "د.إ", "₪", "ج.م", "د.ك", "ر.ق"];

test("no active Services surface hardcodes a currency code", async () => {
  const offenders = [];
  for (const file of SURFACE) {
    const source = await read(file);
    for (const code of ACTIVE_CURRENCY_CODES) {
      if (new RegExp(`["'\`]${code}["'\`]`).test(source)) offenders.push(`${file}: "${code}"`);
    }
  }
  assert.deepEqual(offenders, [], `a Services surface may not name a currency; the registry is the only source:\n${offenders.join("\n")}`);
});

test("no active Services surface substitutes a currency with || or ??", async () => {
  const offenders = [];
  for (const file of SURFACE) {
    const source = await read(file);
    if (/currency\s*(\|\||\?\?)\s*["'`]/.test(source)) offenders.push(file);
    if (/=\s*["'`][A-Z]{3}["'`]\s*\)/.test(source)) offenders.push(`${file} (default parameter)`);
  }
  assert.deepEqual(offenders, [], "no fallback currency may appear on an active surface");
});

test("no active Services surface prints a single currency symbol in prose", async () => {
  const offenders = [];
  for (const file of SURFACE) {
    const source = await read(file);
    for (const symbol of CURRENCY_SYMBOLS) {
      if (source.includes(symbol)) offenders.push(`${file}: ${symbol}`);
    }
  }
  assert.deepEqual(offenders, [], "a label may not name one currency; the stored code is rendered instead");
});

test("no Services file declares a currency list of its own", async () => {
  const offenders = [];
  for (const file of SURFACE) {
    const source = await read(file);
    // two or more quoted three-letter upper-case tokens in a row = a code list
    if (/["'`][A-Z]{3}["'`]\s*,\s*["'`][A-Z]{3}["'`]/.test(source)) offenders.push(file);
    if (/(CURRENCIES|CURRENCY_CODES|ALLOWED_CURRENCIES)\s*[:=]/.test(source)) offenders.push(`${file} (named list)`);
  }
  assert.deepEqual(offenders, [], "the canonical registry is the only currency list");
});

test("formatMoney has no default currency and refuses to invent one", () => {
  // behavioural, not textual
  assert.equal(formatMoney(null, "SAR"), "—", "a null amount is not a price");
  assert.equal(formatMoney(120, null), "—", "an amount with no currency is not a price");
  assert.equal(formatMoney(120, ""), "—");
  assert.equal(formatMoney(120, "XYZ"), "—", "an unsupported code is never re-denominated");
  assert.equal(formatMoney(Number.NaN, "SAR"), "—");

  // a valid currency formats in ITS OWN code, with registry decimals
  assert.equal(formatMoney(1200, "SAR"), "1,200 SAR");
  assert.equal(formatMoney(1200, "ils"), "1,200 ILS", "codes normalise through the registry");
  assert.equal(formatMoney(1200.5, "OMR"), "1,200.5 OMR", "OMR is accepted like any other code, never assumed");
  for (const code of ACTIVE_CURRENCY_CODES) {
    assert.match(formatMoney(1, code), new RegExp(`${code}$`), `${code} must format in its own code`);
  }
});

test("formatMoney declares currency as a required parameter", async () => {
  const source = await read("src/lib/services-client.ts");
  assert.doesNotMatch(source, /formatMoney\([^)]*currency\s*=/, "currency must not have a default");
  assert.match(source, /formatMoney\(value: number \| null \| undefined, currency: string \| null \| undefined\)/);
  assert.match(source, /from "@\/lib\/market\/currency-registry"/);
});

test("service categories render no money, because they carry no currency", async () => {
  const source = await read("src/components/services/ServiceCards.tsx");
  assert.doesNotMatch(source, /Indicative price|سعر استرشادي/, "the indicative-price display must be gone");
  assert.doesNotMatch(source, /category\.price_min\)\.toLocaleString/, "a bare category amount must not be rendered");
  assert.match(source, /provider_count/, "non-monetary category metadata may remain");
  assert.doesNotMatch(source, /category\.currency/, "no category currency may be invented");
});

test("the admin Services surface marks bad currency data instead of substituting", async () => {
  const source = await read("app/admin/services/admin-client.tsx");
  assert.match(source, /function currencyLabel/, "a single labelling helper");
  assert.match(source, /عملة غير محددة/, "a neutral data-quality marker");
  assert.match(source, /ميزانية مفتوحة/, "open budgets stay open budgets");
  assert.match(source, /getCurrency\(/, "validated through the canonical registry");
});

test("the offer form still consumes the canonical registry", async () => {
  const source = await read("app/service-requests/[id]/offer/page.tsx");
  assert.match(source, /import \{ CURRENCY_REGISTRY \} from "@\/lib\/market\/currency-registry"/);
  assert.match(source, /CURRENCY_REGISTRY\.map\(/);
  assert.match(source, /useState\(""\)/, "nothing preselected");
});

test("no Services surface performs FX or infers a currency from a country", async () => {
  const offenders = [];
  for (const file of SURFACE) {
    const source = await read(file);
    if (/exchange[_-]?rate|fxRate|convertCurrency/i.test(source)) offenders.push(`${file} (FX)`);
    if (/currencyForCountry|countryToCurrency/i.test(source)) offenders.push(`${file} (inference)`);
  }
  assert.deepEqual(offenders, []);
});

test("the request wizard suggests a currency instead of imposing one", async () => {
  assert.deepEqual(MIGRATION_BOUND_EXCEPTIONS, [], "no Services file may hold a currency of its own any more");
  const wizard = await read("app/service-requests/new/page.tsx");

  // Suggested from the platform's country configuration, and only suggested:
  // the requester can change it, which is the whole point of the rule.
  assert.match(wizard, /countryConfig\?\.currencyCode/);
  // A request with no budget carries no currency, rather than being silently
  // denominated in one.
  assert.match(wizard, /currency: draft\.currency \|\| null/);

  const plan = await read("docs/refactor/L1C05B_SERVICES_MIGRATION_PLAN.md");
  assert.match(plan, /budget_min IS NULL AND budget_max IS NULL/, "the M3 decision must stay recorded");
});
