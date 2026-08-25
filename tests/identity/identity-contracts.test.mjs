// L1B — pure identity contracts: no database, no network, no Next runtime.
import assert from "node:assert/strict";
import test from "node:test";

import { isSameEmailIdentity, normalizeEmailIdentity } from "../../lib/auth/email-identity.ts";
import {
  accountBlockReason,
  ACCOUNT_ACTIVE_STATUSES,
  canAccessAdminArea,
  isAccountUsable,
  isBannedSelfAssignmentRole,
  sanitizeRegistrationRole,
  validatePassword,
} from "../../lib/auth/access-control.ts";
import {
  buildVerificationRecord,
  buildVerificationEmailUrl,
  consumeRecord,
  revokeRecord,
  verifyTokenRecord,
} from "../../lib/auth/verification.ts";
import { users, organizationMembers, organizations, userOauthAccounts } from "../../lib/db/schema.ts";

/* ------------------------------------------------------- email identity --- */

test("email identity: casing and whitespace never create separate humans", () => {
  assert.equal(normalizeEmailIdentity("User@Example.com"), "user@example.com");
  assert.equal(normalizeEmailIdentity("  USER@EXAMPLE.COM  "), "user@example.com");
  assert.equal(isSameEmailIdentity("User@Example.com", "user@example.com"), true);
});

test("email identity: no provider-specific tricks — dots and plus aliases are preserved", () => {
  assert.equal(normalizeEmailIdentity("a.b+c@gmail.com"), "a.b+c@gmail.com");
  assert.equal(isSameEmailIdentity("ab@gmail.com", "a.b@gmail.com"), false);
  assert.equal(isSameEmailIdentity("x@gmail.com", "x+tag@gmail.com"), false);
});

test("email identity: non-strings and blanks normalize to absent, never to a match", () => {
  assert.equal(normalizeEmailIdentity(null), "");
  assert.equal(normalizeEmailIdentity(undefined), "");
  assert.equal(normalizeEmailIdentity(42), "");
  assert.equal(isSameEmailIdentity("", ""), false);
  assert.equal(isSameEmailIdentity(null, null), false);
});

/* ---------------------------------------------- one password validator --- */

test("password policy: one canonical validator serves register and reset", () => {
  assert.equal(validatePassword("short").valid, false);
  assert.equal(validatePassword("longenough1").valid, true);
  assert.equal(validatePassword("x".repeat(129)).valid, false);
  assert.equal(validatePassword(123).valid, false);
});

/* -------------------------------------------------- registration shape --- */

test("registration role is always the base human user, whatever the client sends", () => {
  for (const attempted of [undefined, "user", "admin", "super_admin", "service_provider", "company", "craftsman"]) {
    assert.equal(sanitizeRegistrationRole(attempted), "user", String(attempted));
  }
});

test("privileged roles can never be self-assigned", () => {
  for (const role of ["super_admin", "sponsor_admin", "service_supervisor", "country_manager"]) {
    assert.equal(isBannedSelfAssignmentRole(role), true, role);
  }
  assert.equal(isBannedSelfAssignmentRole("user"), false);
});

/* ------------------------------------------------------ account status --- */

test("account status is centralized: only active accounts are usable", () => {
  assert.deepEqual(ACCOUNT_ACTIVE_STATUSES, ["active"]);
  assert.equal(isAccountUsable("active", true), true);
  // canonical policy: registration -> email activation -> normal account use;
  // an unverified account cannot log in but is never unrecoverable (resend
  // verification remains available).
  assert.equal(isAccountUsable("pending_verification", true), false);
  assert.equal(accountBlockReason("pending_verification", true), "not_verified");
  assert.equal(isAccountUsable("suspended", true), false);
  assert.equal(isAccountUsable("disabled", true), false);
  assert.equal(isAccountUsable("active", false), false);
  assert.equal(accountBlockReason("active", false), "inactive");
});

/* --------------------------- rank / verification / subscription != permission */

test("authorization: rank does not grant admin permission", () => {
  const goldRankedCompanyOwner = {
    authenticated: true,
    role: "user",
    permissions: [],
    rank: "gold",
    reputationLevel: "promax",
  };
  assert.equal(canAccessAdminArea(goldRankedCompanyOwner), false);
});

test("authorization: verification does not grant permission", () => {
  const verifiedProfessional = {
    authenticated: true,
    role: "user",
    permissions: [],
    verified: true,
    verifiedAt: new Date().toISOString(),
  };
  assert.equal(canAccessAdminArea(verifiedProfessional), false);
});

test("authorization: subscription does not grant permission", () => {
  const paidSubscriber = {
    authenticated: true,
    role: "user",
    permissions: [],
    subscription: "premium",
    subscriptionActive: true,
  };
  assert.equal(canAccessAdminArea(paidSubscriber), false);
});

