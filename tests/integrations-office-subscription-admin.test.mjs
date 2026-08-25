// Admin subscription provisioning for paired Office devices.
//
// Covers the writer's authorization, validation and single-row invariant, and
// proves end-to-end that a paired device sees an admin write on its next fetch
// of GET /api/office/v1/subscription.
import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { startPairing, completePairing } from "../lib/integration/pairing.ts";
import { GUEST_IDENTITY, setSessionIdentityResolverForTests } from "../lib/identity-auth.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";
import {
  GET as adminGet,
  POST as adminPost,
  PATCH as adminPatch,
} from "../app/api/admin/office-subscriptions/route.ts";
import { GET as deviceSubscriptionGet } from "../app/api/office/v1/subscription/route.ts";

const SPONSOR = "office@akarpromax.com";
const ADMIN_URL = "https://akarpromax.com/api/admin/office-subscriptions";
const DEVICE_URL = "https://akarpromax.com/api/office/v1/subscription";

function identity(overrides = {}) {
  return {
    authenticated: true,
    email: "admin@akarpromax.com",
    displayName: "Admin",
    role: "sponsor_admin",
    countryCode: "OM",
    permissions: [],
    ...overrides,
  };
}

const asGuest = () => setSessionIdentityResolverForTests(async () => GUEST_IDENTITY);
const asReader = () => setSessionIdentityResolverForTests(async () => identity({ permissions: [PERMISSIONS.OFFICE_ADMIN_VIEW] }));
const asWriter = () =>
  setSessionIdentityResolverForTests(async () =>
    identity({ permissions: [PERMISSIONS.OFFICE_ADMIN_VIEW, PERMISSIONS.ADVERTISER_SUBSCRIPTIONS_MANAGE] }),
  );
const asSuperAdmin = () => setSessionIdentityResolverForTests(async () => identity({ role: "super_admin", permissions: ["*"] }));

function adminRequest(method, body) {
  return new Request(ADMIN_URL, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function adminReadRequest(query = "") {
  const request = new Request(ADMIN_URL + query, { method: "GET" });
  request.nextUrl = new URL(ADMIN_URL + query);
  return request;
}

async function pairDevice(officeId = "muscat-main") {
  const pairing = await startPairing({ sponsorId: SPONSOR, officeId });
  return completePairing({
    code: pairing.code,
    installationId: "inst-admin",
    deviceName: "Reception PC",
    appVersion: "1.2.0",
    protocolVersion: 1,
  });
}

function deviceRequest(token) {
  return new Request(DEVICE_URL, {
    method: "GET",
    headers: { authorization: `Bearer ${token}`, "x-protocol-version": "1", "x-app-version": "1.2.0" },
  });
}

test.afterEach(() => {
  setSessionIdentityResolverForTests(null);
  setIntegrationDbForTesting(null);
});

// ---- authorization --------------------------------------------------------

test("an unauthenticated caller cannot read or write subscriptions", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  asGuest();

  assert.equal((await adminGet(adminReadRequest())).status, 401);
  assert.equal((await adminPost(adminRequest("POST", { sponsorId: SPONSOR }))).status, 401);
  assert.equal((await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR }))).status, 401);
});

test("an authenticated user without the manage permission cannot write", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asReader();

  assert.equal((await adminGet(adminReadRequest())).status, 200);

  const created = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01",
  }));
  assert.equal(created.status, 403);
  assert.equal((await created.json()).error, "Forbidden");

  const patched = await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR, status: "active" }));
  assert.equal(patched.status, 403);
});

test("an authenticated user with no office permission at all cannot even read", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  setSessionIdentityResolverForTests(async () => identity({ permissions: [PERMISSIONS.ADS_MANAGE] }));
  assert.equal((await adminGet(adminReadRequest())).status, 403);
});

// ---- create / update ------------------------------------------------------

test("an admin can create a subscription for a paired sponsor", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  const response = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01",
  }));
  assert.equal(response.status, 201);
  const { subscription } = await response.json();
  assert.equal(subscription.sponsorId, SPONSOR);
  assert.equal(subscription.status, "active");
  assert.equal(subscription.startDate, "2026-01-01");
  assert.equal(subscription.endDate, "2027-01-01");
});

test("an admin can update status and dates on an existing subscription", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asSuperAdmin();

  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "trial", startDate: "2026-01-01", endDate: "2026-02-01" }));
  const response = await adminPatch(adminRequest("PATCH", {
    sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2028-01-01",
  }));
  assert.equal(response.status, 200);
  const { subscription } = await response.json();
  assert.equal(subscription.status, "active");
  assert.equal(subscription.endDate, "2028-01-01");
});

test("a status-only update does not rewrite the dates", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01" }));
  const response = await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR, status: "suspended" }));
  const { subscription } = await response.json();

  assert.equal(subscription.status, "suspended");
  assert.equal(subscription.startDate, "2026-01-01");
  assert.equal(subscription.endDate, "2027-01-01");
});

