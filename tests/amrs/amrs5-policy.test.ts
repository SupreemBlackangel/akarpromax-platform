import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeScore,
  computeScoreWithPolicy,
  scoreToLevel,
  scoreToLevelWithPolicy,
  getPolicy,
  isEligibleForPromax,
  shouldApplyGracePeriod,
  getGracePeriodEndsAt,
  explainLevel,
  type EvaluationSignals,
} from "@/lib/amrs/reputation";
import { isPromotion, isDemotion } from "@/lib/amrs/contracts/reputation";
import type { EntityType, OrganizationType } from "@/lib/amrs/contracts/common";

const FULL_SIGNALS: EvaluationSignals = {
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

// ─── Policy selection ──────────────────────────────────────────────

describe("AMRS-5 Policy selection", () => {
  it("returns professional policy for professional entity", () => {
    const p = getPolicy("professional");
    assert.equal(p.entityType, "professional");
    assert.ok(p.signalWeights.verification > 0);
  });

  it("returns real estate org policy", () => {
    const p = getPolicy("organization", "real_estate");
    assert.equal(p.entityType, "organization");
    assert.equal(p.organizationType, "real_estate");
    assert.ok(p.signalWeights.verification >= 0.25, "Real estate should weight verification higher");
  });

  it("returns business org policy", () => {
    const p = getPolicy("organization", "business");
    assert.equal(p.entityType, "organization");
    assert.equal(p.organizationType, "business");
  });

  it("returns user policy for user entity", () => {
    const p = getPolicy("user");
    assert.equal(p.entityType, "user");
  });

  it("unknown organization type falls back to business", () => {
    const p = getPolicy("organization", "unknown" as OrganizationType);
    assert.equal(p.entityType, "organization");
  });
});

// ─── Policy-specific scoring ───────────────────────────────────────

describe("AMRS-5 Policy-specific scoring", () => {
  it("professional policy computes score correctly", () => {
    const policy = getPolicy("professional");
    const score = computeScoreWithPolicy(FULL_SIGNALS, policy);
    assert.ok(score >= 0 && score <= 1000, `Score ${score} out of range`);
  });

  it("real estate policy gives different score than professional", () => {
    const profPolicy = getPolicy("professional");
    const rePolicy = getPolicy("organization", "real_estate");
    const profScore = computeScoreWithPolicy(FULL_SIGNALS, profPolicy);
    const reScore = computeScoreWithPolicy(FULL_SIGNALS, rePolicy);
    assert.notEqual(profScore, reScore, "Different policies should produce different scores");
  });

  it("policy-specific thresholds map to correct levels", () => {
    const policy = getPolicy("professional");
    const risingScore = policy.levelThresholds.rising;
    const level = scoreToLevelWithPolicy(risingScore, policy);
    assert.equal(level, "rising");
  });
});

// ─── ProMax eligibility ────────────────────────────────────────────

describe("AMRS-5 ProMax eligibility", () => {
  it("eligible when all requirements met", () => {
    const policy = getPolicy("professional");
    const signals: EvaluationSignals = {
      verification: 100,
      profileCompleteness: 100,
      responseRate: 90,
      completedJobs: 100,
      rating: 500,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 100,
    };
    const result = isEligibleForPromax(signals, policy);
    assert.equal(result.eligible, true);
    assert.equal(result.reasons.length, 0);
  });

  it("not eligible when verification too low", () => {
    const policy = getPolicy("professional");
    const signals: EvaluationSignals = {
      verification: 50,
      profileCompleteness: 100,
      responseRate: 90,
      completedJobs: 100,
      rating: 500,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 100,
    };
    const result = isEligibleForPromax(signals, policy);
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.some((r) => r.includes("verification")));
  });

  it("not eligible when jobs too low", () => {
    const policy = getPolicy("professional");
    const signals: EvaluationSignals = {
      verification: 100,
      profileCompleteness: 100,
      responseRate: 90,
      completedJobs: 10,
      rating: 500,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 100,
    };
    const result = isEligibleForPromax(signals, policy);
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.some((r) => r.includes("completed jobs")));
  });

  it("not eligible when rating too low", () => {
    const policy = getPolicy("professional");
    const signals: EvaluationSignals = {
      verification: 100,
      profileCompleteness: 100,
      responseRate: 90,
      completedJobs: 100,
      rating: 300,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 100,
    };
    const result = isEligibleForPromax(signals, policy);
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.some((r) => r.includes("rating")));
  });

  it("real estate requires higher verification for promax", () => {
    const rePolicy = getPolicy("organization", "real_estate");
    const signals: EvaluationSignals = {
      verification: 85,
      profileCompleteness: 100,
      responseRate: 90,
      completedJobs: 200,
      rating: 500,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 100,
      recentActivity: 100,
    };
    const result = isEligibleForPromax(signals, rePolicy);
    assert.equal(result.eligible, false, "RE org needs verification >= 90");
    assert.ok(result.reasons.some((r) => r.includes("verification")));
  });
});