test("authorization: role/permission does grant, identity type never changes", () => {
  assert.equal(canAccessAdminArea({ authenticated: true, role: "super_admin", permissions: [] }), true);
  assert.equal(canAccessAdminArea({ authenticated: true, role: "user", permissions: ["*"] }), true);
  assert.equal(canAccessAdminArea({ authenticated: false, role: "super_admin", permissions: ["*"] }), false);
});

/* ------------------------------------------------ verification lifecycle --- */

test("verification: raw token reaches the outbound URL, the record stores only a hash", async () => {
  const raw = "raw-token-value-abc123";
  const record = await buildVerificationRecord({
    userId: "00000000-0000-0000-0000-000000000001",
    purpose: "email_verification",
    destination: "user@example.com",
    tokenValue: raw,
  });
  assert.notEqual(record.tokenHash, raw, "the record must never store the raw token");
  assert.match(record.tokenHash, /^[0-9a-f]{64}$/, "stored representation is a SHA-256 hash");
  const url = buildVerificationEmailUrl("http://localhost:3010", raw);
  assert.ok(url.includes(encodeURIComponent(raw)), "the outbound message carries the raw token");
  assert.equal(url.includes(record.tokenHash), false, "the outbound message never carries the hash");
});

test("verification: valid token verifies once and only once (single-use)", async () => {
  const raw = "single-use-token";
  let record = await buildVerificationRecord({
    userId: "00000000-0000-0000-0000-000000000001",
    purpose: "email_verification",
    destination: "user@example.com",
    tokenValue: raw,
  });
  assert.deepEqual(await verifyTokenRecord(record, raw), { valid: true });
  record = consumeRecord(record);
  const replay = await verifyTokenRecord(record, raw);
  assert.equal(replay.valid, false);
  assert.equal(replay.reason, "consumed");
});

test("verification: expired and revoked tokens are rejected; wrong token mismatches", async () => {
  const raw = "expiring-token";
  const past = new Date(Date.now() - 1000 * 60 * 60 * 48);
  const expired = await buildVerificationRecord({
    userId: "00000000-0000-0000-0000-000000000001",
    purpose: "password_reset",
    destination: "user@example.com",
    tokenValue: raw,
    now: past,
  });
  const expiredResult = await verifyTokenRecord(expired, raw);
  assert.equal(expiredResult.valid, false);
  assert.equal(expiredResult.reason, "expired");

  const fresh = await buildVerificationRecord({
    userId: "00000000-0000-0000-0000-000000000001",
    purpose: "password_reset",
    destination: "user@example.com",
    tokenValue: raw,
  });
  const revoked = revokeRecord(fresh);
  const revokedResult = await verifyTokenRecord(revoked, raw);
  assert.equal(revokedResult.valid, false);
  assert.equal(revokedResult.reason, "revoked");

  const mismatch = await verifyTokenRecord(fresh, "some-other-token");
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.reason, "mismatch");
});

/* ------------------------------------------------------ identity topology --- */

test("topology: the human User carries no professional or company identity fields", () => {
  const columns = Object.keys(users);
  for (const forbidden of [
    "companyName", "legalName", "licenseNumber", "profession", "professions",
    "craftType", "organizationId", "businessType", "taxId", "skills",
  ]) {
    assert.equal(columns.includes(forbidden), false, `users must not carry ${forbidden}`);
  }
  // required canonical concepts exist
  for (const required of [
    "id", "email", "passwordHash", "name", "status", "isActive",
    "emailVerifiedAt", "onboardingCompletedAt", "lastLoginAt",
    "preferredLanguage", "preferredMarket", "createdAt", "updatedAt",
  ]) {
    assert.ok(columns.includes(required), `users must carry ${required}`);
  }
});

test("topology: organization membership references the SAME canonical user", () => {
  assert.ok(organizationMembers.userId, "organization_members.user_id must exist");
  assert.ok(organizations.id, "organizations table must exist");
  // an organization is not a login account: it has no credentials
  const orgColumns = Object.keys(organizations);
  for (const forbidden of ["passwordHash", "password", "email_verified_at", "sessionToken"]) {
    assert.equal(orgColumns.includes(forbidden), false, `organizations must not carry ${forbidden}`);
  }
});

test("topology: OAuth maps to the same canonical user, not a parallel user type", () => {
  const oauthColumns = Object.keys(userOauthAccounts);
  assert.ok(oauthColumns.includes("userId"), "user_oauth_accounts.user_id must exist");
  for (const forbidden of ["passwordHash", "role", "status"]) {
    assert.equal(oauthColumns.includes(forbidden), false, `user_oauth_accounts must not carry ${forbidden}`);
  }
});

test("topology: user market preference has no default and admits GLOBAL as app state", () => {
  assert.equal(users.preferredMarket.hasDefault, false, "preferred_market must have no default");
  assert.equal(users.preferredMarket.notNull, false, "preferred_market must be nullable");
  // language default is 'ar' by existing product policy; market has none.
  assert.equal(users.preferredLanguage.hasDefault, true);
});
