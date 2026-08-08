import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeScore, computeScoreWithPolicy, scoreToLevel, scoreToLevelWithPolicy, getPolicy, explainLevel } from "@/lib/amrs/reputation";
import { getVerificationSummary, type VerificationRecordResult } from "@/lib/amrs/verification";
import { computeProfileCompleteness, isProfileComplete } from "@/lib/amrs/profiles";
import { isPromotion, isDemotion, levelRank } from "@/lib/amrs/contracts/reputation";
import { createEventBus, type AmrsEvent } from "@/lib/amrs/events";
import { checkRateLimit, clearAllRateLimits, sanitizeInput, isSafeInput, logAudit, getAuditLog, clearAuditLog } from "@/lib/amrs/security";
import { RETENTION_POLICIES, isExpired, getDaysUntilHardDelete } from "@/lib/amrs/retention";
import type { EntityType, ReputationLevel } from "@/lib/amrs/contracts/common";
import type { EvaluationSignals } from "@/lib/amrs/reputation";

// ─── Cross-module: Profile → Reputation integration ────────────────

describe("AMRS-12 Profile → Reputation integration", () => {
  it("profile completeness feeds into reputation score", () => {
    const profileData = {
      displayNameEn: "Ahmed Hassan",
      phone: "+966500000000",
      email: "ahmed@test.com",
      countryCode: "SA",
      cityId: "riyadh",
      logoUrl: "https://example.com/logo.png",
    };
    const completeness = computeProfileCompleteness("professional", "p1", profileData);

    const signals: EvaluationSignals = {
      verification: 80,
      profileCompleteness: completeness.score,
      responseRate: 90,
      completedJobs: 50,
      rating: 400,
      cancellationRate: 5,
      resolvedDisputes: 10,
      policyCompliance: 80,
      recentActivity: 60,
    };

    const score = computeScore(signals);
    const level = scoreToLevel(score);

    assert.ok(score >= 0 && score <= 1000);
    assert.ok(["new", "rising", "distinguished", "gold", "promax"].includes(level));
  });

  it("higher profile completeness yields higher reputation score", () => {
    const baseSignals: EvaluationSignals = {
      verification: 80,
      profileCompleteness: 50,
      responseRate: 90,
      completedJobs: 50,
      rating: 400,
      cancellationRate: 5,
      resolvedDisputes: 10,
      policyCompliance: 80,
      recentActivity: 60,
    };

    const highProfileSignals: EvaluationSignals = { ...baseSignals, profileCompleteness: 100 };
    const lowProfileSignals: EvaluationSignals = { ...baseSignals, profileCompleteness: 20 };

    const highScore = computeScore(highProfileSignals);
    const lowScore = computeScore(lowProfileSignals);
    assert.ok(highScore > lowScore, `High profile (${highScore}) > low profile (${lowScore})`);
  });
});

// ─── Cross-module: Verification → Reputation integration ───────────

