import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  sanitizeInput,
  isSafeInput,
  logAudit,
  getAuditLog,
  clearAuditLog,
} from "@/lib/amrs/security";

// ─── Rate limiting ─────────────────────────────────────────────────

describe("AMRS-11 Rate limiting", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("first request is allowed", () => {
    const result = checkRateLimit("test:key", { maxRequests: 5, windowMs: 60000 });
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 4);
  });

  it("allows up to maxRequests", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("test:limit", { maxRequests: 5, windowMs: 60000 });
      assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`);
    }
  });

  it("blocks after maxRequests", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:block", { maxRequests: 5, windowMs: 60000 });
    }
    const result = checkRateLimit("test:block", { maxRequests: 5, windowMs: 60000 });
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  it("different keys are independent", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:key-a", { maxRequests: 5, windowMs: 60000 });
    }
    const result = checkRateLimit("test:key-b", { maxRequests: 5, windowMs: 60000 });
    assert.equal(result.allowed, true);
  });

  it("resetRateLimit clears specific key", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:reset", { maxRequests: 5, windowMs: 60000 });
    }
    resetRateLimit("test:reset");
    const result = checkRateLimit("test:reset", { maxRequests: 5, windowMs: 60000 });
    assert.equal(result.allowed, true);
  });

  it("clearAllRateLimits clears everything", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:clear", { maxRequests: 5, windowMs: 60000 });
    }
    clearAllRateLimits();
    const result = checkRateLimit("test:clear", { maxRequests: 5, windowMs: 60000 });
    assert.equal(result.allowed, true);
  });

  it("remaining decreases correctly", () => {
    const r1 = checkRateLimit("test:remaining", { maxRequests: 3, windowMs: 60000 });
    assert.equal(r1.remaining, 2);
    const r2 = checkRateLimit("test:remaining", { maxRequests: 3, windowMs: 60000 });
    assert.equal(r2.remaining, 1);
    const r3 = checkRateLimit("test:remaining", { maxRequests: 3, windowMs: 60000 });
    assert.equal(r3.remaining, 0);
  });

  it("resetAt is in the future", () => {
    const result = checkRateLimit("test:resetat", { maxRequests: 10, windowMs: 60000 });
    assert.ok(result.resetAt > Date.now());
  });

  it("uses default config for unknown keys", () => {
    const result = checkRateLimit("unknown:key");
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 59);
  });
});

// ─── Input sanitization ────────────────────────────────────────────

describe("AMRS-11 Input sanitization", () => {
  it("clean input passes through", () => {
    const result = sanitizeInput("Hello World");
    assert.equal(result.threats.length, 0);
    assert.equal(result.clean, "Hello World");
  });

  it("detects script tags", () => {
    const result = sanitizeInput('<script>alert("xss")</script>');
    assert.ok(result.threats.length > 0);
    assert.ok(result.threats.some((t) => t.includes("XSS_OR_INJECTION")));
  });

  it("detects javascript protocol", () => {
    const result = sanitizeInput('javascript:alert(1)');
    assert.ok(result.threats.some((t) => t.includes("XSS_OR_INJECTION")));
  });

  it("detects SQL injection with OR 1=1", () => {
    const result = sanitizeInput("' OR '1'='1");
    assert.ok(result.threats.some((t) => t.includes("SQL_INJECTION")));
  });

  it("detects UNION SELECT", () => {
    const result = sanitizeInput("1 UNION SELECT * FROM users");
    assert.ok(result.threats.some((t) => t.includes("XSS_OR_INJECTION")));
  });

  it("detects path traversal", () => {
    const result = sanitizeInput("../../../etc/passwd");
    assert.ok(result.threats.some((t) => t.includes("XSS_OR_INJECTION")));
  });

  it("HTML entities are escaped", () => {
    const result = sanitizeInput('<div class="test">Hello</div>');
    assert.ok(result.clean.includes("&lt;"));
    assert.ok(result.clean.includes("&gt;"));
    assert.ok(result.clean.includes("&quot;"));
  });

  it("single quotes are escaped", () => {
    const result = sanitizeInput("O'Brien");
    assert.ok(result.clean.includes("&#x27;"));
  });

  it("safe input returns no threats", () => {
    assert.equal(isSafeInput("Normal text 123"), true);
    assert.equal(isSafeInput("user@example.com"), true);
    assert.equal(isSafeInput("+966500000000"), true);
  });

  it("unsafe input returns false", () => {
    assert.equal(isSafeInput('<script>alert(1)</script>'), false);
    assert.equal(isSafeInput("' OR 1=1 --"), false);
  });
});

// ─── Audit logging ─────────────────────────────────────────────────

describe("AMRS-11 Audit logging", () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it("logAudit adds entry with timestamp", () => {
    logAudit({
      action: "create",
      actorId: "admin@test.com",
      entityType: "organization",
      entityId: "org-1",
      details: { name: "Acme" },
    });
    const log = getAuditLog();
    assert.equal(log.length, 1);
    assert.ok(log[0].timestamp instanceof Date);
    assert.equal(log[0].action, "create");
  });

  it("getAuditLog filters by action", () => {
    logAudit({ action: "create", actorId: "a", entityType: "org", entityId: "1", details: {} });
    logAudit({ action: "delete", actorId: "a", entityType: "org", entityId: "2", details: {} });
    logAudit({ action: "create", actorId: "b", entityType: "org", entityId: "3", details: {} });

    const creates = getAuditLog({ action: "create" });
    assert.equal(creates.length, 2);
  });

  it("getAuditLog filters by actorId", () => {
    logAudit({ action: "create", actorId: "admin", entityType: "org", entityId: "1", details: {} });
    logAudit({ action: "create", actorId: "user", entityType: "org", entityId: "2", details: {} });

    const adminLogs = getAuditLog({ actorId: "admin" });
    assert.equal(adminLogs.length, 1);
  });

  it("getAuditLog filters by entityType", () => {
    logAudit({ action: "create", actorId: "a", entityType: "org", entityId: "1", details: {} });
    logAudit({ action: "create", actorId: "a", entityType: "user", entityId: "2", details: {} });

    const orgLogs = getAuditLog({ entityType: "org" });
    assert.equal(orgLogs.length, 1);
  });

  it("getAuditLog respects limit", () => {
    for (let i = 0; i < 10; i++) {
      logAudit({ action: "test", actorId: "a", entityType: "t", entityId: `${i}`, details: {} });
    }
    const limited = getAuditLog({ limit: 3 });
    assert.equal(limited.length, 3);
  });

  it("clearAuditLog empties the log", () => {
    logAudit({ action: "test", actorId: "a", entityType: "t", entityId: "1", details: {} });
    clearAuditLog();
    assert.equal(getAuditLog().length, 0);
  });

  it("audit entries are in chronological order", () => {
    logAudit({ action: "first", actorId: "a", entityType: "t", entityId: "1", details: {} });
    logAudit({ action: "second", actorId: "a", entityType: "t", entityId: "2", details: {} });
    const log = getAuditLog();
    assert.ok(log[0].timestamp.getTime() <= log[1].timestamp.getTime());
  });
});

// ─── Rate limit preset configs ─────────────────────────────────────

describe("AMRS-11 Rate limit presets", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("auth endpoint has strict limit", () => {
    const result = checkRateLimit("api:auth", { maxRequests: 10, windowMs: 15 * 60 * 1000 });
    assert.equal(result.remaining, 9);
  });

  it("org creation has very strict limit", () => {
    const result = checkRateLimit("api:amrs:organizations:create", { maxRequests: 5, windowMs: 3600000 });
    assert.equal(result.remaining, 4);
  });

  it("directory search has generous limit", () => {
    const result = checkRateLimit("api:amrs:directory:search", { maxRequests: 60, windowMs: 60000 });
    assert.equal(result.remaining, 59);
  });
});
