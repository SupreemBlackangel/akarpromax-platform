// AkarProMax L1C-0.5A-R1 — the offer form obeys the platform currency rule.
//
// Binding rule: no OMR preselection, no Services-owned currency list, the whole
// canonical active registry (ILS included) available, nothing selected until the
// provider chooses, and currency required before a monetary offer is submitted.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { ACTIVE_CURRENCY_CODES, CURRENCY_REGISTRY } from "../lib/market/currency-registry.ts";

const OFFER_PAGE = new URL("../app/service-requests/[id]/offer/page.tsx", import.meta.url);
const source = await readFile(OFFER_PAGE, "utf8");

test("the offer form consumes the canonical currency registry", () => {
  assert.match(source, /import \{ CURRENCY_REGISTRY \} from "@\/lib\/market\/currency-registry"/);
  assert.match(source, /CURRENCY_REGISTRY\.map\(/, "the options must be rendered from the registry");
});

test("the offer form declares no currency list of its own", () => {
  // No registry code may appear as a literal anywhere in the page.
  const literals = ACTIVE_CURRENCY_CODES.filter((code) => new RegExp(`["'\`]${code}["'\`]`).test(source));
  assert.deepEqual(literals, [], `the page must not hardcode currency codes, found: ${literals.join(", ")}`);

  // The specific pre-R1 defect: a Services-specific OMR/SAR/AED/USD list.
  for (const code of ["OMR", "SAR", "AED", "USD"]) {
    assert.doesNotMatch(source, new RegExp(`<option value="${code}"`), `the ${code} option must be gone`);
  }
  assert.doesNotMatch(source, /\[\s*"[A-Z]{3}"\s*,/, "no local currency array may be declared");
});

test("no currency is preselected and no OMR default remains", () => {
  assert.doesNotMatch(source, /useState\("OMR"\)/, "the OMR default must be gone");
  assert.match(source, /const \[currency, setCurrency\] = useState\(""\)/, "currency starts unselected");
  assert.match(source, /<option value="" disabled>/, "an unselectable placeholder option must be present");
  // The price label must not assume the Omani rial either.
  assert.doesNotMatch(source, /السعر \(ر\.ع\)/, "the price label must not name one currency");
});

test("currency is required before a monetary offer can be submitted", () => {
  assert.match(source, /if \(!currency\) \{/, "submit must refuse an offer with no currency");
  assert.match(source, /offerCurrencyRequired/, "it must surface a currency-required message");
  assert.match(source, /required>/, "the select is marked required");
});

test("every active registry currency, including ILS, is offered to the provider", () => {
  assert.equal(ACTIVE_CURRENCY_CODES.length, 25, "the canonical registry is the 25-code list");
  assert.ok(ACTIVE_CURRENCY_CODES.includes("ILS"), "ILS must be available to providers");
  // The rendered option set is the registry itself, so availability follows it.
  assert.equal(CURRENCY_REGISTRY.length, ACTIVE_CURRENCY_CODES.length);
  assert.match(source, /entry\.code/, "each option carries the registry code");
});

test("the offer form adds no FX and no country inference", () => {
  assert.doesNotMatch(source, /exchange[_-]?rate|convert\(|fxRate/i, "no FX may appear in the offer form");
  assert.doesNotMatch(source, /country.*=>.*currency|currencyForCountry/i, "currency is never inferred from a country");
});