// ─── Grace period ──────────────────────────────────────────────────

describe("AMRS-5 Grace period", () => {
  it("single-level demotion triggers grace period", () => {
    const policy = getPolicy("professional");
    assert.equal(shouldApplyGracePeriod("gold", "distinguished", policy), true);
  });

  it("two-level demotion does not trigger grace", () => {
    const policy = getPolicy("professional");
    assert.equal(shouldApplyGracePeriod("gold", "rising", policy), false);
  });

  it("promotion does not trigger grace", () => {
    const policy = getPolicy("professional");
    assert.equal(shouldApplyGracePeriod("new", "rising", policy), false);
  });

  it("same level does not trigger grace", () => {
    const policy = getPolicy("professional");
    assert.equal(shouldApplyGracePeriod("gold", "gold", policy), false);
  });

  it("grace period end date is correct", () => {
    const policy = getPolicy("professional");
    const demotedAt = new Date("2026-01-01");
    const endsAt = getGracePeriodEndsAt(policy, demotedAt);
    const expectedDays = policy.maxDemotionGraceDays;
    const actualDays = Math.round(
      (endsAt.getTime() - demotedAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    assert.equal(actualDays, expectedDays);
  });

  it("real estate org has longer grace period than professional", () => {
    const profPolicy = getPolicy("professional");
    const rePolicy = getPolicy("organization", "real_estate");
    assert.ok(
      rePolicy.maxDemotionGraceDays >= profPolicy.maxDemotionGraceDays,
      "RE org should have equal or longer grace",
    );
  });
});

// ─── Level explanation model ───────────────────────────────────────

describe("AMRS-5 Level explanation", () => {
  it("returns correct level and score", () => {
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      null,
      null,
    );
    assert.equal(typeof explanation.level, "string");
    assert.ok(typeof explanation.score === "number");
    assert.ok(explanation.score >= 0 && explanation.score <= 1000);
  });

  it("includes signal breakdown", () => {
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      null,
      null,
    );
    assert.ok(explanation.signalBreakdown.length > 0, "Should have signal breakdown");
    const totalContribution = explanation.signalBreakdown.reduce(
      (sum, s) => sum + s.contribution,
      0,
    );
    assert.ok(
      Math.abs(totalContribution - explanation.score) <= 1,
      `Contributions (${totalContribution}) should match score (${explanation.score}) within rounding`,
    );
  });

  it("identifies promotion correctly", () => {
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      "new",
      null,
    );
    const expectedLevel = scoreToLevel(computeScore(FULL_SIGNALS));
    assert.equal(explanation.isPromotion, isPromotion("new", expectedLevel));
  });

  it("identifies demotion correctly", () => {
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      "promax",
      null,
    );
    const expectedLevel = scoreToLevel(computeScore(FULL_SIGNALS));
    assert.equal(explanation.isDemotion, isDemotion("promax", expectedLevel));
  });

  it("reports grace period when active", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      "gold",
      futureDate,
    );
    assert.equal(explanation.inGracePeriod, true);
    assert.equal(explanation.gracePeriodEndsAt, futureDate);
  });

  it("reports no grace period when null", () => {
    const explanation = explainLevel(
      "professional",
      undefined,
      FULL_SIGNALS,
      "gold",
      null,
    );
    assert.equal(explanation.inGracePeriod, false);
  });

  it("includes policy name", () => {
    const profExplanation = explainLevel("professional", undefined, FULL_SIGNALS, null, null);
    assert.equal(profExplanation.policy, "professional");

    const reExplanation = explainLevel("organization", "real_estate", FULL_SIGNALS, null, null);
    assert.equal(reExplanation.policy, "organization:real_estate");
  });
});

