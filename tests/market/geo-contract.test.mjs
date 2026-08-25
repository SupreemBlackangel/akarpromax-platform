// L1A — GET /api/geo contract behaviour, exercised without Next.js or a DB.
import assert from "node:assert/strict";
import test from "node:test";

import {
  GEO_PUBLIC_MESSAGES,
  resolveGeoRequest,
} from "../../lib/services/geo/geo-contract.ts";

const SA = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "SA",
  nameAr: "السعودية",
  nameEn: "Saudi Arabia",
  nameTr: "Suudi Arabistan",
  currencyCode: "SAR",
  flagEmoji: "🇸🇦",
  mapCenterLat: 24.7136,
  mapCenterLng: 46.6753,
  defaultZoom: 12,
  publicationsEnabled: true,
  measurementSystem: "metric",
  displayOrder: 160,
};

const TR = { ...SA, id: "22222222-2222-2222-2222-222222222222", code: "TR", nameAr: "تركيا", nameEn: "Türkiye", nameTr: "Türkiye", currencyCode: "TRY", displayOrder: 230 };

function provider(overrides = {}) {
  return {
    getCountries: async () => [SA, TR],
    getGovernorates: async () => [{ id: "g1", code: "RIYADH", nameAr: "الرياض", nameEn: "Riyadh", nameTr: null }],
    getCities: async () => [],
    getDistricts: async () => [],
    getStreets: async () => [],
    ...overrides,
  };
}

test("G — type=countries returns 200 with structured country data", async () => {
  const res = await resolveGeoRequest({ type: "countries" }, provider());
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.type, "countries");
  assert.equal(res.body.count, 2);
  assert.equal(res.body.data.length, 2);
});

test("G — country rows carry ar/en/tr so the current UI needs no redesign", async () => {
  const res = await resolveGeoRequest({ type: "countries" }, provider());
  for (const row of res.body.data) {
    assert.ok(typeof row.nameAr === "string" && row.nameAr.length > 0);
    assert.ok(typeof row.nameEn === "string" && row.nameEn.length > 0);
    assert.ok("nameTr" in row);
    assert.match(row.code, /^[A-Z]{2}$/);
  }
});

test("G — the country list is never an Oman-only fallback", async () => {
  const res = await resolveGeoRequest({ type: "countries" }, provider({ getCountries: async () => [] }));
  // An empty database is reported honestly as an empty 200 list, not padded
  // with a hard-coded Oman entry.
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 0);
  assert.deepEqual(res.body.data, []);
});

test("H — a backend/DB failure returns a non-2xx status, never a 200", async () => {
  const boom = provider({
    getCountries: async () => {
      throw new Error('column "flag_emoji" does not exist');
    },
  });
  const res = await resolveGeoRequest({ type: "countries" }, boom);
  assert.ok(res.status >= 500, `expected 5xx, got ${res.status}`);
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, "GEO_BACKEND_UNAVAILABLE");
  assert.equal("data" in res.body, false, "a failure must not carry a data payload");
});

test("H — a child-entity backend failure is also non-2xx", async () => {
  const boom = provider({
    getGovernorates: async () => {
      throw new Error("connection terminated");
    },
  });
  const res = await resolveGeoRequest({ type: "governorates", parentId: "abc" }, boom);
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
});

/* --- Correction E: the public body must disclose nothing internal --------- */

const LEAK_MARKERS = [
  "flag_emoji",
  "column",
  "does not exist",
  "relation",
  "SELECT",
  "postgres",
  "postgresql",
  "5432",
  "neon",
  "sslmode",
  "password",
  "ECONNREFUSED",
  "at Object.",
  "node_modules",
];

function assertNoLeak(body, extra = []) {
  const serialized = JSON.stringify(body);
  for (const marker of [...LEAK_MARKERS, ...extra]) {
    assert.equal(
      serialized.toLowerCase().includes(marker.toLowerCase()),
      false,
      `public body leaked "${marker}": ${serialized}`,
    );
  }
}

