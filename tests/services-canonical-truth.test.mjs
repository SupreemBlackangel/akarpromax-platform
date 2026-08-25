// AkarProMax L1C-0 — ONE Services Marketplace persistence truth.
//
// Behavioural tests (not grep tests): they drive the real domain services
// against the deterministic in-memory D1 adapter and assert that the
// compatibility generation (`/api/services*` -> lib/services/core.ts +
// lib/services/compat/services-api.ts) and the canonical generation
// (`/api/service-*` -> lib/services/marketplace.ts) read and write the SAME
// canonical `service_*` store.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { listCategories } from "../lib/services/core.ts";
import {
  countRequestsFull,
  createServiceCategory,
  getCategoryById,
  getRequestFull,
  getUserServiceAnalytics,
  listRequestsFull,
} from "../lib/services/marketplace.ts";
import {
  SERVICES_COMPAT_ERRORS,
  ServicesCompatValidationError,
  createLegacyServiceRequest,
  listLegacyServiceRequests,
} from "../lib/services/compat/services-api.ts";

const ACTOR = { userId: "customer@example.com", ip: "127.0.0.1" };

/** Columns only the deprecated Drizzle/pg services model would write. */
const DEPRECATED_ONLY_REQUEST_COLUMNS = ["user_id", "country", "governorate", "city", "district", "radius", "budget"];
/** Columns the canonical marketplace model always writes. */
const CANONICAL_REQUEST_COLUMNS = ["customer_user_id", "country_code", "city_id", "reference_number"];

function freshDb() {
  return setServicesDbForTesting(createInMemoryDb());
}

function baseRequest(overrides = {}) {
  return {
    categoryId: "cat-1",
    title: "تصليح مكيف",
    description: "المكيف لا يبرد",
    urgency: "urgent",
    country: "om",
    governorate: "مسقط",
    city: "muscat",
    district: "ruwi",
    budget: 120,
    currency: "SAR",
    ...overrides,
  };
}

test.afterEach(() => {
  setServicesDbForTesting(null);
});

/* A. SERVICE CATEGORY TRUTH */
test("A: one category store — a category written by the canonical marketplace service is read back by the compatibility generation", async () => {
  const db = freshDb();

  const id = await createServiceCategory(
    { countryCode: "OM", code: "ac-repair", nameAr: "إصلاح مكيفات", nameEn: "AC Repair", sortOrder: 3 },
    ACTOR,
  );

  // Canonical reader (lib/services/marketplace.ts).
  const canonical = await getCategoryById(id);
  assert.equal(canonical.code, "ac-repair");
  assert.equal(canonical.country_code, "OM");

  // Compatibility-generation reader (lib/services/core.ts — the layer behind the
  // /api/services* routes) sees the very same row.
  const compat = await listCategories("OM");
  assert.equal(compat.length, 1);
  assert.equal(compat[0].id, id);
  assert.equal(compat[0].code, "ac-repair");

  // Exactly one physical category store, in the canonical shape (the deprecated
  // Drizzle/pg model would have written a `slug` column instead).
  const rows = db.dump("service_categories");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, id);
  assert.ok(Object.prototype.hasOwnProperty.call(rows[0], "country_code"));
  assert.ok(!Object.prototype.hasOwnProperty.call(rows[0], "slug"));
});

/* B. SERVICE REQUEST TRUTH */
test("B: a request created through the /api/services compatibility path is visible through the canonical request path", async () => {
  freshDb();

  const created = await createLegacyServiceRequest("customer@example.com", baseRequest(), ACTOR);
  assert.ok(created?.id);

  const canonical = await getRequestFull(created.id);
  assert.ok(canonical, "canonical getRequestFull must find the compatibility-created request");
  assert.equal(canonical.customer_user_id, "customer@example.com");
  assert.equal(canonical.category_id, "cat-1");
  assert.equal(canonical.country_code, "OM");
  assert.equal(canonical.city_id, "muscat");
  assert.equal(canonical.district_id, "ruwi");
  assert.equal(canonical.title, "تصليح مكيف");
  assert.equal(canonical.budget_max, 120);
  // Legacy `governorate` round-trips through the canonical `short_address`.
  assert.equal(canonical.short_address, "مسقط");

  // The canonical list path sees it too.
  const listed = await listRequestsFull({ customerUserId: "customer@example.com" });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, created.id);

  // The canonical publish lifecycle ran, so the compatibility path did not
  // bypass the marketplace state machine.
  assert.equal(canonical.status, "published");
  assert.ok(canonical.published_at, "published_at must be stamped by the canonical publish flow");
});