// ─── Cross-policy threshold differences ────────────────────────────

describe("AMRS-5 Cross-policy thresholds", () => {
  it("real estate org has lower rising threshold than professional", () => {
    const prof = getPolicy("professional");
    const re = getPolicy("organization", "real_estate");
    assert.ok(re.levelThresholds.rising < prof.levelThresholds.rising);
  });

  it("business org has similar thresholds to professional", () => {
    const prof = getPolicy("professional");
    const biz = getPolicy("organization", "business");
    const diff = Math.abs(biz.levelThresholds.rising - prof.levelThresholds.rising);
    assert.ok(diff < 50, "Business and professional thresholds should be close");
  });

  it("all policies have consistent threshold ordering", () => {
    const entityTypes: EntityType[] = ["professional", "user"];
    const orgTypes: OrganizationType[] = ["real_estate", "business", "other"];

    for (const et of entityTypes) {
      const policy = getPolicy(et);
      assert.ok(policy.levelThresholds.new < policy.levelThresholds.rising);
      assert.ok(policy.levelThresholds.rising < policy.levelThresholds.distinguished);
      assert.ok(policy.levelThresholds.distinguished < policy.levelThresholds.gold);
      assert.ok(policy.levelThresholds.gold < policy.levelThresholds.promax);
    }
    for (const ot of orgTypes) {
      const policy = getPolicy("organization", ot);
      assert.ok(policy.levelThresholds.new < policy.levelThresholds.rising);
      assert.ok(policy.levelThresholds.rising < policy.levelThresholds.distinguished);
      assert.ok(policy.levelThresholds.distinguished < policy.levelThresholds.gold);
      assert.ok(policy.levelThresholds.gold < policy.levelThresholds.promax);
    }
  });
});

// ─── computeScore with negative weights ────────────────────────────

describe("AMRS-5 Negative weight scoring", () => {
  it("cancellation rate penalty works correctly", () => {
    const clean: EvaluationSignals = { ...FULL_SIGNALS, cancellationRate: 0 };
    const dirty: EvaluationSignals = { ...FULL_SIGNALS, cancellationRate: 50 };

    const policy = getPolicy("professional");
    const cleanScore = computeScoreWithPolicy(clean, policy);
    const dirtyScore = computeScoreWithPolicy(dirty, policy);
    assert.ok(dirtyScore < cleanScore, `Dirty (${dirtyScore}) < clean (${cleanScore})`);
  });

  it("penalty magnitude is proportional to signal value", () => {
    const policy = getPolicy("professional");
    const low: EvaluationSignals = { ...FULL_SIGNALS, cancellationRate: 10 };
    const high: EvaluationSignals = { ...FULL_SIGNALS, cancellationRate: 50 };
    const lowScore = computeScoreWithPolicy(low, policy);
    const highScore = computeScoreWithPolicy(high, policy);
    assert.ok(highScore < lowScore, `High cancel (${highScore}) < low cancel (${lowScore})`);
  });
});