test("E — a Postgres error message never reaches the public response", async () => {
  const secret = 'column "flag_emoji" does not exist';
  const boom = provider({
    getCountries: async () => {
      throw new Error(secret);
    },
  });
  const res = await resolveGeoRequest({ type: "countries" }, boom);

  assert.equal(res.status, 503);
  assert.equal(res.body.error, "GEO_BACKEND_UNAVAILABLE");
  assert.equal(res.body.message, GEO_PUBLIC_MESSAGES.GEO_BACKEND_UNAVAILABLE.ar);
  assert.equal(res.body.messageEn, GEO_PUBLIC_MESSAGES.GEO_BACKEND_UNAVAILABLE.en);
  assertNoLeak(res.body, [secret]);
});

test("E — connection strings, hosts and stack text never reach the public response", async () => {
  const nasty = new Error(
    "connect ECONNREFUSED 10.1.2.3:5432 postgresql://akar:hunter2@db.neon.tech/main?sslmode=require",
  );
  nasty.stack = "Error: at Object.<anonymous> (/app/node_modules/postgres/src/connection.js:1:1)";
  const res = await resolveGeoRequest(
    { type: "cities", parentId: "gov-1" },
    provider({
      getCities: async () => {
        throw nasty;
      },
    }),
  );
  assert.equal(res.status, 503);
  assertNoLeak(res.body, ["hunter2", "db.neon.tech", "10.1.2.3"]);
});

test("E — the full original error is still available for server-side logging", async () => {
  const cause = new Error('column "flag_emoji" does not exist');
  const res = await resolveGeoRequest(
    { type: "countries" },
    provider({
      getCountries: async () => {
        throw cause;
      },
    }),
  );
  assert.ok(res.internal, "internal detail must be handed back for logging");
  assert.equal(res.internal.cause, cause, "the original Error object must be preserved");
  assert.equal(res.internal.code, "GEO_BACKEND_UNAVAILABLE");
  assert.equal(res.internal.type, "countries");
  // ...and it must not be part of the serialisable public body.
  assert.equal("internal" in res.body, false);
});

test("E — success and 4xx responses carry no internal channel at all", async () => {
  const ok = await resolveGeoRequest({ type: "countries" }, provider());
  assert.equal(ok.internal, undefined);
  const bad = await resolveGeoRequest({ type: "planets" }, provider());
  assert.equal(bad.internal, undefined);
  assertNoLeak(bad.body);
});

test("E — public error messages are fixed constants, not interpolated", async () => {
  for (const [code, messages] of Object.entries(GEO_PUBLIC_MESSAGES)) {
    assert.ok(messages.ar.length > 0, `${code} has no Arabic message`);
    assert.ok(messages.en.length > 0, `${code} has no English message`);
    assert.equal(/\$\{|%s|\bnull\b|undefined/.test(messages.ar + messages.en), false);
  }
});

test("an unknown type is a 400, not a silent empty success", async () => {
  const res = await resolveGeoRequest({ type: "planets" }, provider());
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error, "GEO_UNKNOWN_TYPE");

  const missing = await resolveGeoRequest({}, provider());
  assert.equal(missing.status, 400);
});

test("child entities require their parent id", async () => {
  for (const type of ["governorates", "cities", "districts", "streets"]) {
    const res = await resolveGeoRequest({ type }, provider());
    assert.equal(res.status, 400, `${type} without parentId`);
    assert.equal(res.body.error, "GEO_PARENT_REQUIRED");
    assertNoLeak(res.body);
  }
  const ok = await resolveGeoRequest({ type: "governorates", parentId: "country-1" }, provider());
  assert.equal(ok.status, 200);
  assert.equal(ok.body.count, 1);
});

test("the resolver never throws — every outcome is an explicit status", async () => {
  const hostile = {
    getCountries: () => {
      throw new Error("sync throw");
    },
  };
  const res = await resolveGeoRequest({ type: "countries" }, hostile);
  assert.equal(res.status, 503);
});
