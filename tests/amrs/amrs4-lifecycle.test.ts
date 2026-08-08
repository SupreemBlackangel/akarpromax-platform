import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  verificationEventLog,
  clearVerificationEvents,
  type TrustPanelItem,
  type EntityTrustPanel,
} from "@/lib/amrs/verification";
import { VERIFICATION_EXPIRY_DEFAULTS, VERIFICATION_REPUTATION_BONUS } from "@/lib/amrs/contracts/common";
import type { VerificationType, EntityType } from "@/lib/amrs/contracts/common";
import type { VerificationStatusChangedEvent } from "@/lib/amrs/contracts/events";

// ─── Verification event log ────────────────────────────────────────

describe("AMRS-4 Verification event log", () => {
  beforeEach(() => {
    clearVerificationEvents();
  });

  it("starts empty", () => {
    assert.equal(verificationEventLog.length, 0);
  });

  it("event log tracks status transitions", () => {
    const event = {
      entityType: "user" as const,
      entityId: "test@test.com",
      verificationType: "email" as const,
      oldStatus: "none",
      newStatus: "pending",
      changedAt: new Date(),
    };
    verificationEventLog.push(event as VerificationStatusChangedEvent);
    assert.equal(verificationEventLog.length, 1);
    assert.equal(verificationEventLog[0].newStatus, "pending");
  });

  it("clearVerificationEvents resets the log", () => {
    verificationEventLog.push({
      entityType: "user",
      entityId: "x@test.com",
      verificationType: "phone",
      oldStatus: "pending",
      newStatus: "verified",
      changedAt: new Date(),
    });
    clearVerificationEvents();
    assert.equal(verificationEventLog.length, 0);
  });
});

// ─── Trust panel DTO computation ───────────────────────────────────

