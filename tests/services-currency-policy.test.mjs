// AkarProMax L1C-0.5A — Services currency policy.
//
// Binding rule: no global currency default, no OMR fallback, no SAR fallback,
// no automatic substitution, no FX, no country inference. The requester or
// publisher chooses the currency; amount + currency code travel together and
// the code is validated against the single canonical registry.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { permissionsForSessionRole, mapSessionRole } from "../lib/auth/identity-map.ts";
import { SERVICE_ERROR_CODES } from "../lib/services/constants.ts";
import {
  ServicesCurrencyError,
  requireCurrencyCode,
  resolveCurrencyCode,
} from "../lib/services/currency-policy.ts";
import { ACTIVE_CURRENCY_CODES } from "../lib/market/currency-registry.ts";
import { createRequestFull, getRequestFull } from "../lib/services/marketplace.ts";
import { POST as createRequestRoute } from "../app/api/service-requests/route.ts";

const CUSTOMER = "customer@example.com";

/** Exercised codes. OMR is one of many here, never a default. */
const CURRENCY_CASES = ["ILS", "SAR", "USD", "TRY", "OMR"];

function signIn(email = CUSTOMER, sessionRole = "user") {
  setSessionIdentityResolverForTests(async () => ({
    authenticated: true,
    email,
    displayName: email,
    role: mapSessionRole(sessionRole),
    countryCode: null,
    permissions: permissionsForSessionRole(sessionRole),
  }));
}

const post = (body) =>
  new Request("http://localhost/api/service-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const baseBody = (overrides = {}) => ({
  categoryId: "cat-1",
  countryCode: "OM",
  cityId: "muscat",
  title: "طلب",
  ...overrides,
});

const domainInput = (overrides = {}) => ({
  customerUserId: CUSTOMER,
  categoryId: "cat-1",
  countryCode: "OM",
  cityId: "muscat",
  title: "طلب",
  ...overrides,
});

test.beforeEach(() => {
  setServicesDbForTesting(createInMemoryDb());
});

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

/* ---------- the policy helper itself ---------- */
test("the currency policy validates against the canonical registry and owns no list of its own", () => {
  for (const code of ACTIVE_CURRENCY_CODES) {
    assert.equal(requireCurrencyCode(code), code, `${code} must be accepted`);
  }
  assert.equal(ACTIVE_CURRENCY_CODES.length, 25, "the canonical registry is the 25-code list");
  assert.ok(ACTIVE_CURRENCY_CODES.includes("ILS"), "ILS is an active pricing currency");

  // normalisation, not substitution
  assert.equal(requireCurrencyCode(" ils "), "ILS");
  assert.equal(requireCurrencyCode("sar"), "SAR");

  for (const missing of [undefined, null, "", "   ", 42, {}]) {
    const resolved = resolveCurrencyCode(missing);
    assert.equal(resolved.ok, false);
    assert.equal(resolved.error, SERVICE_ERROR_CODES.CURRENCY_REQUIRED);
  }
  for (const unsupported of ["XYZ", "BTC", "GBP", "OM", "$"]) {
    const resolved = resolveCurrencyCode(unsupported);
    assert.equal(resolved.ok, false);
    assert.equal(resolved.error, SERVICE_ERROR_CODES.CURRENCY_UNSUPPORTED);
  }
});

/* ---------- domain layer: never invents a currency ---------- */
test("the domain refuses to write a monetary row without an explicit valid currency", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());

  await assert.rejects(
    () => createRequestFull(domainInput()),
    (error) => {
      assert.ok(error instanceof ServicesCurrencyError);
      assert.equal(error.code, SERVICE_ERROR_CODES.CURRENCY_REQUIRED);
      return true;
    },
    "a missing currency must throw, not default to OMR",
  );

  await assert.rejects(
    () => createRequestFull(domainInput({ currency: "XYZ" })),
    (error) => {
      assert.ok(error instanceof ServicesCurrencyError);
      assert.equal(error.code, SERVICE_ERROR_CODES.CURRENCY_UNSUPPORTED);
      return true;
    },
    "an unknown currency must throw, not be substituted",
  );

  assert.equal(db.dump("service_requests").length, 0, "a refused write must leave no row");
  assert.equal(db.dump("service_request_status_history").length, 0);
});

test("every chosen currency is stored exactly, and OMR is never inferred", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());

  for (const code of CURRENCY_CASES) {
    const id = await createRequestFull(domainInput({ currency: code, title: `طلب ${code}` }));
    assert.equal((await getRequestFull(id)).currency, code, `${code} must persist unchanged`);
  }

  const stored = db.dump("service_requests").map((row) => row.currency).sort();
  assert.deepEqual(stored, [...CURRENCY_CASES].sort());
  assert.equal(stored.filter((code) => code === "OMR").length, 1, "OMR only where it was explicitly chosen");
});

/* ---------- route boundary: deterministic 400, never 500 ---------- */
test("POST /api/service-requests answers 400 for a missing currency and writes nothing", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  signIn();

  const response = await createRequestRoute(post(baseBody()));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, SERVICE_ERROR_CODES.CURRENCY_REQUIRED);
  assert.equal(db.dump("service_requests").length, 0);
});

test("POST /api/service-requests answers 400 for an unsupported currency and writes nothing", async () => {
  const db = setServicesDbForTesting(createInMemoryDb());
  signIn();

  const response = await createRequestRoute(post(baseBody({ currency: "BTC" })));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, SERVICE_ERROR_CODES.CURRENCY_UNSUPPORTED);
  assert.equal(db.dump("service_requests").length, 0);
});

test("POST /api/service-requests preserves the chosen currency exactly", async () => {
  signIn();

  for (const code of ["ILS", "SAR", "USD", "TRY"]) {
    const response = await createRequestRoute(post(baseBody({ currency: code, title: `طلب ${code}` })));
    assert.equal(response.status, 201, `${code} must be accepted`);
    const { id } = await response.json();
    assert.equal((await getRequestFull(id)).currency, code);
  }
});

/* ---------- no Services-owned currency list ---------- */
test("the Services domain declares no currency list of its own", async () => {
  const { readFile } = await import("node:fs/promises");
  const policy = await readFile(new URL("../lib/services/currency-policy.ts", import.meta.url), "utf8");
  assert.match(policy, /from "@\/lib\/market\/currency-registry"/);
  assert.doesNotMatch(policy, /"AED"|"SAR"|"USD"|"ILS"/, "the policy must not enumerate currency codes");

  for (const file of ["marketplace.ts", "core.ts"]) {
    const source = await readFile(new URL(`../lib/services/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\?\?\s*"OMR"|\|\|\s*"OMR"/, `${file} must not fall back to OMR`);
    assert.doesNotMatch(source, /\?\?\s*"SAR"|\|\|\s*"SAR"/, `${file} must not fall back to SAR`);
  }
});
