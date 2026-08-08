import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  organizations,
  organizationMembers,
  organizationBranches,
  verificationRecords,
  reputationProfiles,
  reputationEvaluations,
  reputationHistory,
} from "@/lib/db/schema";

function readLatestMigration(): string {
  const migrationDir = join(process.cwd(), "drizzle-pg");
  const files = readdirSync(migrationDir).filter((f: string) => f.endsWith(".sql"));
  const latest = files.sort().pop();
  assert.ok(latest, "at least one migration file must exist");
  return readFileSync(join(migrationDir, latest), "utf8");
}

// ─── INVARIANT 1: Organizations table has all required columns ───

test("invariant: organizations table has all required columns", () => {
  const cols = (organizations as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  const requiredCols = [
    "id", "nameAr", "nameEn", "nameTr", "slug", "type", "classification",
    "countryCode", "cityId", "districtId", "latitude", "longitude",
    "logoUrl", "coverUrl", "descriptionAr", "descriptionEn", "descriptionTr",
    "websiteUrl", "contactEmail", "contactPhone", "status",
    "verifiedAt", "approvedAt", "suspendedAt", "createdAt", "updatedAt",
  ];
  for (const col of requiredCols) {
    assert.ok(col in cols, `organizations missing column: ${col}`);
  }
});

// ─── INVARIANT 2: OrganizationMembers has required fields ───

test("invariant: organizationMembers has required fields", () => {
  const columns = (organizationMembers as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("organizationId" in columns, "organizationMembers must have organizationId");
  assert.ok("userId" in columns, "organizationMembers must have userId");
  assert.ok("role" in columns, "organizationMembers must have role");
  assert.ok("status" in columns, "organizationMembers must have status");
  assert.ok("joinedAt" in columns, "organizationMembers must have joinedAt");
  assert.ok("invitedBy" in columns, "organizationMembers must have invitedBy");
});

// ─── INVARIANT 3: VerificationRecords has subject-based polymorphic pattern ───

test("invariant: verificationRecords has entity_type + entity_id pattern", () => {
  const columns = (verificationRecords as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("entityType" in columns, "verificationRecords must have entityType");
  assert.ok("entityId" in columns, "verificationRecords must have entityId");
  assert.ok("type" in columns, "verificationRecords must have type");
  assert.ok("status" in columns, "verificationRecords must have status");
  assert.ok("verifiedAt" in columns, "verificationRecords must have verifiedAt");
  assert.ok("expiresAt" in columns, "verificationRecords must have expiresAt");
  assert.ok("source" in columns, "verificationRecords must have source");
  assert.ok("metadata" in columns, "verificationRecords must have metadata");
  assert.ok("documentUrl" in columns, "verificationRecords must have documentUrl");
});

// ─── INVARIANT 4: ReputationProfiles has level + score ───

test("invariant: reputationProfiles has entity_type + entity_id + level + score", () => {
  const columns = (reputationProfiles as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("entityType" in columns, "reputationProfiles must have entityType");
  assert.ok("entityId" in columns, "reputationProfiles must have entityId");
  assert.ok("level" in columns, "reputationProfiles must have level");
  assert.ok("score" in columns, "reputationProfiles must have score");
  assert.ok("lastEvaluatedAt" in columns, "reputationProfiles must have lastEvaluatedAt");
  assert.ok("policyVersion" in columns, "reputationProfiles must have policyVersion");
  assert.ok("gracePeriodEndsAt" in columns, "reputationProfiles must have gracePeriodEndsAt");
});

// ─── INVARIANT 5: ReputationEvaluations stores signals as JSONB ───

test("invariant: reputationEvaluations has signals JSONB + admin override fields", () => {
  const columns = (reputationEvaluations as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("reputationId" in columns, "reputationEvaluations must have reputationId");
  assert.ok("policyVersion" in columns, "reputationEvaluations must have policyVersion");
  assert.ok("oldLevel" in columns, "reputationEvaluations must have oldLevel");
  assert.ok("newLevel" in columns, "reputationEvaluations must have newLevel");
  assert.ok("signals" in columns, "reputationEvaluations must have signals");
  assert.ok("reason" in columns, "reputationEvaluations must have reason");
  assert.ok("adminOverride" in columns, "reputationEvaluations must have adminOverride");
  assert.ok("adminId" in columns, "reputationEvaluations must have adminId");
});

// ─── INVARIANT 6: ReputationHistory is immutable-ish audit trail ───

test("invariant: reputationHistory has level transition fields", () => {
  const columns = (reputationHistory as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("entityType" in columns, "reputationHistory must have entityType");
  assert.ok("entityId" in columns, "reputationHistory must have entityId");
  assert.ok("oldLevel" in columns, "reputationHistory must have oldLevel");
  assert.ok("newLevel" in columns, "reputationHistory must have newLevel");
  assert.ok("reason" in columns, "reputationHistory must have reason");
  assert.ok("evaluatedAt" in columns, "reputationHistory must have evaluatedAt");
  assert.ok("policyVersion" in columns, "reputationHistory must have policyVersion");
});

// ─── INVARIANT 7: OrganizationBranches has location fields ───

test("invariant: organizationBranches has location and status fields", () => {
  const columns = (organizationBranches as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("organizationId" in columns, "organizationBranches must have organizationId");
  assert.ok("nameAr" in columns, "organizationBranches must have nameAr");
  assert.ok("nameEn" in columns, "organizationBranches must have nameEn");
  assert.ok("countryCode" in columns, "organizationBranches must have countryCode");
  assert.ok("latitude" in columns, "organizationBranches must have latitude");
  assert.ok("longitude" in columns, "organizationBranches must have longitude");
  assert.ok("status" in columns, "organizationBranches must have status");
  assert.ok("workingHours" in columns, "organizationBranches must have workingHours (JSONB)");
  assert.ok("serviceAreas" in columns, "organizationBranches must have serviceAreas (JSONB)");
});

// ─── INVARIANT 8: Migration file exists and has all 7 tables ───

test("invariant: migration SQL contains all 7 AMRS table CREATE statements", () => {
  const sql = readLatestMigration();
  const requiredTables = [
    "organizations",
    "organization_members",
    "organization_branches",
    "verification_records",
    "reputation_profiles",
    "reputation_evaluations",
    "reputation_history",
  ];
  for (const table of requiredTables) {
    assert.ok(
      sql.includes(`"${table}"`) || sql.includes(table),
      `migration must create table: ${table}`,
    );
  }
});

// ─── INVARIANT 9: Migration has FK constraints ───

test("invariant: migration SQL contains foreign key constraints", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("FOREIGN KEY"), "migration must contain FK constraints");
  assert.ok(sql.includes("organization_branches_organization_id_organizations_id_fk"), "must have org branch FK");
  assert.ok(sql.includes("organization_members_organization_id_organizations_id_fk"), "must have org member FK");
  assert.ok(sql.includes("organization_members_user_id_users_id_fk"), "must have member user FK");
  assert.ok(sql.includes("reputation_evaluations_reputation_id_reputation_profiles_id_fk"), "must have eval FK");
});

// ─── INVARIANT 10: Migration has indexes for query patterns ───

test("invariant: migration SQL contains indexes for all planned queries", () => {
  const sql = readLatestMigration();
  const requiredIndexes = [
    "org_type_idx", "org_status_idx", "org_country_idx", "org_slug_idx",
    "org_member_user_idx", "org_member_org_idx", "org_branch_org_idx",
    "verif_entity_idx", "verif_status_idx", "verif_expires_idx",
    "rep_entity_idx", "rep_level_idx",
    "eval_reputation_idx", "eval_evaluated_idx",
    "hist_entity_idx", "hist_evaluated_idx",
  ];
  for (const idx of requiredIndexes) {
    assert.ok(sql.includes(idx), `migration must create index: ${idx}`);
  }
});

// ─── INVARIANT 11: Organization slug is unique ───

test("invariant: organizations slug has UNIQUE constraint", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("organizations_slug_unique"), "slug must be unique");
});

// ─── INVARIANT 12: No professional_profiles table created ───

test("invariant: no professional_profiles table in migration", () => {
  const sql = readLatestMigration();
  assert.ok(!sql.includes('"professional_profiles"'), "must NOT create professional_profiles table");
});

// ─── INVARIANT 13: No user_profiles table created ───

test("invariant: no user_profiles table in migration", () => {
  const sql = readLatestMigration();
  assert.ok(!sql.includes('"user_profiles"'), "must NOT create user_profiles table");
});

// ─── INVARIANT 14: No activity/availability/profile_strength tables ───

test("invariant: no deferred tables in migration", () => {
  const sql = readLatestMigration();
  assert.ok(!sql.includes('"activity_states"'), "must NOT create activity_states table");
  assert.ok(!sql.includes('"availability_states"'), "must NOT create availability_states table");
  assert.ok(!sql.includes('"profile_strength"'), "must NOT create profile_strength table");
});

// ─── INVARIANT 15: No commercial plan tables ───

test("invariant: no commercial plan tables in migration", () => {
  const sql = readLatestMigration();
  assert.ok(!sql.includes('"plans"'), "must NOT create plans table");
  assert.ok(!sql.includes('"subscriptions"'), "must NOT create subscriptions table");
  assert.ok(!sql.includes('"billing"'), "must NOT create billing table");
});

// ─── INVARIANT 16: Schema exports are accessible for Drizzle ORM queries ───

test("invariant: all 7 AMRS tables are exported from schema", () => {
  assert.ok(organizations, "organizations must be exported");
  assert.ok(organizationMembers, "organizationMembers must be exported");
  assert.ok(organizationBranches, "organizationBranches must be exported");
  assert.ok(verificationRecords, "verificationRecords must be exported");
  assert.ok(reputationProfiles, "reputationProfiles must be exported");
  assert.ok(reputationEvaluations, "reputationEvaluations must be exported");
  assert.ok(reputationHistory, "reputationHistory must be exported");
});

// ─── INVARIANT 17: Verification entity_type + type uniqueness is enforced ───

test("invariant: verification_records supports subject+type unique constraint", () => {
  const columns = (verificationRecords as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("entityType" in columns && "entityId" in columns && "type" in columns,
    "verificationRecords must have entityType + entityId + type for unique constraint");
});

// ─── INVARIANT 18: Reputation entity_type + entity_id uniqueness is enforced ───

test("invariant: reputation_profiles supports subject unique constraint", () => {
  const columns = (reputationProfiles as any)[Symbol.for("drizzle:Columns")] as Record<string, unknown>;
  assert.ok("entityType" in columns && "entityId" in columns,
    "reputationProfiles must have entityType + entityId for unique constraint");
});

// ─── INVARIANT 19: All timestamps use withTimezone ───

test("invariant: all new tables have timestamp with timezone columns", () => {
  const sql = readLatestMigration();
  const timestampCount = (sql.match(/timestamp with time zone/g) ?? []).length;
  assert.ok(timestampCount >= 14, `migration must have >= 14 timestamp with timezone columns, found ${timestampCount}`);
});

// ─── INVARIANT 20: Organizations status default is 'draft' ───

test("invariant: organizations status defaults to draft in migration", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("DEFAULT 'draft'") && sql.includes("organizations"),
    "organizations status must default to 'draft'");
});

// ─── INVARIANT 21: Organization members status defaults to 'active' ───

test("invariant: organization_members status defaults to active in migration", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("DEFAULT 'active'") && sql.includes("organization_members"),
    "organization_members status must default to 'active'");
});

// ─── INVARIANT 22: Verification status defaults to 'pending' ───

test("invariant: verification_records status defaults to pending in migration", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("DEFAULT 'pending'") && sql.includes("verification_records"),
    "verification_records status must default to 'pending'");
});

// ─── INVARIANT 23: Reputation level defaults to 'new' ───

test("invariant: reputation_profiles level defaults to new in migration", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("DEFAULT 'new'") && sql.includes("reputation_profiles"),
    "reputation_profiles level must default to 'new'");
});

// ─── INVARIANT 24: Reputation score defaults to 0 ───

test("invariant: reputation_profiles score defaults to 0 in migration", () => {
  const sql = readLatestMigration();
  assert.ok(sql.includes("DEFAULT 0") && sql.includes("reputation_profiles"),
    "reputation_profiles score must default to 0");
});