describe("AMRS-4 Trust panel DTO", () => {
  function buildTrustPanel(
    entityType: EntityType,
    entityId: string,
    records: { type: string; status: string; verifiedAt: Date | null; expiresAt: Date | null; source: string }[],
  ): EntityTrustPanel {
    const items: TrustPanelItem[] = records.map((r) => ({
      type: r.type as VerificationType,
      status: r.status,
      verifiedAt: r.verifiedAt,
      expiresAt: r.expiresAt,
      isExpired: r.expiresAt ? r.expiresAt.getTime() < Date.now() : false,
      source: r.source,
    }));

    const counts = { verified: 0, pending: 0, failed: 0, expired: 0, revoked: 0 };
    for (const item of items) {
      if (item.isExpired) counts.expired++;
      else if (item.status === "verified") counts.verified++;
      else if (item.status === "pending") counts.pending++;
      else if (item.status === "failed") counts.failed++;
      else if (item.status === "revoked") counts.revoked++;
    }

    const TRUST_RANK: VerificationType[] = [
      "identity", "license", "organization", "professional", "email", "phone", "address",
    ];
    const verifiedTypes = new Set(
      items.filter((i) => i.status === "verified" && !i.isExpired).map((i) => i.type),
    );
    const highestTrustType = TRUST_RANK.find((t) => verifiedTypes.has(t)) ?? null;

    return {
      entityType,
      entityId,
      items,
      summary: {
        totalVerified: counts.verified,
        totalPending: counts.pending,
        totalFailed: counts.failed,
        totalExpired: counts.expired,
        totalRevoked: counts.revoked,
        highestTrustType,
      },
    };
  }

  it("computes correct summary for verified user", () => {
    const panel = buildTrustPanel("user", "u1", [
      { type: "email", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system" },
      { type: "phone", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system" },
      { type: "identity", status: "verified", verifiedAt: new Date(), expiresAt: new Date("2099-01-01"), source: "manual" },
    ]);
    assert.equal(panel.summary.totalVerified, 3);
    assert.equal(panel.summary.highestTrustType, "identity");
  });

  it("computes correct summary with mixed statuses", () => {
    const panel = buildTrustPanel("user", "u2", [
      { type: "email", status: "verified", verifiedAt: new Date(), expiresAt: null, source: "system" },
      { type: "phone", status: "pending", verifiedAt: null, expiresAt: null, source: "manual" },
      { type: "identity", status: "failed", verifiedAt: null, expiresAt: null, source: "manual" },
    ]);
    assert.equal(panel.summary.totalVerified, 1);
    assert.equal(panel.summary.totalPending, 1);
    assert.equal(panel.summary.totalFailed, 1);
    assert.equal(panel.summary.highestTrustType, "email");
  });

  it("expired records count as expired, not verified", () => {
    const panel = buildTrustPanel("user", "u3", [
      { type: "email", status: "verified", verifiedAt: new Date("2023-01-01"), expiresAt: new Date("2024-01-01"), source: "system" },
      { type: "phone", status: "verified", verifiedAt: new Date(), expiresAt: new Date("2099-01-01"), source: "system" },
    ]);
    assert.equal(panel.summary.totalVerified, 1);
    assert.equal(panel.summary.totalExpired, 1);
    assert.equal(panel.summary.highestTrustType, "phone");
  });

  it("no verifications yields all-zero summary", () => {
    const panel = buildTrustPanel("user", "u4", []);
    assert.equal(panel.summary.totalVerified, 0);
    assert.equal(panel.summary.totalPending, 0);
    assert.equal(panel.summary.totalFailed, 0);
    assert.equal(panel.summary.totalExpired, 0);
    assert.equal(panel.summary.totalRevoked, 0);
    assert.equal(panel.summary.highestTrustType, null);
  });

  it("trust rank order: identity > license > organization > professional > email > phone > address", () => {
    const TRUST_RANK: VerificationType[] = [
      "identity", "license", "organization", "professional", "email", "phone", "address",
    ];
    const panel = buildTrustPanel("user", "u5", TRUST_RANK.map((t) => ({
      type: t,
      status: "verified",
      verifiedAt: new Date(),
      expiresAt: null,
      source: "manual",
    })));
    assert.equal(panel.summary.highestTrustType, "identity");
  });

  it("revoked records are counted correctly", () => {
    const panel = buildTrustPanel("user", "u6", [
      { type: "email", status: "revoked", verifiedAt: null, expiresAt: null, source: "system" },
    ]);
    assert.equal(panel.summary.totalRevoked, 1);
    assert.equal(panel.summary.totalVerified, 0);
  });
});

// ─── Expiry defaults contract ──────────────────────────────────────

describe("AMRS-4 Verification expiry defaults", () => {
  it("email has no expiry (persists)", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.email, null);
  });

  it("phone has no expiry (persists)", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.phone, null);
  });

  it("identity expires after 365 days", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.identity, 365);
  });

  it("professional expires after 365 days", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.professional, 365);
  });

  it("license expires after 365 days", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.license, 365);
  });

  it("organization expires after 365 days", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.organization, 365);
  });

  it("address has no expiry (persists)", () => {
    assert.equal(VERIFICATION_EXPIRY_DEFAULTS.address, null);
  });

  it("all verification types have defaults defined", () => {
    const allTypes: VerificationType[] = ["email", "phone", "identity", "professional", "organization", "license", "address"];
    for (const t of allTypes) {
      assert.ok(t in VERIFICATION_EXPIRY_DEFAULTS, `${t} should have expiry default`);
    }
  });
});

// ─── Reputation bonus contract ─────────────────────────────────────

describe("AMRS-4 Verification reputation bonus", () => {
  it("identity bonus is at least 100", () => {
    assert.ok(VERIFICATION_REPUTATION_BONUS.identity >= 100);
  });

  it("professional bonus is at least 100", () => {
    assert.ok(VERIFICATION_REPUTATION_BONUS.professional >= 100);
  });

  it("license bonus is at least 100", () => {
    assert.ok(VERIFICATION_REPUTATION_BONUS.license >= 100);
  });

  it("all bonuses are non-negative", () => {
    const allTypes: VerificationType[] = ["email", "phone", "identity", "professional", "organization", "license", "address"];
    for (const t of allTypes) {
      assert.ok(VERIFICATION_REPUTATION_BONUS[t] >= 0, `${t} bonus should be non-negative`);
    }
  });

  it("professional has highest bonus", () => {
    const allTypes: VerificationType[] = ["email", "phone", "identity", "professional", "organization", "license", "address"];
    const maxBonus = Math.max(...allTypes.map((t) => VERIFICATION_REPUTATION_BONUS[t]));
    assert.equal(VERIFICATION_REPUTATION_BONUS.professional, maxBonus);
  });
});

// ─── Verification status transitions ───────────────────────────────