// ---- validation -----------------------------------------------------------

test("a sponsor the Office integration does not know is rejected", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  asWriter();

  const response = await adminPost(adminRequest("POST", {
    sponsorId: "stranger@example.com", status: "active", startDate: "2026-01-01", endDate: "2027-01-01",
  }));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "SPONSOR_NOT_FOUND");
});

test("a malformed date range is rejected", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  const reversed = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "2027-01-01", endDate: "2026-01-01",
  }));
  assert.equal(reversed.status, 400);
  assert.equal((await reversed.json()).error, "INVALID_DATE_RANGE");

  const sameDay = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2026-01-01",
  }));
  assert.equal((await sameDay.json()).error, "INVALID_DATE_RANGE");

  const garbage = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "not-a-date", endDate: "2027-01-01",
  }));
  assert.equal(garbage.status, 400);
  assert.equal((await garbage.json()).error, "INVALID_START_DATE");
});

test("an unknown status is rejected", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  const response = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "vip", startDate: "2026-01-01", endDate: "2027-01-01",
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "INVALID_STATUS");
});

test("a second subscription row for the same sponsor is refused", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01" }));
  const duplicate = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "trial", startDate: "2026-06-01", endDate: "2028-01-01",
  }));

  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error, "SUBSCRIPTION_EXISTS");
  assert.equal(db.dump("sponsor_subscriptions").length, 1);
});

test("updating a sponsor with no subscription is refused", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  await pairDevice();
  asWriter();

  const response = await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR, status: "active" }));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "SUBSCRIPTION_NOT_FOUND");
});

// ---- end-to-end with the device contract ----------------------------------

test("a paired device sees a newly created subscription on its next fetch", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();

  const before = await (await deviceSubscriptionGet(deviceRequest(device.token))).json();
  assert.equal(before.isActive, false);
  assert.equal(before.statusMessage, "NO_SUBSCRIPTION");

  asWriter();
  const created = await adminPost(adminRequest("POST", {
    sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01",
  }));
  assert.equal(created.status, 201);

  const after = await (await deviceSubscriptionGet(deviceRequest(device.token))).json();
  assert.equal(after.isActive, true);
  assert.equal(after.isExpired, false);
  assert.equal(after.statusMessage, "ACTIVE");
  assert.ok(after.daysRemaining > 0);
});

test("a paired device sees a status change on its next fetch", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  asWriter();

  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "trial", startDate: "2026-01-01", endDate: "2027-01-01" }));
  const trial = await (await deviceSubscriptionGet(deviceRequest(device.token))).json();
  assert.equal(trial.isTrial, true);
  assert.equal(trial.isActive, true);

  await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR, status: "suspended" }));
  const suspended = await (await deviceSubscriptionGet(deviceRequest(device.token))).json();
  assert.equal(suspended.isActive, false);
  assert.equal(suspended.isTrial, false);
  assert.equal(suspended.statusMessage, "SUSPENDED");

  await adminPatch(adminRequest("PATCH", { sponsorId: SPONSOR, status: "active", startDate: "2020-01-01", endDate: "2021-01-01" }));
  const expired = await (await deviceSubscriptionGet(deviceRequest(device.token))).json();
  assert.equal(expired.isActive, false);
  assert.equal(expired.isExpired, true);
  assert.equal(expired.statusMessage, "EXPIRED");
});

test("the admin overview lists the paired office without exposing any credential", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  asWriter();
  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01" }));

  const response = await adminGet(adminReadRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  const raw = JSON.stringify(payload);

  assert.equal(payload.subscriptions.length, 1);
  assert.equal(payload.subscriptions[0].sponsorId, SPONSOR);
  assert.equal(payload.subscriptions[0].officeId, "muscat-main");
  assert.equal(payload.subscriptions[0].isActive, true);

  assert.doesNotMatch(raw, /apd_/);
  assert.doesNotMatch(raw, new RegExp(device.token));
  assert.doesNotMatch(raw, /token/i);
  assert.doesNotMatch(raw, /credential/i);
  assert.doesNotMatch(raw, /code_hash/i);
  assert.doesNotMatch(raw, /installation/i);
});

test("the single-sponsor admin read returns the stored row and no secrets", async () => {
  setIntegrationDbForTesting(createInMemoryDb());
  const device = await pairDevice();
  asWriter();
  await adminPost(adminRequest("POST", { sponsorId: SPONSOR, status: "active", startDate: "2026-01-01", endDate: "2027-01-01" }));

  const response = await adminGet(adminReadRequest(`?sponsorId=${encodeURIComponent(SPONSOR)}`));
  const payload = await response.json();

  assert.equal(payload.subscription.status, "active");
  assert.equal(payload.subscription.sponsorId, SPONSOR);
  const raw = JSON.stringify(payload);
  assert.doesNotMatch(raw, /apd_/);
  assert.doesNotMatch(raw, new RegExp(device.token));
});
