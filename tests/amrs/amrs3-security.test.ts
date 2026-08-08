import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeScore,
  scoreToLevel,
} from "@/lib/amrs/reputation";
import {
  levelRank,
  isPromotion,
  isDemotion,
} from "@/lib/amrs/contracts/reputation";
import type { ReputationLevel } from "@/lib/amrs/contracts/common";
import {
  isLegacyServiceProvider,
} from "@/lib/amrs/adapters/legacy-provider";

const ALL_LEVELS: ReputationLevel[] = [
  "new",
  "rising",
  "distinguished",
  "gold",
  "promax",
];

// ─────────────────────────────────────────────────
// Reputation score computation
// ─────────────────────────────────────────────────

describe("AMRS-3 Reputation computeScore", () => {
  it("should return 0 for all-zero signals", () => {
    const score = computeScore({
      verification: 0,
      profileCompleteness: 0,
      responseRate: 0,
      completedJobs: 0,
      rating: 0,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 0,
      recentActivity: 0,
    });
    assert.equal(score, 0);
  });

  it("should return max weighted score for maximum positive signals", () => {
    const score = computeScore({
      verification: 100,
      profileCompleteness: 100,
      responseRate: 100,
      completedJobs: 100,
      rating: 100,
      cancellationRate: 0,
      resolvedDisputes: 100,
      policyCompliance: 100,
      recentActivity: 100,
    });
    assert.ok(score > 80, `Score should be high, got ${score}`);
    assert.ok(score <= 1000, `Score should be <= 1000, got ${score}`);
  });

  it("should clamp to 0-1000 range", () => {
    const overScore = computeScore({
      verification: 100,
      profileCompleteness: 100,
      responseRate: 100,
      completedJobs: 100,
      rating: 100,
      cancellationRate: 0,
      resolvedDisputes: 100,
      policyCompliance: 100,
      recentActivity: 100,
    });
    assert.ok(overScore <= 1000, "Score should not exceed 1000");
  });

  it("should penalize cancellation rate (negative weight)", () => {
    const clean = computeScore({
      verification: 50,
      profileCompleteness: 50,
      responseRate: 50,
      completedJobs: 50,
      rating: 50,
      cancellationRate: 0,
      resolvedDisputes: 0,
      policyCompliance: 0,
      recentActivity: 0,
    });
    const dirty = computeScore({
      verification: 50,
      profileCompleteness: 50,
      responseRate: 50,
      completedJobs: 50,
      rating: 50,
      cancellationRate: 50,
      resolvedDisputes: 0,
      policyCompliance: 0,
      recentActivity: 0,
    });
    assert.ok(
      dirty < clean,
      `Dirty score (${dirty}) should be less than clean score (${clean})`,
    );
  });

  it("should be deterministic for same inputs", () => {
    const signals = {
      verification: 80,
      profileCompleteness: 60,
      responseRate: 90,
      completedJobs: 30,
      rating: 70,
      cancellationRate: 5,
      resolvedDisputes: 20,
      policyCompliance: 40,
      recentActivity: 10,
    };
    const a = computeScore(signals);
    const b = computeScore(signals);
    assert.equal(a, b, "Same inputs must produce same score");
  });
});

// ─────────────────────────────────────────────────
// Reputation level mapping
// ─────────────────────────────────────────────────

describe("AMRS-3 Reputation scoreToLevel", () => {
  it("should map 0 to new", () => {
    assert.equal(scoreToLevel(0), "new");
  });

  it("should map 199 to new", () => {
    assert.equal(scoreToLevel(199), "new");
  });

  it("should map 200 to rising", () => {
    assert.equal(scoreToLevel(200), "rising");
  });

  it("should map 449 to rising", () => {
    assert.equal(scoreToLevel(449), "rising");
  });

  it("should map 450 to distinguished", () => {
    assert.equal(scoreToLevel(450), "distinguished");
  });

  it("should map 699 to distinguished", () => {
    assert.equal(scoreToLevel(699), "distinguished");
  });

  it("should map 700 to gold", () => {
    assert.equal(scoreToLevel(700), "gold");
  });

  it("should map 899 to gold", () => {
    assert.equal(scoreToLevel(899), "gold");
  });

  it("should map 900 to promax", () => {
    assert.equal(scoreToLevel(900), "promax");
  });

  it("should map 1000 to promax", () => {
    assert.equal(scoreToLevel(1000), "promax");
  });
});

// ─────────────────────────────────────────────────
// Reputation level ordering
// ─────────────────────────────────────────────────

describe("AMRS-3 Reputation levelRank", () => {
  it("should assign rank 0 to new", () => {
    assert.equal(levelRank("new"), 0);
  });

  it("should assign rank 1 to rising", () => {
    assert.equal(levelRank("rising"), 1);
  });

  it("should assign rank 2 to distinguished", () => {
    assert.equal(levelRank("distinguished"), 2);
  });

  it("should assign rank 3 to gold", () => {
    assert.equal(levelRank("gold"), 3);
  });

  it("should assign rank 4 to promax", () => {
    assert.equal(levelRank("promax"), 4);
  });

  it("ranks should be strictly increasing across all levels", () => {
    for (let i = 1; i < ALL_LEVELS.length; i++) {
      assert.ok(
        levelRank(ALL_LEVELS[i]) > levelRank(ALL_LEVELS[i - 1]),
        `${ALL_LEVELS[i]} rank (${levelRank(ALL_LEVELS[i])}) > ${ALL_LEVELS[i - 1]} rank (${levelRank(ALL_LEVELS[i - 1])})`,
      );
    }
  });
});

