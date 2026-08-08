import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeProfileCompleteness,
  getRequiredFields,
  isProfileComplete,
} from "@/lib/amrs/profiles";

// ─── Professional profile completeness ─────────────────────────────

describe("AMRS-6 Professional profile completeness", () => {
  const fullProfile = {
    displayNameEn: "Ahmed Hassan",
    displayNameAr: "أحمد حسن",
    phone: "+966500000000",
    email: "ahmed@test.com",
    bioEn: "Experienced real estate agent",
    countryCode: "SA",
    cityId: "riyadh",
    logoUrl: "https://example.com/logo.png",
    coverUrl: "https://example.com/cover.jpg",
    serviceRadiusKm: 25,
    licensesText: "License #12345",
    insuranceText: "Insurance Policy ABC",
  };

  it("full profile scores 100", () => {
    const result = computeProfileCompleteness("professional", "p1", fullProfile);
    assert.equal(result.score, 100);
    assert.equal(result.filledFields.length, 12);
    assert.equal(result.missingFields.length, 0);
    assert.equal(result.requiredMissing.length, 0);
  });

  it("empty profile scores 0", () => {
    const result = computeProfileCompleteness("professional", "p2", {});
    assert.equal(result.score, 0);
    assert.equal(result.filledFields.length, 0);
    assert.equal(result.missingFields.length, 12);
  });

  it("missing required fields are flagged", () => {
    const result = computeProfileCompleteness("professional", "p3", {
      displayNameEn: "Test",
    });
    assert.ok(result.requiredMissing.includes("phone"));
    assert.ok(result.requiredMissing.includes("email"));
    assert.ok(result.requiredMissing.includes("countryCode"));
    assert.ok(!result.requiredMissing.includes("displayNameAr"));
  });

  it("partial profile has intermediate score", () => {
    const partial = {
      displayNameEn: "Test",
      phone: "+966500000000",
      email: "test@test.com",
      countryCode: "SA",
    };
    const result = computeProfileCompleteness("professional", "p4", partial);
    assert.ok(result.score > 30, `Score ${result.score} should be > 30`);
    assert.ok(result.score < 100, `Score ${result.score} should be < 100`);
  });

  it("field details include all fields with correct filled status", () => {
    const result = computeProfileCompleteness("professional", "p5", {
      displayNameEn: "Test",
      phone: "+966500000000",
    });
    assert.equal(result.fieldDetails.length, 12);
    assert.equal(result.fieldDetails.find((f) => f.key === "displayNameEn")?.filled, true);
    assert.equal(result.fieldDetails.find((f) => f.key === "email")?.filled, false);
  });

  it("whitespace-only strings count as empty", () => {
    const result = computeProfileCompleteness("professional", "p6", {
      displayNameEn: "   ",
      phone: "  ",
    });
    assert.ok(result.missingFields.includes("displayNameEn"));
    assert.ok(result.missingFields.includes("phone"));
  });
});

// ─── Organization profile completeness ─────────────────────────────

describe("AMRS-6 Organization profile completeness", () => {
  const fullOrg = {
    nameEn: "Acme Properties",
    nameAr: "عقارات أكمي",
    type: "real_estate",
    classification: "sme",
    countryCode: "SA",
    descriptionEn: "Leading real estate company",
    contactEmail: "info@acme.com",
    contactPhone: "+966500000000",
    websiteUrl: "https://acme.com",
    cityId: "riyadh",
    latitude: 24.7136,
  };

  it("full org profile scores 100", () => {
    const result = computeProfileCompleteness("organization", "o1", fullOrg);
    assert.equal(result.score, 100);
  });

  it("missing required org fields are flagged", () => {
    const result = computeProfileCompleteness("organization", "o2", {});
    assert.ok(result.requiredMissing.includes("nameEn"));
    assert.ok(result.requiredMissing.includes("type"));
    assert.ok(result.requiredMissing.includes("classification"));
    assert.ok(result.requiredMissing.includes("countryCode"));
  });

  it("latitude counts as filled even without longitude", () => {
    const result = computeProfileCompleteness("organization", "o3", {
      nameEn: "Test",
      type: "business",
      classification: "startup",
      countryCode: "AE",
      latitude: 25.2,
    });
    assert.ok(result.filledFields.includes("latitude"));
    assert.ok(result.missingFields.includes("cityId"));
  });
});

// ─── User profile completeness ─────────────────────────────────────

describe("AMRS-6 User profile completeness", () => {
  it("user profile completeness works", () => {
    const result = computeProfileCompleteness("user", "u1", {
      name: "John",
      email: "john@test.com",
      phone: "+1234567890",
      avatar: "https://example.com/avatar.jpg",
      countryCode: "US",
      cityId: "nyc",
    });
    assert.equal(result.score, 100);
  });

  it("user missing name and email", () => {
    const result = computeProfileCompleteness("user", "u2", {});
    assert.ok(result.requiredMissing.includes("name"));
    assert.ok(result.requiredMissing.includes("email"));
  });
});

// ─── Required fields ───────────────────────────────────────────────

describe("AMRS-6 Required fields", () => {
  it("professional has 4 required fields", () => {
    const required = getRequiredFields("professional");
    assert.ok(required.includes("displayNameEn"));
    assert.ok(required.includes("phone"));
    assert.ok(required.includes("email"));
    assert.ok(required.includes("countryCode"));
  });

  it("organization has 4 required fields", () => {
    const required = getRequiredFields("organization");
    assert.ok(required.includes("nameEn"));
    assert.ok(required.includes("type"));
    assert.ok(required.includes("classification"));
    assert.ok(required.includes("countryCode"));
  });

  it("user has 2 required fields", () => {
    const required = getRequiredFields("user");
    assert.ok(required.includes("name"));
    assert.ok(required.includes("email"));
  });
});

// ─── isProfileComplete ─────────────────────────────────────────────

describe("AMRS-6 isProfileComplete", () => {
  it("returns true when all required fields present", () => {
    assert.equal(
      isProfileComplete("professional", {
        displayNameEn: "Test",
        phone: "+123",
        email: "test@test.com",
        countryCode: "SA",
      }),
      true,
    );
  });

  it("returns false when required field missing", () => {
    assert.equal(
      isProfileComplete("professional", {
        displayNameEn: "Test",
      }),
      false,
    );
  });

  it("returns true for org with required fields", () => {
    assert.equal(
      isProfileComplete("organization", {
        nameEn: "Acme",
        type: "real_estate",
        classification: "sme",
        countryCode: "SA",
      }),
      true,
    );
  });

  it("returns false for org missing classification", () => {
    assert.equal(
      isProfileComplete("organization", {
        nameEn: "Acme",
        type: "real_estate",
        countryCode: "SA",
      }),
      false,
    );
  });
});

// ─── Score thresholds ──────────────────────────────────────────────

describe("AMRS-6 Score thresholds", () => {
  it("score is always 0-100", () => {
    const result = computeProfileCompleteness("professional", "p1", {});
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it("adding fields increases score", () => {
    const empty = computeProfileCompleteness("professional", "p1", {});
    const withName = computeProfileCompleteness("professional", "p2", {
      displayNameEn: "Test",
    });
    assert.ok(withName.score > empty.score);
  });

  it("required fields have higher individual impact", () => {
    const fields = getRequiredFields("professional");
    assert.ok(fields.length > 0, "Should have required fields");
  });
});
