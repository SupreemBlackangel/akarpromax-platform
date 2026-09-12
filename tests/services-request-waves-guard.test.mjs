// The wave rule is the marketplace's promise to a craftsman: a request that
// reaches you is one of three, which is why it is worth answering.
//
// Two holes in it, both reachable by the customer.
//
// POST /api/service-requests/[id]/matching called `runMatching(id)` straight —
// no wave number, no canRenew, no renewal count, no block — so anyone who could
// reach it could notify every eligible craftsman in the country, as often as
// they liked. Nothing in the application called it; it was an open door nobody
// had walked through.
//
// And renewing was refused from `receiving_offers`, which is where a request
// lands the moment the first craftsman answers and never leaves. So "ask for
// three others" stopped working at the first reply — exactly when a customer
// wants it, having now seen an offer they do not want. The button was on screen
// the whole time, and the server answered REQUEST_STATUS_INVALID every time.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setServicesDbForTesting } from "../lib/services/db.ts";
import { setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { mapSessionRole, permissionsForSessionRole } from "../lib/auth/identity-map.ts";
import { createRequestFull, getRequestFull, renewRequest } from "../lib/services/marketplace.ts";
import { REQUEST_STATUS } from "../lib/services/constants.ts";

import { POST as matchingPost } from "../app/api/service-requests/[id]/matching/route.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
const CUSTOMER = "customer@example.com";

let db;

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

const post = (id) => new Request(`http://localhost/api/service-requests/${id}/matching`, { method: "POST" });
const params = (id) => ({ params: Promise.resolve({ id }) });

async function seedRequest(status) {
  const id = await createRequestFull({
    customerUserId: CUSTOMER,
    categoryId: "cat-1",
    countryCode: "SA",
    cityId: "JEDDAH",
    title: "تمديد كهرباء",
    description: "لوحة الكهرباء تفصل",
    currency: "SAR",
  });
  await db.prepare("UPDATE service_requests SET status = ?1 WHERE id = ?2").bind(status, id).run();
  return id;
}

/** One craftsman in the current wave, either still deciding or finished with it. */
async function seedMatch(requestId, { providerId, wave = 1, declined = false }) {
  await db
    .prepare(
      `INSERT INTO service_provider_profiles (id, user_id, status, country_code, created_at, updated_at)
       VALUES (?1, ?2, 'approved', 'SA', ?3, ?3)`,
    )
    .bind(providerId, `${providerId}@example.com`, "2026-09-12 00:00:00")
    .run();
  await db
    .prepare(
      `INSERT INTO service_request_matches (id, request_id, provider_id, wave, declined_at, provider_ignored, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)`,
    )
    .bind(`m-${providerId}`, requestId, providerId, wave, declined ? "2026-09-12 01:00:00" : null, "2026-09-12 00:00:00")
    .run();
}

test.beforeEach(() => {
  db = setServicesDbForTesting(createInMemoryDb());
  signIn();
});

test.afterEach(() => {
  setServicesDbForTesting(null);
  setSessionIdentityResolverForTests(null);
});

test("asking for another wave while a craftsman is still deciding is refused", async () => {
  const id = await seedRequest(REQUEST_STATUS.PUBLISHED);
  await seedMatch(id, { providerId: "prov-1" });

  const response = await matchingPost(post(id), params(id));
  const payload = await response.json();
  assert.equal(response.status, 409, `expected a rule, got ${response.status}: ${JSON.stringify(payload)}`);
  assert.equal(payload.error, "WAVE_STILL_OPEN");
  assert.match(payload.message, /أمهله/, "a bare 409 tells the customer nothing");
});

test("the renewal count is spent whichever door is used", async () => {
  // The hole was that this route did not go through canRenew at all, so it
  // could be called forever without the counter ever moving.
  const id = await seedRequest(REQUEST_STATUS.PUBLISHED);
  await seedMatch(id, { providerId: "prov-1", declined: true });

  const response = await matchingPost(post(id), params(id));
  assert.equal(response.status, 200, "a finished wave may be renewed");
  assert.equal(Number((await getRequestFull(id)).renewal_count ?? 0), 1, "the renewal must be counted");
});

test("a request that has received an offer can still ask for three others", async () => {
  // `receiving_offers` is the status from the first reply onwards. Refusing it
  // made the on-screen button fail every single time.
  const id = await seedRequest(REQUEST_STATUS.RECEIVING_OFFERS);
  await seedMatch(id, { providerId: "prov-1", declined: true });

  const result = await renewRequest(id, { userId: CUSTOMER, ip: null });
  assert.equal(result.ok, true, `renewing from receiving_offers must be allowed: ${JSON.stringify(result)}`);
});

test("a request that is finished with cannot summon another wave", async () => {
  for (const status of [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.DRAFT]) {
    const id = await seedRequest(status);
    const result = await renewRequest(id, { userId: CUSTOMER, ip: null });
    assert.equal(result.ok, false, `${status} must not be renewable`);
    assert.equal(result.reason, "REQUEST_STATUS_INVALID");
  }
});

test("the renewal is recorded against the status it actually happened in", async () => {
  // It used to be written as published -> published whatever the request was
  // in, so a renewal from receiving_offers left a false line in the history.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.doesNotMatch(
    marketplace,
    /recordRequestHistory\(\s*requestId,\s*REQUEST_STATUS\.PUBLISHED,\s*REQUEST_STATUS\.PUBLISHED,/,
    "the history must carry the real status",
  );
});

test("the matching route no longer has its own way to notify everyone", async () => {
  const source = await read("app/api/service-requests/[id]/matching/route.ts");
  // The comment above the handler names the old call on purpose, to say what
  // was wrong; reading it as the offence would teach the next person to delete
  // the explanation.
  const route = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  assert.doesNotMatch(route, /runMatching/, "one rule, one path: the route delegates rather than matching on its own");
  assert.match(route, /await renewRequest\(id, \{/);
  // An administrator goes through the same rule. The rule protects the
  // craftsmen's time, and a permission is not an exemption from that.
  assert.match(route, /RENEWAL_MESSAGES\[result\.reason\]/);
});
