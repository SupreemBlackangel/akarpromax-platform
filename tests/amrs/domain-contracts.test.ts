import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REPUTATION_LEVELS,
  REPUTATION_THRESHOLDS,
  VERIFICATION_EXPIRY_DEFAULTS,
  VERIFICATION_REPUTATION_BONUS,
} from "@/lib/amrs/contracts/common";

import {
  levelRank,
  isPromotion,
  isDemotion,
} from "@/lib/amrs/contracts/reputation";

import {
  evaluateActivityLevel,
  DEFAULT_ACTIVITY_WINDOWS,
} from "@/lib/amrs/contracts/activity";

import {
  computeProfileStrength,
  REQUIRED_FIELDS_BY_ENTITY,
} from "@/lib/amrs/contracts/profile-strength";

import {
  adaptLegacyServiceProviderToProfessional,
  isLegacyServiceProvider,
  ensureProfessionalProfile,
} from "@/lib/amrs/adapters/legacy-provider";

import type { LegacyServiceProvider } from "@/lib/amrs/contracts/professional";

function makeLegacy(overrides: Partial<LegacyServiceProvider> = {}): LegacyServiceProvider {
  return {
    id: "prov-1",
    userId: "user-1",
    displayNameAr: "أحمد",
    displayNameEn: "Ahmed",
    bioAr: null,
    bioEn: null,
    logoUrl: null,
    coverUrl: null,
    phone: null,
    whatsapp: null,
    email: null,
    website: null,
    countryCode: "OM",
    cityId: null,
    districtId: null,
    governorate: null,
    latitude: null,
    longitude: null,
    serviceRadiusKm: 50,
    status: "approved",
    verifiedAt: null,
    approvedAt: null,
    suspendedAt: null,
    rejectionReason: null,
    ratingAvg: 0,
    ratingCount: 0,
    jobsCompleted: 0,
    completionRate: 100,
    responseRate: 100,
    avgResponseTimeMin: null,
    licensesText: null,
    insuranceText: null,
    foundedYear: null,
    teamSize: null,
    isBusiness: false,
    businessName: null,
    taxNumber: null,
    commercialRegistration: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ─── INVARIANT 1: Reputation levels are strictly ordered ───

test("invariant: reputation levels have strictly increasing rank", () => {
  for (let i = 1; i < REPUTATION_LEVELS.length; i++) {
    const prev = levelRank(REPUTATION_LEVELS[i - 1]);
    const curr = levelRank(REPUTATION_LEVELS[i]);
    assert.ok(curr > prev, `Level ${REPUTATION_LEVELS[i]} rank ${curr} must exceed ${REPUTATION_LEVELS[i - 1]} rank ${prev}`);
  }
});

// ─── INVARIANT 2: Threshold ranges are contiguous and cover 0-1000 ───

test("invariant: reputation thresholds are contiguous with no gaps", () => {
  const levels = REPUTATION_LEVELS;
  assert.equal(REPUTATION_THRESHOLDS[levels[0]].min, 0, "first level starts at 0");
  assert.equal(REPUTATION_THRESHOLDS[levels[levels.length - 1]].max, 1000, "last level ends at 1000");

  for (let i = 1; i < levels.length; i++) {
    const prevMax = REPUTATION_THRESHOLDS[levels[i - 1]].max;
    const currMin = REPUTATION_THRESHOLDS[levels[i]].min;
    assert.equal(currMin, prevMax + 1, `Gap between ${levels[i - 1]} (max ${prevMax}) and ${levels[i]} (min ${currMin})`);
  }
});

// ─── INVARIANT 3: isPromotion / isDemotion are symmetric and reflexive ───

test("invariant: isPromotion and isDemotion are symmetric", () => {
  for (const from of REPUTATION_LEVELS) {
    for (const to of REPUTATION_LEVELS) {
      if (from === to) {
        assert.equal(isPromotion(from, to), false, `same level ${from} cannot be promotion`);
        assert.equal(isDemotion(from, to), false, `same level ${from} cannot be demotion`);
      } else if (levelRank(to) > levelRank(from)) {
        assert.equal(isPromotion(from, to), true, `${from}→${to} should be promotion`);
        assert.equal(isDemotion(from, to), false, `${from}→${to} should not be demotion`);
      } else {
        assert.equal(isPromotion(from, to), false, `${from}→${to} should not be promotion`);
        assert.equal(isDemotion(from, to), true, `${from}→${to} should be demotion`);
      }
    }
  }
});

// ─── INVARIANT 4: VERIFICATION_EXPIRY_DEFAULTS covers all verification types ───

test("invariant: all verification types have expiry defaults defined", () => {
  const allTypes = ["email", "phone", "identity", "professional", "organization", "license", "address"] as const;
  for (const t of allTypes) {
    assert.ok(t in VERIFICATION_EXPIRY_DEFAULTS, `missing expiry default for ${t}`);
  }
});

// ─── INVARIANT 5: VERIFICATION_REPUTATION_BONUS covers all types and all are non-negative ───

test("invariant: all verification types have non-negative reputation bonuses", () => {
  const allTypes = ["email", "phone", "identity", "professional", "organization", "license", "address"] as const;
  for (const t of allTypes) {
    assert.ok(t in VERIFICATION_REPUTATION_BONUS, `missing reputation bonus for ${t}`);
    assert.ok(VERIFICATION_REPUTATION_BONUS[t] >= 0, `bonus for ${t} must be non-negative, got ${VERIFICATION_REPUTATION_BONUS[t]}`);
  }
});

// ─── INVARIANT 6: Profile strength is always 0-100 ───

test("invariant: profile strength score is always 0-100", () => {
  const required = REQUIRED_FIELDS_BY_ENTITY.professional;
  const scores = [
    computeProfileStrength([], required),
    computeProfileStrength(required, required),
    computeProfileStrength(required.slice(0, Math.floor(required.length / 2)), required),
    computeProfileStrength([...required, "extra"], required),
  ];
  for (const s of scores) {
    assert.ok(s >= 0 && s <= 100, `score ${s} out of range 0-100`);
  }
  assert.equal(computeProfileStrength([], required), 0, "empty fields → 0");
  assert.equal(computeProfileStrength(required, required), 100, "all fields → 100");
});

// ─── INVARIANT 7: Profile strength required fields defined for all entity types ───

test("invariant: REQUIRED_FIELDS_BY_ENTITY covers all entity types", () => {
  const entityTypes = ["user", "professional", "organization"] as const;
  for (const et of entityTypes) {
    assert.ok(et in REQUIRED_FIELDS_BY_ENTITY, `missing required fields for ${et}`);
    assert.ok(REQUIRED_FIELDS_BY_ENTITY[et].length > 0, `required fields for ${et} must not be empty`);
  }
});

// ─── INVARIANT 8: Activity evaluation always returns valid level ───

test("invariant: evaluateActivityLevel returns only valid ActivityLevel values", () => {
  const validLevels = new Set(["active", "recently_active", "low_activity", "inactive"]);
  const now = Date.now();
  const testCases: Array<{ lastActionAt: Date | null; count: number }> = [
    { lastActionAt: new Date(now - 1000 * 60 * 60 * 24 * 5), count: 10 },
    { lastActionAt: new Date(now - 1000 * 60 * 60 * 24 * 20), count: 3 },
    { lastActionAt: new Date(now - 1000 * 60 * 60 * 24 * 60), count: 1 },
    { lastActionAt: new Date(now - 1000 * 60 * 60 * 24 * 200), count: 0 },
    { lastActionAt: null, count: 0 },
  ];
  for (const tc of testCases) {
    const result = evaluateActivityLevel(tc.lastActionAt, tc.count);
    assert.ok(validLevels.has(result), `invalid activity level: ${result}`);
  }
});

// ─── INVARIANT 9: Activity null lastActionAt always → inactive ───

test("invariant: activity null lastActionAt always yields inactive", () => {
  assert.equal(evaluateActivityLevel(null, 0), "inactive");
  assert.equal(evaluateActivityLevel(null, 100), "inactive");
  assert.equal(evaluateActivityLevel(null, 999), "inactive");
});

// ─── INVARIANT 10: Default activity windows are ordered: active < recently < low < inactive ───

test("invariant: default activity windows are strictly increasing", () => {
  const w = DEFAULT_ACTIVITY_WINDOWS;
  assert.ok(w.activeDays < w.recentlyActiveDays, "activeDays < recentlyActiveDays");
  assert.ok(w.recentlyActiveDays < w.lowActivityDays, "recentlyActiveDays < lowActivityDays");
  assert.ok(w.lowActivityDays < w.inactiveDays, "lowActivityDays < inactiveDays");
});

// ─── INVARIANT 11: isLegacyServiceProvider type guard correctness ───

test("invariant: isLegacyServiceProvider correctly identifies valid and invalid shapes", () => {
  const valid = makeLegacy();
  assert.equal(isLegacyServiceProvider(valid), true, "valid legacy should pass");

  assert.equal(isLegacyServiceProvider(null), false, "null should fail");
  assert.equal(isLegacyServiceProvider(undefined), false, "undefined should fail");
  assert.equal(isLegacyServiceProvider("string"), false, "string should fail");
  assert.equal(isLegacyServiceProvider({}), false, "empty object should fail");
  assert.equal(isLegacyServiceProvider({ id: 123 }), false, "numeric id should fail");
  assert.equal(isLegacyServiceProvider({ id: "x", userId: "y" }), false, "missing fields should fail");
});

// ─── INVARIANT 12: Adapted profile preserves all field values ───

test("invariant: adapter preserves all legacy field values", () => {
  const legacy = makeLegacy({
    isBusiness: 1,
    displayNameAr: "اسم عربي",
    displayNameEn: "English Name",
    ratingAvg: 4.5,
    ratingCount: 42,
    jobsCompleted: 100,
    serviceRadiusKm: 30,
  });

  const adapted = adaptLegacyServiceProviderToProfessional(legacy);

  assert.equal(adapted.id, legacy.id);
  assert.equal(adapted.userId, legacy.userId);
  assert.equal(adapted.displayNameAr, legacy.displayNameAr);
  assert.equal(adapted.displayNameEn, legacy.displayNameEn);
  assert.equal(adapted.countryCode, legacy.countryCode);
  assert.equal(adapted.status, legacy.status);
  assert.equal(adapted.ratingAvg, legacy.ratingAvg);
  assert.equal(adapted.ratingCount, legacy.ratingCount);
  assert.equal(adapted.jobsCompleted, legacy.jobsCompleted);
  assert.equal(adapted.serviceRadiusKm, legacy.serviceRadiusKm);
  assert.equal(adapted.isBusiness, true, "isBusiness=1 should become true");
  assert.equal(adapted.createdAt.getTime(), legacy.createdAt.getTime());
});

// ─── INVARIANT 13: ensureProfessionalProfile throws on invalid data ───

test("invariant: ensureProfessionalProfile throws on invalid input", () => {
  assert.throws(() => ensureProfessionalProfile(null, "test"), /Invalid ProfessionalProfile/);
  assert.throws(() => ensureProfessionalProfile({}, "test"), /Invalid ProfessionalProfile/);
  assert.throws(() => ensureProfessionalProfile("str", "test"), /Invalid ProfessionalProfile/);

  const valid = makeLegacy();
  const result = ensureProfessionalProfile(valid, "test");
  assert.equal(result.id, valid.id, "valid data should pass through");
});

// ─── INVARIANT 14: Reputation bonus for identity-type verifications >= 100 ───

test("invariant: high-value verification bonuses are at least 100", () => {
  const highValueType = ["identity", "professional", "license", "organization"] as const;
  for (const t of highValueType) {
    assert.ok(
      VERIFICATION_REPUTATION_BONUS[t] >= 100,
      `${t} bonus should be >= 100, got ${VERIFICATION_REPUTATION_BONUS[t]}`,
    );
  }
});

// ─── INVARIANT 15: Professional status values match contract ───

test("invariant: ProfessionalStatus includes all expected states", () => {
  const expected = ["draft", "submitted", "under_review", "approved", "rejected", "suspended"];
  const legacy = makeLegacy({ status: "approved" });
  const adapted = adaptLegacyServiceProviderToProfessional(legacy);
  assert.ok(expected.includes(adapted.status), `status ${adapted.status} not in expected list`);
});

// ─── INVARIANT 16: Entity types are exhaustive ───

test("invariant: EntityType covers user, professional, organization", () => {
  const entityTypes = ["user", "professional", "organization"] as const;
  for (const et of entityTypes) {
    assert.ok(et in REQUIRED_FIELDS_BY_ENTITY, `entity type ${et} must have required fields`);
  }
});
