import assert from "node:assert/strict";
import test from "node:test";

import {
  GUEST_IDENTITY,
  getSessionIdentity,
  hasPermission,
  setSessionIdentityResolverForTests,
} from "../lib/identity-auth.ts";
import { permissionsForSessionRole } from "../lib/auth/identity-map.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";

const CATEGORIES = PERMISSIONS.SERVICE_CATEGORIES_MANAGE;
const REPORTS = PERMISSIONS.SERVICE_REPORTS_MANAGE;
const PROVIDERS = PERMISSIONS.SERVICE_PROVIDERS_REVIEW;

function identity(overrides = {}) {
  return {
    authenticated: true,
    email: "admin@example.com",
    displayName: "Admin",
    role: "sponsor_admin",
    countryCode: "OM",
    permissions: [],
    ...overrides,
  };
}

// Mirrors the gate in app/admin/services/page.tsx and the admin routes:
// an authenticated caller needs at least one of the three admin permissions.
function adminGateAllows(sessionIdentity) {
  if (!sessionIdentity.authenticated) return false;
  return [CATEGORIES, REPORTS, PROVIDERS].some((permission) => hasPermission(sessionIdentity, permission));
}

test.afterEach(() => {
  setSessionIdentityResolverForTests(null);
});

test("scenario 1: an unauthenticated guest never passes an admin gate", async () => {
  setSessionIdentityResolverForTests(async () => GUEST_IDENTITY);
  const session = await getSessionIdentity();
  assert.equal(session.authenticated, false);
  assert.equal(hasPermission(session, CATEGORIES), false);
  assert.equal(adminGateAllows(session), false);
});

test("scenario 2: a session holding SERVICE_CATEGORIES_MANAGE passes the categories gate", async () => {
  setSessionIdentityResolverForTests(async () => identity({ permissions: [CATEGORIES] }));
  const session = await getSessionIdentity();
  assert.equal(hasPermission(session, CATEGORIES), true);
  assert.equal(adminGateAllows(session), true);
});

test("scenario 3: an authenticated session without the required permission is rejected", async () => {
  setSessionIdentityResolverForTests(async () => identity({ permissions: [PERMISSIONS.ADS_MANAGE] }));
  const session = await getSessionIdentity();
  assert.equal(hasPermission(session, CATEGORIES), false);
  assert.equal(adminGateAllows(session), false);
});

test("scenario 4: a super_admin wildcard passes any service admin permission", async () => {
  setSessionIdentityResolverForTests(async () => identity({ role: "super_admin", permissions: ["*"] }));
  const session = await getSessionIdentity();
  for (const permission of [CATEGORIES, REPORTS, PROVIDERS]) {
    assert.equal(hasPermission(session, permission), true, permission);
  }
  assert.equal(adminGateAllows(session), true);
});

test("scenario 5: SERVICE_PROVIDERS_REVIEW allows provider review but not category management", async () => {
  setSessionIdentityResolverForTests(async () => identity({ permissions: [PROVIDERS] }));
  const session = await getSessionIdentity();
  assert.equal(hasPermission(session, PROVIDERS), true);
  assert.equal(hasPermission(session, CATEGORIES), false);
  assert.equal(hasPermission(session, REPORTS), false);
  assert.equal(adminGateAllows(session), true);
});

test("scenario 6: SERVICE_REPORTS_MANAGE allows reports but not provider review", async () => {
  setSessionIdentityResolverForTests(async () => identity({ permissions: [REPORTS] }));
  const session = await getSessionIdentity();
  assert.equal(hasPermission(session, REPORTS), true);
  assert.equal(hasPermission(session, PROVIDERS), false);
  assert.equal(adminGateAllows(session), true);
});

test("scenario 7: role-derived permissions from the session grant the matching admin scope", async () => {
  const permissions = permissionsForSessionRole("service_supervisor");
  setSessionIdentityResolverForTests(async () => identity({ role: "service_supervisor", permissions }));
  const session = await getSessionIdentity();
  const granted = permissions.filter((p) => hasPermission(session, p));
  assert.deepEqual(granted, permissions, "every session permission must be granted");
  assert.equal(adminGateAllows(session), true, "service_supervisor should be allowed into the services admin");
});

test("scenario 8: a viewer role has no service admin scope at all", async () => {
  setSessionIdentityResolverForTests(async () => identity({ role: "viewer", permissions: permissionsForSessionRole("viewer") }));
  const session = await getSessionIdentity();
  for (const permission of [CATEGORIES, REPORTS, PROVIDERS]) {
    assert.equal(hasPermission(session, permission), false, permission);
  }
  assert.equal(adminGateAllows(session), false);
});

test("scenario 9: a resolver that returns null falls back to the guest identity", async () => {
  setSessionIdentityResolverForTests(async () => null);
  const session = await getSessionIdentity();
  assert.equal(session.authenticated, false);
  assert.equal(adminGateAllows(session), false);
});

test("scenario 10: clearing the resolver restores the production (guest here) identity path", async () => {
  setSessionIdentityResolverForTests(async () => identity({ permissions: [CATEGORIES] }));
  assert.equal((await getSessionIdentity()).authenticated, true);
  setSessionIdentityResolverForTests(null);
  const session = await getSessionIdentity();
  assert.equal(session.authenticated, false);
  assert.equal(session.email, null);
  assert.equal(adminGateAllows(session), false);
});