/* E. NO DUPLICATE CREATION */
test("E: one compatibility create writes exactly one row, in the canonical store only", async () => {
  const db = freshDb();

  await createLegacyServiceRequest("customer@example.com", baseRequest(), ACTOR);

  const requests = db.dump("service_requests");
  assert.equal(requests.length, 1, "exactly one service request row must exist");

  const row = requests[0];
  for (const column of CANONICAL_REQUEST_COLUMNS) {
    assert.ok(Object.prototype.hasOwnProperty.call(row, column), `canonical column ${column} must be written`);
  }
  for (const column of DEPRECATED_ONLY_REQUEST_COLUMNS) {
    assert.ok(!Object.prototype.hasOwnProperty.call(row, column), `deprecated column ${column} must not be written`);
  }

  // Canonical side tables were used; no parallel provider/job store was touched.
  assert.equal(db.dump("service_request_status_history").length, 2, "draft + published history entries");
  assert.equal(db.dump("service_providers").length, 0, "deprecated service_providers table must stay empty");
  assert.equal(db.dump("service_jobs").length, 0, "deprecated service_jobs table must stay empty");
  assert.equal(db.dump("service_portfolio").length, 0, "deprecated service_portfolio table must stay empty");

  assert.equal(await countRequestsFull({}), 1);
});

/* D. RESPONSE COMPATIBILITY */
test("D: the /api/services response contract is preserved by the compatibility mapper", async () => {
  freshDb();

  await createLegacyServiceRequest("customer@example.com", baseRequest({ title: "غسيل خزان", budget: 40 }), ACTOR);
  await createLegacyServiceRequest(
    "other@example.com",
    baseRequest({ categoryId: "cat-2", title: "صيانة مصعد", budget: null }),
    ACTOR,
  );

  const page = await listLegacyServiceRequests({ page: 1, limit: 20 });
  assert.equal(page.page, 1);
  assert.equal(page.limit, 20);
  assert.equal(page.total, 2);
  assert.equal(page.data.length, 2);

  const item = page.data.find((entry) => entry.title === "غسيل خزان");
  assert.ok(item);
  // Historical camelCase contract.
  for (const key of ["id", "categoryId", "title", "description", "urgency", "country", "governorate", "city", "district", "budget", "currency", "status", "createdAt", "updatedAt"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(item, key), `legacy field ${key} must be present`);
  }
  assert.equal(item.categoryId, "cat-1");
  assert.equal(item.country, "OM");
  assert.equal(item.city, "muscat");
  assert.equal(item.governorate, "مسقط");
  assert.equal(item.budget, 40);
  assert.equal(item.currency, "SAR");
  assert.equal(item.status, "published");
  // Public listing does not leak the customer identity or exact coordinates.
  assert.equal(item.userId, null);
  assert.equal(item.latitude, null);
  assert.equal(item.longitude, null);

  // Category filter and title search still work, against canonical storage.
  const filtered = await listLegacyServiceRequests({ category: "cat-2" });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.data[0].title, "صيانة مصعد");

  const searched = await listLegacyServiceRequests({ search: "مصعد" });
  assert.equal(searched.total, 1);
  assert.equal(searched.data[0].categoryId, "cat-2");

  // Pagination is computed against the canonical store, not an in-memory window.
  const firstPage = await listLegacyServiceRequests({ page: 1, limit: 1 });
  const secondPage = await listLegacyServiceRequests({ page: 2, limit: 1 });
  assert.equal(firstPage.total, 2);
  assert.equal(secondPage.total, 2);
  assert.equal(firstPage.data.length, 1);
  assert.equal(secondPage.data.length, 1);
  assert.notEqual(firstPage.data[0].id, secondPage.data[0].id);
});

test("D: an unmappable legacy payload is rejected instead of writing a partial row", async () => {
  const db = freshDb();

  await assert.rejects(
    () => createLegacyServiceRequest("customer@example.com", { categoryId: "cat-1", title: "بدون موقع" }, ACTOR),
    /SERVICES_COMPAT_INVALID_BODY/,
  );
  assert.equal(db.dump("service_requests").length, 0);
});

/* C. NO LEGACY READ/WRITE — analytics reads canonical marketplace rows only. */
test("C: /api/service-analytics counters come from the canonical store, keyed on the marketplace user key", async () => {
  const db = freshDb();
  db.seed("service_requests", [
    { id: "r1", customer_user_id: "user@example.com", status: "published" },
    { id: "r2", customer_user_id: "someone@example.com", status: "published" },
  ]);
  db.seed("service_offers", [
    { id: "o1", provider_user_id: "user@example.com", status: "sent" },
    { id: "o2", provider_user_id: "user@example.com", status: "withdrawn" },
  ]);
  db.seed("service_orders", [
    { id: "j1", provider_user_id: "user@example.com", status: "in_progress" },
    { id: "j2", provider_user_id: "user@example.com", status: "completed" },
    { id: "j3", provider_user_id: "other@example.com", status: "completed" },
  ]);
  db.seed("service_reviews", [
    { id: "v1", reviewee_user_id: "user@example.com", rating: 5, is_hidden: 0 },
    { id: "v2", reviewee_user_id: "user@example.com", rating: 3, is_hidden: 0 },
    { id: "v3", reviewee_user_id: "other@example.com", rating: 1, is_hidden: 0 },
  ]);

  const analytics = await getUserServiceAnalytics("user@example.com");
  assert.deepEqual(analytics, { requests: 1, offers: 2, jobs: 2, completedJobs: 1, avgRating: 4 });
});