describe("AMRS-4 Status transition rules", () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    none: ["pending"],
    pending: ["verified", "failed"],
    verified: ["expired", "revoked"],
    failed: ["pending"],
    expired: ["pending"],
    revoked: ["pending"],
  };

  const ALL_STATUSES = ["pending", "verified", "failed", "expired", "revoked"] as const;

  it("all statuses have defined transitions", () => {
    for (const s of ALL_STATUSES) {
      assert.ok(s in VALID_TRANSITIONS, `${s} should have transitions defined`);
    }
  });

  it("pending can transition to verified or failed", () => {
    assert.deepEqual(VALID_TRANSITIONS["pending"], ["verified", "failed"]);
  });

  it("verified can transition to expired or revoked (not back to pending)", () => {
    assert.deepEqual(VALID_TRANSITIONS["verified"], ["expired", "revoked"]);
  });

  it("failed can be re-submitted (back to pending)", () => {
    assert.deepEqual(VALID_TRANSITIONS["failed"], ["pending"]);
  });

  it("expired can be renewed (back to pending)", () => {
    assert.deepEqual(VALID_TRANSITIONS["expired"], ["pending"]);
  });

  it("revoked can be renewed (back to pending)", () => {
    assert.deepEqual(VALID_TRANSITIONS["revoked"], ["pending"]);
  });

  it("verified cannot go directly to pending", () => {
    assert.ok(!VALID_TRANSITIONS["verified"].includes("pending"));
  });

  it("pending cannot skip to expired", () => {
    assert.ok(!VALID_TRANSITIONS["pending"].includes("expired"));
  });
});

// ─── Verification workflow lifecycle (logic-only) ──────────────────

describe("AMRS-4 Verification lifecycle model", () => {
  interface VerificationLifecycle {
    status: string;
    history: string[];
  }

  function submit(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "none" && lc.status !== "failed" && lc.status !== "expired" && lc.status !== "revoked") {
      throw new Error(`Cannot submit from ${lc.status}`);
    }
    return { status: "pending", history: [...lc.history, "submit"] };
  }

  function approve(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "pending") throw new Error(`Cannot approve from ${lc.status}`);
    return { status: "verified", history: [...lc.history, "approve"] };
  }

  function reject(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "pending") throw new Error(`Cannot reject from ${lc.status}`);
    return { status: "failed", history: [...lc.history, "reject"] };
  }

  function expire(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "verified") throw new Error(`Cannot expire from ${lc.status}`);
    return { status: "expired", history: [...lc.history, "expire"] };
  }

  function revoke(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "verified") throw new Error(`Cannot revoke from ${lc.status}`);
    return { status: "revoked", history: [...lc.history, "revoke"] };
  }

  function renew(lc: VerificationLifecycle): VerificationLifecycle {
    if (lc.status !== "expired" && lc.status !== "revoked") throw new Error(`Cannot renew from ${lc.status}`);
    return { status: "pending", history: [...lc.history, "renew"] };
  }

  const initial: VerificationLifecycle = { status: "none", history: [] };

  it("happy path: submit → approve", () => {
    const lc = approve(submit(initial));
    assert.equal(lc.status, "verified");
    assert.deepEqual(lc.history, ["submit", "approve"]);
  });

  it("rejection path: submit → reject", () => {
    const lc = reject(submit(initial));
    assert.equal(lc.status, "failed");
  });

  it("expiry path: submit → approve → expire → renew → approve", () => {
    let lc = initial;
    lc = submit(lc);
    lc = approve(lc);
    lc = expire(lc);
    lc = renew(lc);
    lc = approve(lc);
    assert.equal(lc.status, "verified");
    assert.deepEqual(lc.history, ["submit", "approve", "expire", "renew", "approve"]);
  });

  it("revocation path: submit → approve → revoke → renew → approve", () => {
    let lc = initial;
    lc = submit(lc);
    lc = approve(lc);
    lc = revoke(lc);
    lc = renew(lc);
    lc = approve(lc);
    assert.equal(lc.status, "verified");
  });

  it("cannot submit from verified", () => {
    const lc = approve(submit(initial));
    assert.throws(() => submit(lc), /Cannot submit from verified/);
  });

  it("cannot approve from failed", () => {
    const lc = reject(submit(initial));
    assert.throws(() => approve(lc), /Cannot approve from failed/);
  });

  it("cannot expire from pending", () => {
    const lc = submit(initial);
    assert.throws(() => expire(lc), /Cannot expire from pending/);
  });

  it("cannot revoke from pending", () => {
    const lc = submit(initial);
    assert.throws(() => revoke(lc), /Cannot revoke from pending/);
  });

  it("cannot renew from pending", () => {
    const lc = submit(initial);
    assert.throws(() => renew(lc), /Cannot renew from pending/);
  });

  it("cannot renew from verified", () => {
    const lc = approve(submit(initial));
    assert.throws(() => renew(lc), /Cannot renew from verified/);
  });
});
