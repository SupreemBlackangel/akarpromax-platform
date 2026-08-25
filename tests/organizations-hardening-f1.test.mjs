import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("organization membership is unique per organization/user", () => {
  const schema = read("lib/db/schema.ts");
  assert.match(schema, /org_member_org_user_unique/);
  const migration = read("drizzle-pg/0013_organizations_hardening_f1.sql");
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS org_member_org_user_unique/);
});

test("verification pending race is constrained", () => {
  const migration = read("drizzle-pg/0013_organizations_hardening_f1.sql");
  assert.match(migration, /verif_one_pending_subject_type/);
  assert.match(migration, /WHERE status = 'pending'/);
});

test("Arabic-only organization names receive safe slug fallback", () => {
  const core = read("lib/amrs/organization.ts");
  assert.match(core, /randomUUID/);
  assert.match(core, /slugify\(input\.nameEn \|\| input\.nameAr \|\| ""\) \|\|/);
});

test("mine organizations is membership-scoped", () => {
  const route = read("app/api/amrs/organizations/route.ts");
  assert.match(route, /q\.get\("mine"\) === "1"/);
  assert.match(route, /organizationMembers\.userId/);
  assert.match(route, /organizationMembers\.status, "active"/);
});

test("member route protects owner/admin membership rules", () => {
  const route = read("app/api/amrs/organizations/[id]/members/route.ts");
  assert.match(route, /OWNER_MEMBERSHIP_PROTECTED/);
  assert.match(route, /OWNER_REQUIRED_FOR_ADMIN_ROLE/);
  assert.match(route, /CANNOT_DISABLE_SELF/);
  assert.match(route, /USER_NOT_AVAILABLE/);
});

test("verification endpoint is subject-authorized and uses user UUID", () => {
  const route = read("app/api/amrs/verification/route.ts");
  assert.match(route, /q\.get\("entityId"\) \?\? session\.userId/);
  assert.match(route, /canManageSubject/);
  assert.doesNotMatch(route, /identity\.email/);
});

test("office detail respects id and office type", () => {
  const route = read("app/api/offices/[id]/route.ts");
  assert.match(route, /eq\(organizations\.id, id\)/);
  assert.match(route, /eq\(organizations\.type, "real_estate"\)/);
});

test("companies exclude law offices", () => {
  const route = read("app/api/companies/route.ts");
  assert.match(route, /inArray\(organizations\.type, \["business", "other"\]\)/);
  const detail = read("app/api/companies/[id]/route.ts");
  assert.match(detail, /inArray\(organizations\.type, \["business", "other"\]\)/);
});

test("PG identity schema is canonical version 5 and reproduces F1 indexes", () => {
  const pg = read("lib/db/pg-identity-schema.ts");
  assert.match(pg, /PG_IDENTITY_SCHEMA_VERSION = 5/);
  assert.match(pg, /org_member_org_user_unique/);
  assert.match(pg, /verif_one_pending_subject_type/);
});