/* ============================================================
 * F. CURRENCY POLICY
 *
 * Binding rule: no global currency default, no OMR default, no SAR default,
 * no automatic substitution. The requester chooses the currency; the original
 * amount + currency code is the source of truth. Codes are validated against
 * the single canonical registry (lib/market/currency-registry.ts) — Services
 * owns no currency list of its own — and there is no FX anywhere.
 * ============================================================ */

/** Canonical registry codes exercised here. OMR is one of many, never a default. */
const CURRENCY_CASES = ["ILS", "SAR", "USD", "TRY", "EGP", "OMR"];

test("F: a missing currency is rejected deterministically and writes nothing", async () => {
  const db = freshDb();

  for (const missing of [undefined, null, "", "   ", 42]) {
    await assert.rejects(
      () => createLegacyServiceRequest("customer@example.com", baseRequest({ currency: missing }), ACTOR),
      (error) => {
        assert.ok(error instanceof ServicesCompatValidationError);
        assert.equal(error.code, SERVICES_COMPAT_ERRORS.CURRENCY_REQUIRED);
        return true;
      },
      `currency ${JSON.stringify(missing)} must be rejected, not defaulted`,
    );
  }

  assert.equal(db.dump("service_requests").length, 0, "a rejected request must write no row");
  assert.equal(db.dump("service_request_status_history").length, 0);
});

test("F: an unsupported currency is rejected deterministically and writes nothing", async () => {
  const db = freshDb();

  for (const unsupported of ["XYZ", "BTC", "GBP", "OM", "RIYAL", "$"]) {
    await assert.rejects(
      () => createLegacyServiceRequest("customer@example.com", baseRequest({ currency: unsupported }), ACTOR),
      (error) => {
        assert.ok(error instanceof ServicesCompatValidationError);
        assert.equal(error.code, SERVICES_COMPAT_ERRORS.CURRENCY_UNSUPPORTED);
        return true;
      },
      `currency ${unsupported} must be rejected, not substituted`,
    );
  }

  assert.equal(db.dump("service_requests").length, 0, "a rejected request must write no row");
});

test("F: the chosen currency is stored exactly — no substitution, and OMR is not special", async () => {
  const db = freshDb();

  for (const code of CURRENCY_CASES) {
    const created = await createLegacyServiceRequest(
      "customer@example.com",
      baseRequest({ currency: code, title: `طلب ${code}`, budget: 100 }),
      ACTOR,
    );

    // The compatibility response carries the amount together with its currency.
    assert.equal(created.currency, code);
    assert.equal(created.budget, 100);

    // The canonical row stores exactly the chosen code.
    const canonical = await getRequestFull(created.id);
    assert.equal(canonical.currency, code, `${code} must be persisted unchanged`);
  }

  // Nothing was silently rewritten to a platform default.
  const stored = db.dump("service_requests").map((row) => row.currency).sort();
  assert.deepEqual(stored, [...CURRENCY_CASES].sort());
  assert.equal(
    stored.filter((code) => code === "OMR").length,
    1,
    "OMR appears exactly once — only because one request explicitly asked for it",
  );
});

test("F: a lower-case currency code is normalised to the registry code, not substituted", async () => {
  freshDb();

  for (const [input, expected] of [["ils", "ILS"], [" usd ", "USD"], ["Sar", "SAR"]]) {
    const created = await createLegacyServiceRequest(
      "customer@example.com",
      baseRequest({ currency: input, title: `طلب ${expected}` }),
      ACTOR,
    );
    assert.equal(created.currency, expected);
    const canonical = await getRequestFull(created.id);
    assert.equal(canonical.currency, expected);
  }
});

test("F: Services declares no currency list of its own — the adapter reads the canonical registry", async () => {
  const source = await readFile(new URL("../lib/services/compat/services-api.ts", import.meta.url), "utf8");
  assert.match(source, /from "@\/lib\/market\/currency-registry"/);
  assert.doesNotMatch(source, /\|\|\s*"OMR"|\?\?\s*"OMR"/, "the adapter must not fall back to OMR");
  assert.doesNotMatch(source, /\|\|\s*"SAR"|\?\?\s*"SAR"/, "the adapter must not fall back to SAR");
  assert.doesNotMatch(source, /\bACTIVE_CURRENCY_CODES\s*=|CURRENCY_REGISTRY\s*=/, "the adapter must not declare a second currency array");
});
