// Office desktop subscription contract: GET /api/office/v1/subscription.
//
// Authentication reuses the existing Office device credential. There is no
// shared signature, no userToken query parameter and no second auth system.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import { getSponsorSubscriptionSnapshot } from "../lib/integration/subscription.ts";
import { GET as subscriptionGet } from "../app/api/office/v1/subscription/route.ts";

const SPONSOR = "office@akarpromax.com";
const ROUTE = "https://akarpromax.com/api/office/v1/subscription";

const CONTRACT_KEYS = [
  "ok",
  "isActive",
  "isExpired",
  "isTrial",
  "daysRemaining",
  "expiryDate",
  "renewalUrl",
  "statusMessage",
  "checkedAt",
];

function request(headers = {}) {
  return new Request(ROUTE, { method: "GET", headers });
}

function deviceHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "x-protocol-version": "1",
    "x-app-version": "1.2.0",
  };
}

async function pairDevice() {
  const pairing = await startPairing({ sponsorId: SPONSOR });
  return completePairing({
    code: pairing.code,
    installationId: "inst-subscription",
    deviceName: "Office PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

function seedSubscription(db, overrides = {}) {
  db.seed("sponsor_subscriptions", [
    {
      id: "sub-1",
      sponsor_id: SPONSOR,
      plan_id: "plan-basic",
      start_date: "2026-01-01",
      end_date: "2027-01-01",
      status: "active",
      auto_renew: 1,
      payment_method: null,
      notes: null,
      created_by: null,
      created_at: "2026-01-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
      ...overrides,
    },
  ]);
}

test("no Authorization header is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const response = await subscriptionGet(request());
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "Unauthorized");
  assert.equal(body.reason, "MISSING");
  setIntegrationDbForTesting(null);
});

test("an invalid device token is rejected with 401", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const response = await subscriptionGet(request(deviceHeaders("apd_not_a_real_token")));
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "Unauthorized");
  assert.equal(body.reason, "INVALID");
  setIntegrationDbForTesting(null);
});

test("a revoked credential is rejected with 401", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  seedSubscription(db);
  db.table("office_device_credentials")[0].revoked_at = "2026-08-01 00:00:00";

  const response = await subscriptionGet(request(deviceHeaders(device.token)));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).reason, "CREDENTIAL_REVOKED");
  setIntegrationDbForTesting(null);
});

test("a valid active device receives the subscription contract", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  seedSubscription(db);

  const response = await subscriptionGet(request(deviceHeaders(device.token)));
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.deepEqual(Object.keys(body).sort(), [...CONTRACT_KEYS].sort());
  assert.equal(body.ok, true);
  assert.equal(body.isActive, true);
  assert.equal(body.isExpired, false);
  assert.equal(body.isTrial, false);
  assert.equal(typeof body.daysRemaining, "number");
  assert.ok(body.daysRemaining > 0);
  assert.match(body.expiryDate, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(body.statusMessage, "ACTIVE");
  assert.match(body.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
  setIntegrationDbForTesting(null);
});

test("the subscription response carries no credential or token material", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  seedSubscription(db);

  const response = await subscriptionGet(request(deviceHeaders(device.token)));
  const raw = JSON.stringify(await response.json());

  assert.doesNotMatch(raw, /apd_/);
  assert.doesNotMatch(raw, new RegExp(device.token));
  assert.doesNotMatch(raw, /token/i);
  assert.doesNotMatch(raw, /sponsor/i);
  assert.doesNotMatch(raw, /deviceId/i);
  setIntegrationDbForTesting(null);
});

test("the route requires no shared signature and no userToken parameter", async () => {
  const source = await readFile(new URL("../app/api/office/v1/subscription/route.ts", import.meta.url), "utf8");
  // Assert on executable code, not on the prose that explains it.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /signature/i);
  assert.doesNotMatch(code, /userToken/i);
  assert.doesNotMatch(code, /localhost/i);
  assert.match(code, /authenticateOfficeRequest/);

  const db = setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  seedSubscription(db);

  // Same request, no query string at all.
  const response = await subscriptionGet(request(deviceHeaders(device.token)));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).isActive, true);
  setIntegrationDbForTesting(null);
});

test("a sponsor with no subscription row is reported inactive, never active", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.isActive, false);
  assert.equal(snapshot.isTrial, false);
  assert.equal(snapshot.statusMessage, "NO_SUBSCRIPTION");
  assert.equal(snapshot.daysRemaining, null);
  assert.equal(snapshot.expiryDate, null);
  setIntegrationDbForTesting(null);
});

test("an ended subscription maps to expired and not active", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  seedSubscription(db, { start_date: "2025-01-01", end_date: "2025-06-01" });

  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.isActive, false);
  assert.equal(snapshot.isExpired, true);
  assert.equal(snapshot.daysRemaining, 0);
  assert.equal(snapshot.statusMessage, "EXPIRED");
  setIntegrationDbForTesting(null);
});

test("a live trial maps to active + trial", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  seedSubscription(db, { status: "trial", end_date: "2027-01-01" });

  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.isActive, true);
  assert.equal(snapshot.isTrial, true);
  assert.equal(snapshot.isExpired, false);
  assert.equal(snapshot.statusMessage, "TRIAL");
  setIntegrationDbForTesting(null);
});

test("an unparseable end date fails closed rather than granting access", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  seedSubscription(db, { end_date: "not-a-date" });

  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.isActive, false);
  assert.equal(snapshot.isExpired, true);
  assert.equal(snapshot.expiryDate, null);
  assert.equal(snapshot.daysRemaining, null);
  setIntegrationDbForTesting(null);
});

test("a cancelled subscription inside its date window is still not active", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  seedSubscription(db, { status: "cancelled" });

  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.isActive, false);
  assert.equal(snapshot.isTrial, false);
  assert.equal(snapshot.statusMessage, "CANCELLED");
  setIntegrationDbForTesting(null);
});

test("renewalUrl is null because the website has no canonical renewal page", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  seedSubscription(db);
  const snapshot = await getSponsorSubscriptionSnapshot(SPONSOR);
  assert.equal(snapshot.renewalUrl, null);
  setIntegrationDbForTesting(null);
});