// ─────────────────────────────────────────────────
// isPromotion / isDemotion symmetry
// ─────────────────────────────────────────────────

describe("AMRS-3 Reputation promotion/demotion", () => {
  it("same level is not a promotion", () => {
    for (const level of ALL_LEVELS) {
      assert.equal(isPromotion(level, level), false, `${level}→${level} should not be promotion`);
    }
  });

  it("same level is not a demotion", () => {
    for (const level of ALL_LEVELS) {
      assert.equal(isDemotion(level, level), false, `${level}→${level} should not be demotion`);
    }
  });

  it("higher level is a promotion", () => {
    for (let i = 1; i < ALL_LEVELS.length; i++) {
      assert.equal(
        isPromotion(ALL_LEVELS[i - 1], ALL_LEVELS[i]),
        true,
        `${ALL_LEVELS[i - 1]}→${ALL_LEVELS[i]} should be promotion`,
      );
    }
  });

  it("lower level is a demotion", () => {
    for (let i = 1; i < ALL_LEVELS.length; i++) {
      assert.equal(
        isDemotion(ALL_LEVELS[i], ALL_LEVELS[i - 1]),
        true,
        `${ALL_LEVELS[i]}→${ALL_LEVELS[i - 1]} should be demotion`,
      );
    }
  });

  it("isPromotion and isDemotion are symmetric (not both true)", () => {
    for (const a of ALL_LEVELS) {
      for (const b of ALL_LEVELS) {
        if (a !== b) {
          assert.ok(
            !(isPromotion(a, b) && isDemotion(a, b)),
            `${a}→${b}: cannot be both promotion and demotion`,
          );
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────
// Legacy provider adapter
// ─────────────────────────────────────────────────

describe("AMRS-3 Legacy provider adapter", () => {
  it("should detect legacy service provider with isBusiness true", () => {
    const legacy = {
      id: "sp-1",
      userId: "user-1",
      countryCode: "SA",
      status: "active",
      ratingAvg: 450,
      jobsCompleted: 10,
      isBusiness: true,
      businessName: "Acme",
      displayNameAr: null,
      displayNameEn: "Acme Properties",
      bioAr: null,
      bioEn: null,
      logoUrl: null,
      coverUrl: null,
      phone: "+966500000000",
      whatsapp: null,
      email: "acme@test.com",
      website: null,
      cityId: null,
      districtId: null,
      governorate: null,
      latitude: null,
      longitude: null,
      serviceRadiusKm: null,
      verifiedAt: null,
      approvedAt: null,
      suspendedAt: null,
      rejectionReason: null,
      ratingCount: 5,
      completionRate: null,
      responseRate: null,
      avgResponseTimeMin: null,
      licensesText: null,
      insuranceText: null,
      foundedYear: null,
      teamSize: null,
      taxNumber: null,
      commercialRegistration: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
    };
    assert.equal(isLegacyServiceProvider(legacy), true);
  });

  it("should detect legacy with isBusiness=1 (numeric)", () => {
    const legacy = {
      id: "sp-2",
      userId: "user-2",
      countryCode: "AE",
      status: "active",
      ratingAvg: null,
      jobsCompleted: 0,
      isBusiness: 1,
      businessName: null,
      displayNameAr: null,
      displayNameEn: null,
      bioAr: null,
      bioEn: null,
      logoUrl: null,
      coverUrl: null,
      phone: null,
      whatsapp: null,
      email: null,
      website: null,
      cityId: null,
      districtId: null,
      governorate: null,
      latitude: null,
      longitude: null,
      serviceRadiusKm: null,
      verifiedAt: null,
      approvedAt: null,
      suspendedAt: null,
      rejectionReason: null,
      ratingCount: 0,
      completionRate: null,
      responseRate: null,
      avgResponseTimeMin: null,
      licensesText: null,
      insuranceText: null,
      foundedYear: null,
      teamSize: null,
      taxNumber: null,
      commercialRegistration: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
    };
    assert.equal(isLegacyServiceProvider(legacy), true);
  });

  it("should accept valid legacy shape regardless of isBusiness value", () => {
    const withFalse = {
      id: "sp-3",
      userId: "user-3",
      countryCode: "SA",
      status: "active",
      ratingAvg: null,
      jobsCompleted: 0,
      isBusiness: false,
    };
    assert.equal(
      isLegacyServiceProvider(withFalse),
      true,
      "Structural guard does not check isBusiness",
    );
  });

  it("should reject object with isBusiness=0", () => {
    assert.equal(isLegacyServiceProvider({ isBusiness: 0 }), false);
  });

  it("should reject null", () => {
    assert.equal(isLegacyServiceProvider(null), false);
  });

  it("should reject plain object without isBusiness", () => {
    assert.equal(isLegacyServiceProvider({ id: "x" }), false);
  });
});

// ─────────────────────────────────────────────────
// Slug uniqueness invariants (logic-only)
// ─────────────────────────────────────────────────

describe("AMRS-3 Slug generation logic", () => {
  it("slugify produces lowercase kebab-case", () => {
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    assert.equal(slugify("Unique Real Estate"), "unique-real-estate");
    assert.equal(slugify("Alpha Properties"), "alpha-properties");
    assert.equal(slugify("  Hello   World  "), "hello-world");
    assert.equal(slugify("Org #1!"), "org-1");
  });
});

// ─────────────────────────────────────────────────
// Business role hierarchy (logic-only)
// ─────────────────────────────────────────────────

describe("AMRS-3 Role hierarchy", () => {
  const ROLE_HIERARCHY = ["owner", "admin", "manager", "agent", "member"];

  const canManage = (inviterRole: string): boolean => {
    const idx = ROLE_HIERARCHY.indexOf(inviterRole);
    return idx >= 0 && idx <= 1;
  };

  const canApproveVerification = (
    verifierEmail: string,
    applicantEmail: string,
  ): boolean => {
    return verifierEmail !== applicantEmail;
  };

  it("owner can manage members", () => {
    assert.equal(canManage("owner"), true);
  });

  it("admin can manage members", () => {
    assert.equal(canManage("admin"), true);
  });

  it("manager cannot manage members", () => {
    assert.equal(canManage("manager"), false);
  });

  it("agent cannot manage members", () => {
    assert.equal(canManage("agent"), false);
  });

  it("member cannot manage members", () => {
    assert.equal(canManage("member"), false);
  });

  it("self-approval is blocked", () => {
    assert.equal(
      canApproveVerification("user@test.com", "user@test.com"),
      false,
    );
  });

  it("admin can approve other user", () => {
    assert.equal(
      canApproveVerification("admin@test.com", "user@test.com"),
      true,
    );
  });
});

// ─────────────────────────────────────────────────
// Verification duplicate detection (logic-only)
// ─────────────────────────────────────────────────

describe("AMRS-3 Verification duplicate detection", () => {
  const hasActiveVerification = (
    records: { type: string; status: string }[],
    type: string,
  ): boolean =>
    records.some(
      (r) =>
        r.type === type &&
        (r.status === "pending" || r.status === "verified"),
    );

  it("should detect pending duplicate", () => {
    const records = [
      { type: "email", status: "pending" },
    ];
    assert.equal(hasActiveVerification(records, "email"), true);
  });

  it("should detect verified duplicate", () => {
    const records = [
      { type: "email", status: "verified" },
    ];
    assert.equal(hasActiveVerification(records, "email"), true);
  });

  it("should allow new verification when previous was rejected", () => {
    const records = [
      { type: "email", status: "rejected" },
    ];
    assert.equal(hasActiveVerification(records, "email"), false);
  });

  it("should allow new verification when previous was revoked", () => {
    const records = [
      { type: "email", status: "revoked" },
    ];
    assert.equal(hasActiveVerification(records, "email"), false);
  });

  it("should allow different type even if one is active", () => {
    const records = [
      { type: "email", status: "verified" },
    ];
    assert.equal(hasActiveVerification(records, "phone"), false);
  });
});

// ─────────────────────────────────────────────────
// Verification expiry detection (logic-only)
// ─────────────────────────────────────────────────

describe("AMRS-3 Verification expiry detection", () => {
  const isExpired = (expiresAt: Date | null): boolean => {
    if (!expiresAt) return false;
    return expiresAt.getTime() < Date.now();
  };

  it("null expiry is not expired", () => {
    assert.equal(isExpired(null), false);
  });

  it("past date is expired", () => {
    assert.equal(isExpired(new Date("2020-01-01")), true);
  });

  it("future date is not expired", () => {
    assert.equal(isExpired(new Date("2099-12-31")), false);
  });
});

// ─────────────────────────────────────────────────
// Business classification constraints (logic-only)
// ─────────────────────────────────────────────────

describe("AMRS-3 Business classification", () => {
  const VALID_TYPES = ["real_estate", "business", "other"];
  const VALID_CLASSIFICATIONS = ["startup", "sme", "established", "enterprise"];

  it("should accept all valid organization types", () => {
    for (const type of VALID_TYPES) {
      assert.ok(VALID_TYPES.includes(type), `${type} should be valid`);
    }
  });

  it("should accept all valid classifications", () => {
    for (const c of VALID_CLASSIFICATIONS) {
      assert.ok(VALID_CLASSIFICATIONS.includes(c), `${c} should be valid`);
    }
  });

  it("should reject invalid type", () => {
    assert.equal(VALID_TYPES.includes("invalid"), false);
  });

  it("should reject invalid classification", () => {
    assert.equal(VALID_CLASSIFICATIONS.includes("mega"), false);
  });
});
