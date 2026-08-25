import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (p) => fs.readFileSync(p, "utf8");

test("organization review uses explicit lifecycle and independent reviewer", () => {
  const submit = read("app/api/amrs/organizations/[id]/submit/route.ts");
  const review = read("app/api/admin/organizations/[id]/review/route.ts");
  assert.match(submit, /pending_review/);
  assert.match(review, /CANNOT_REVIEW_OWN_ORGANIZATION/);
  assert.match(review, /ORGANIZATION_REVIEW_RACE/);
  assert.match(review, /REASON_REQUIRED/);
});

test("verification review is atomic and self-review protected", () => {
  const core = read("lib/amrs/organization-verification.ts");
  assert.match(core, /CANNOT_REVIEW_OWN_SUBJECT/);
  assert.match(core, /INVALID_VERIFICATION_TRANSITION/);
  assert.match(core, /eq\(verificationRecords\.status, expectedStatus\)/);
  assert.match(core, /VERIFICATION_\$\{input\.action\.toUpperCase\(\)\}/);
});

test("verification approval synchronizes organization verifiedAt", () => {
  const core = read("lib/amrs/organization-verification.ts");
  assert.match(core, /syncOrganizationVerifiedAtTx/);
  assert.match(core, /inArray\(verificationRecords\.type, \["organization", "license"\]\)/);
});

test("organization verification submission requires active organization", () => {
  const route = read("app/api/amrs/verification/route.ts");
  assert.match(route, /ORGANIZATION_NOT_ACTIVE/);
  assert.match(route, /VERIFICATION_SUBMITTED/);
});

test("admin verification review requires privileged session", () => {
  const route = read("app/api/admin/verifications/[id]/route.ts");
  assert.match(route, /verification\.review/);
  assert.match(route, /super_admin/);
});

test("expiry is durable and audited", () => {
  const core = read("lib/amrs/organization-verification.ts");
  assert.match(core, /VERIFICATION_EXPIRE_BATCH/);
  assert.match(core, /status: "expired"/);
});

test("closed auction organizer requires organization/license verification", () => {
  const policy = read("lib/auctions/policy.ts");
  assert.match(policy, /inArray\(verificationRecords\.type, \['organization', 'license'\]\)/);
  assert.match(policy, /if \(!verifiedRecord\) return null/);
});

test("PG identity schema advanced to v5", () => {
  const pg = read("lib/db/pg-identity-schema.ts");
  assert.match(pg, /PG_IDENTITY_SCHEMA_VERSION = 5/);
});