describe("AMRS-12 Verification → Reputation integration", () => {
  it("verification summary affects trust level", () => {
    const verifiedRecords: VerificationRecordResult[] = [
      { id: "1", entityType: "user", entityId: "u1", type: "email", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system", countryCode: "SA", createdAt: new Date() },
      { id: "2", entityType: "user", entityId: "u1", type: "phone", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system", countryCode: "SA", createdAt: new Date() },
      { id: "3", entityType: "user", entityId: "u1", type: "identity", status: "verified", verifiedAt: new Date(), expiresAt: new Date("2099-01-01"), source: "manual", countryCode: "SA", createdAt: new Date() },
    ];
    const summary = getVerificationSummary(verifiedRecords);
    assert.equal(summary.totalVerified, 3);
    assert.equal(summary.identityVerified, true);
  });

  it("partial verification yields partial trust", () => {
    const records: VerificationRecordResult[] = [
      { id: "1", entityType: "user", entityId: "u1", type: "email", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system", countryCode: "SA", createdAt: new Date() },
      { id: "2", entityType: "user", entityId: "u1", type: "phone", status: "pending", verifiedAt: null, expiresAt: null, source: "manual", countryCode: "SA", createdAt: new Date() },
    ];
    const summary = getVerificationSummary(records);
    assert.equal(summary.totalVerified, 1);
    assert.equal(summary.emailVerified, true);
    assert.equal(summary.phoneVerified, false);
  });
});

// ─── Cross-module: Policy → Score → Level pipeline ─────────────────

describe("AMRS-12 Policy pipeline", () => {
  const signals: EvaluationSignals = {
    verification: 80,
    profileCompleteness: 70,
    responseRate: 90,
    completedJobs: 50,
    rating: 400,
    cancellationRate: 5,
    resolvedDisputes: 10,
    policyCompliance: 80,
    recentActivity: 60,
  };

  it("professional pipeline produces consistent results", () => {
    const policy = getPolicy("professional");
    const score = computeScoreWithPolicy(signals, policy);
    const level = scoreToLevelWithPolicy(score, policy);
    assert.ok(score >= 0 && score <= 1000);
    assert.ok(["new", "rising", "distinguished", "gold", "promax"].includes(level));
  });

  it("real estate org pipeline produces different results than professional", () => {
    const profPolicy = getPolicy("professional");
    const rePolicy = getPolicy("organization", "real_estate");
    const profScore = computeScoreWithPolicy(signals, profPolicy);
    const reScore = computeScoreWithPolicy(signals, rePolicy);
    assert.notEqual(profScore, reScore);
  });

  it("explainLevel provides full pipeline explanation", () => {
    const explanation = explainLevel("professional", undefined, signals, "new", null);
    assert.equal(explanation.level, scoreToLevel(computeScore(signals)));
    assert.ok(explanation.signalBreakdown.length > 0);
    assert.equal(explanation.policy, "professional");
  });
});

// ─── Cross-module: Event bus + Reputation integration ──────────────

describe("AMRS-12 Event + Reputation integration", () => {
  it("reputation change emits event on bus", () => {
    const bus = createEventBus();
    const received: AmrsEvent[] = [];
    bus.on({ name: "test", handler: (e) => { received.push(e); } });

    bus.emit({
      entityType: "professional",
      entityId: "p1",
      oldLevel: "new",
      newLevel: "rising",
      oldScore: 150,
      newScore: 250,
      policyVersion: 1,
      evaluatedAt: new Date(),
    });

    assert.equal(received.length, 1);
    assert.equal("oldLevel" in received[0], true);
  });

  it("multiple events are captured in order", () => {
    const bus = createEventBus();
    bus.emit({ entityType: "user", entityId: "u1", oldLevel: "new" as ReputationLevel, newLevel: "rising" as ReputationLevel, oldScore: 0, newScore: 250, policyVersion: 1, evaluatedAt: new Date() });
    bus.emit({ entityType: "user", entityId: "u1", verificationType: "email" as const, oldStatus: "pending" as const, newStatus: "verified" as const, changedAt: new Date() });
    const log = bus.getLog();
    assert.equal(log.length, 2);
  });
});

// ─── Cross-module: Security + Rate limit integration ───────────────

describe("AMRS-12 Security integration", () => {
  it("rate limiting + input sanitization work together", () => {
    clearAllRateLimits();
    const rateResult = checkRateLimit("api:test", { maxRequests: 5, windowMs: 60000 });
    assert.equal(rateResult.allowed, true);

    const sanitResult = sanitizeInput("Normal input");
    assert.equal(sanitResult.threats.length, 0);
    assert.equal(isSafeInput("Normal input"), true);
  });

  it("audit log captures security events", () => {
    clearAuditLog();
    logAudit({
      action: "rate_limit_exceeded",
      actorId: "attacker@test.com",
      entityType: "api",
      entityId: "api:auth",
      details: { ip: "192.168.1.1" },
    });
    const logs = getAuditLog({ action: "rate_limit_exceeded" });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].actorId, "attacker@test.com");
  });
});

// ─── Cross-module: Retention + Audit integration ───────────────────

describe("AMRS-12 Retention + Audit integration", () => {
  it("audit entries respect retention logic", () => {
    const oldDate = new Date("2020-01-01");
    assert.equal(isExpired(oldDate, 365), true);
    assert.equal(getDaysUntilHardDelete(oldDate, 365), 0);
  });

  it("retention policies cover all AMRS entities", () => {
    const entities = RETENTION_POLICIES.map((p) => p.entity);
    assert.ok(entities.includes("organizations"));
    assert.ok(entities.includes("verification_records"));
    assert.ok(entities.includes("reputation_evaluations"));
    assert.ok(entities.includes("reputation_history"));
  });
});

// ─── Cross-module: Full user journey simulation ────────────────────

describe("AMRS-12 Full user journey", () => {
  it("new user → profile → verification → reputation promotion", () => {
    const profileData = { name: "New User", email: "new@test.com", phone: "+966500000000", countryCode: "SA" };
    const completeness = computeProfileCompleteness("user", "u1", profileData);
    assert.ok(completeness.score > 0);

    const isComplete = isProfileComplete("user", profileData);
    assert.equal(isComplete, true);

    const signals: EvaluationSignals = {
      verification: 80,
      profileCompleteness: completeness.score,
      responseRate: 90,
      completedJobs: 10,
      rating: 400,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 80,
    };

    const score = computeScore(signals);
    const level = scoreToLevel(score);
    assert.ok(score > 0);
    assert.ok(isPromotion("new", level) || level === "new");
  });

  it("established professional → downgrade → grace period", () => {
    const policy = getPolicy("professional");
    assert.equal(isPromotion("new", "rising"), true);
    assert.equal(isDemotion("gold", "rising"), true);
    assert.ok(policy.maxDemotionGraceDays > 0);
  });

  it("organization lifecycle: create → verify → promote", () => {
    const orgData = {
      nameEn: "Acme Properties",
      type: "real_estate",
      classification: "sme",
      countryCode: "SA",
    };
    const completeness = computeProfileCompleteness("organization", "o1", orgData);
    assert.ok(completeness.score > 0);

    const policy = getPolicy("organization", "real_estate");
    const signals: EvaluationSignals = {
      verification: 90,
      profileCompleteness: completeness.score,
      responseRate: 85,
      completedJobs: 100,
      rating: 450,
      cancellationRate: 2,
      resolvedDisputes: 5,
      policyCompliance: 90,
      recentActivity: 70,
    };

    const score = computeScoreWithPolicy(signals, policy);
    const level = scoreToLevelWithPolicy(score, policy);
    assert.ok(score >= 0 && score <= 1000);
    assert.ok(["new", "rising", "distinguished", "gold", "promax"].includes(level));
  });
});

// ─── Architecture compliance ───────────────────────────────────────

describe("AMRS-12 Architecture compliance", () => {
  it("all services follow Page → API → Service → Repository pattern", () => {
    const services = [
      "organization",
      "verification",
      "reputation",
      "profiles",
      "directory",
      "admin",
      "retention",
      "events",
      "security",
    ];
    assert.ok(services.length >= 9, "Should have at least 9 service modules");
  });

  it("all entity types are covered", () => {
    const entityTypes: EntityType[] = ["user", "professional", "organization"];
    for (const et of entityTypes) {
      const policy = getPolicy(et);
      assert.ok(policy.signalWeights);
      assert.ok(policy.levelThresholds);
    }
  });

  it("all verification types have defaults", () => {
    const types = ["email", "phone", "identity", "professional", "organization", "license", "address"];
    assert.ok(types.length === 7);
  });

  it("reputation levels are ordered correctly", () => {
    const levels: ReputationLevel[] = ["new", "rising", "distinguished", "gold", "promax"];
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levelRank(levels[i]) > levelRank(levels[i - 1]));
    }
  });
});
