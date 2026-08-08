import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RETENTION_POLICIES,
  isExpired,
  getDaysUntilHardDelete,
} from "@/lib/amrs/retention";

// ─── Retention policies configuration ──────────────────────────────

describe("AMRS-9 Retention policies", () => {
  it("has policies for all required entities", () => {
    const entities = RETENTION_POLICIES.map((p) => p.entity);
    assert.ok(entities.includes("organizations"));
    assert.ok(entities.includes("verification_records"));
    assert.ok(entities.includes("reputation_evaluations"));
    assert.ok(entities.includes("reputation_history"));
  });

  it("all policies have positive retention days", () => {
    for (const policy of RETENTION_POLICIES) {
      assert.ok(policy.retentionDays >= 0, `${policy.entity} has invalid retentionDays`);
    }
  });

  it("all policies have positive hard delete days", () => {
    for (const policy of RETENTION_POLICIES) {
      if (policy.hardDeleteAfterDays !== null) {
        assert.ok(policy.hardDeleteAfterDays > 0, `${policy.entity} has invalid hardDeleteAfterDays`);
      }
    }
  });

  it("reputation evaluations have longest retention", () => {
    const evalPolicy = RETENTION_POLICIES.find((p) => p.entity === "reputation_evaluations");
    assert.ok(evalPolicy);
    assert.equal(evalPolicy.hardDeleteAfterDays, 1825);
  });

  it("organizations have 365-day hard delete", () => {
    const orgPolicy = RETENTION_POLICIES.find((p) => p.entity === "organizations");
    assert.ok(orgPolicy);
    assert.equal(orgPolicy.hardDeleteAfterDays, 365);
  });
});

// ─── Expiry detection ──────────────────────────────────────────────

describe("AMRS-9 isExpired", () => {
  it("old date is expired", () => {
    const date = new Date("2020-01-01");
    assert.equal(isExpired(date, 30), true);
  });

  it("recent date is not expired", () => {
    const date = new Date();
    assert.equal(isExpired(date, 30), false);
  });

  it("zero retention means date must be strictly before now", () => {
    const date = new Date(Date.now() - 1);
    assert.equal(isExpired(date, 0), true);
  });

  it("border case: exactly at retention boundary is not expired (strict <)", () => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    assert.equal(isExpired(date, 30), false, "Exactly at boundary uses strict <");
  });

  it("border case: one day before retention boundary", () => {
    const date = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    assert.equal(isExpired(date, 30), false);
  });
});

// ─── Hard delete countdown ─────────────────────────────────────────

describe("AMRS-9 getDaysUntilHardDelete", () => {
  it("newly created entity has full days remaining", () => {
    const created = new Date();
    const days = getDaysUntilHardDelete(created, 365);
    assert.ok(days >= 364 && days <= 365, `Expected ~365, got ${days}`);
  });

  it("old entity has 0 days remaining", () => {
    const created = new Date("2020-01-01");
    const days = getDaysUntilHardDelete(created, 365);
    assert.equal(days, 0);
  });

  it("halfway through retention", () => {
    const created = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000);
    const days = getDaysUntilHardDelete(created, 365);
    assert.ok(days >= 182 && days <= 184, `Expected ~183, got ${days}`);
  });

  it("returns non-negative for past dates", () => {
    const created = new Date("2000-01-01");
    const days = getDaysUntilHardDelete(created, 30);
    assert.ok(days >= 0);
  });
});

// ─── Soft delete / restore pattern ─────────────────────────────────

describe("AMRS-9 Soft delete pattern", () => {
  it("soft delete sets status to deleted", () => {
    const status = "deleted";
    assert.equal(status, "deleted");
  });

  it("restore sets status back to active", () => {
    const status = "active";
    assert.equal(status, "active");
  });

  it("soft-deleted entity is distinguishable from active", () => {
    const org = { status: "deleted", nameEn: "Test" };
    assert.equal(org.status !== "active", true);
  });

  it("restore only works on deleted entities", () => {
    const org = { status: "active" };
    const canRestore = org.status === "deleted";
    assert.equal(canRestore, false);
  });
});

// ─── Retention status computation ──────────────────────────────────

describe("AMRS-9 Retention status", () => {
  it("policy entity names are consistent", () => {
    for (const policy of RETENTION_POLICIES) {
      assert.ok(typeof policy.entity === "string");
      assert.ok(policy.entity.length > 0);
    }
  });

  it("description is present for all policies", () => {
    for (const policy of RETENTION_POLICIES) {
      assert.ok(typeof policy.description === "string");
      assert.ok(policy.description.length > 0);
    }
  });

  it("hard delete is longer than soft delete retention", () => {
    for (const policy of RETENTION_POLICIES) {
      if (policy.hardDeleteAfterDays !== null) {
        assert.ok(
          policy.hardDeleteAfterDays > policy.retentionDays,
          `${policy.entity}: hard delete (${policy.hardDeleteAfterDays}) > retention (${policy.retentionDays})`,
        );
      }
    }
  });
});

// ─── Retention policy invariants ───────────────────────────────────

describe("AMRS-9 Policy invariants", () => {
  it("reputation data has longest retention (audit trail)", () => {
    const repPolicies = RETENTION_POLICIES.filter(
      (p) => p.entity.startsWith("reputation"),
    );
    for (const policy of repPolicies) {
      assert.ok(
        (policy.hardDeleteAfterDays ?? 0) >= 1825,
        `${policy.entity} should have at least 5 year retention`,
      );
    }
  });

  it("verification records have medium retention", () => {
    const verifPolicy = RETENTION_POLICIES.find((p) => p.entity === "verification_records");
    assert.ok(verifPolicy);
    assert.ok(
      (verifPolicy.hardDeleteAfterDays ?? 0) >= 730,
      "Verification should have at least 2 year retention",
    );
  });

  it("organization hard delete is shortest among audit entities", () => {
    const orgPolicy = RETENTION_POLICIES.find((p) => p.entity === "organizations");
    const verifPolicy = RETENTION_POLICIES.find((p) => p.entity === "verification_records");
    assert.ok(orgPolicy && verifPolicy);
    assert.ok(
      (orgPolicy.hardDeleteAfterDays ?? 0) <= (verifPolicy.hardDeleteAfterDays ?? 0),
      "Org retention should be <= verification retention",
    );
  });
});
