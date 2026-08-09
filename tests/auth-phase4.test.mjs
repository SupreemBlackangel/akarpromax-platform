import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerificationRecord,
  consumeRecord,
  generateOtpValue,
  generateVerificationTokenValue,
  hashChallengeValue,
  isExpired,
  revokeRecord,
  tokenExpiryMinutes,
  verifyOtpRecord,
  verifyTokenRecord,
} from "../lib/auth/verification.ts";
import {
  canAccessAdminArea,
  isAccountUsable,
  accountBlockReason,
  sanitizeRegistrationRole,
  validatePassword,
} from "../lib/auth/access-control.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";
import { renderEmail } from "../lib/email/templates.ts";
import { canAccessAmrsAdmin } from "../lib/amrs/access.ts";
import { getEmailRuntimeStatus } from "../lib/email.ts";
import { redactFields, createRequestId, logSecurityEvent } from "../lib/security/audit.ts";
import { MemoryRateLimitStore, RateLimiter, RATE_LIMIT_CONFIGS } from "../lib/security/rate-limit.ts";
import { resolveUserLocale } from "../lib/auth/verification-actions.ts";

const ONE_HOUR = 60 * 60 * 1000;

test("verification token: issued record verifies with the raw token and is consumed once", async () => {
  const raw = await generateVerificationTokenValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "email_verification",
    destination: "a@example.com",
    tokenValue: raw,
    withOtp: false,
  });
  assert.equal(await verifyTokenRecord(record, raw).then((r) => r.valid), true);
  assert.equal(await verifyTokenRecord(record, raw.repeat(2)).then((r) => r.valid), false);
  const consumed = consumeRecord(record);
  assert.equal(await verifyTokenRecord(consumed, raw).then((r) => r.reason), "consumed");
});

test("verification token: expired records are rejected", async () => {
  const raw = await generateVerificationTokenValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "email_verification",
    destination: "a@example.com",
    tokenValue: raw,
    ttlMs: 1,
    now: new Date(Date.now() - ONE_HOUR),
  });
  assert.equal(isExpired(record, new Date()), true);
  assert.equal(await verifyTokenRecord(record, raw).then((r) => r.reason), "expired");
});

test("verification token: revoked records are rejected even with valid hash", async () => {
  const raw = await generateVerificationTokenValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "email_verification",
    destination: "a@example.com",
    tokenValue: raw,
    withOtp: false,
  });
  const revoked = revokeRecord(record);
  assert.equal(await verifyTokenRecord(revoked, raw).then((r) => r.reason), "revoked");
});

test("OTP: valid code verifies; mismatch fails; exhaustion after threshold", async () => {
  const code = generateOtpValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "otp",
    destination: "a@example.com",
    otpValue: code,
    withOtp: true,
    withToken: false,
  });
  assert.equal(await verifyOtpRecord(record, code).then((r) => r.valid), true);
  assert.equal(await verifyOtpRecord(record, "000000").then((r) => r.valid), false);

  let exhausted = record;
  for (let i = 0; i < 5; i++) exhausted = { ...exhausted, attempts: i };
  exhausted = { ...exhausted, attempts: 5 };
  assert.equal(await verifyOtpRecord(exhausted, code).then((r) => r.reason), "too_many_attempts");
});

test("OTP: expired OTP is rejected", async () => {
  const code = generateOtpValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "otp",
    destination: "a@example.com",
    otpValue: code,
    withOtp: true,
    withToken: false,
    ttlMs: 1,
    now: new Date(Date.now() - ONE_HOUR),
  });
  assert.equal(await verifyOtpRecord(record, code).then((r) => r.reason), "expired");
});

test("hashes at rest: stored hashes never equal the raw value", async () => {
  const raw = await generateVerificationTokenValue();
  const record = await buildVerificationRecord({
    userId: "user-1",
    purpose: "email_verification",
    destination: "a@example.com",
    tokenValue: raw,
    withOtp: false,
  });
  assert.notEqual(record.tokenHash, raw);
  assert.equal(await hashChallengeValue(raw), record.tokenHash);
});

test("RBAC: registration never accepts a privileged role", () => {
  const attempts = ["user", "admin", "super_admin", "service_supervisor", "sponsor_admin", "viewer", undefined];
  for (const attempted of attempts) {
    assert.equal(sanitizeRegistrationRole(attempted), "user", `role ${attempted} must be sanitized`);
  }
});

test("RBAC: account usability gated on status + isActive", () => {
  assert.equal(isAccountUsable("active", true), true);
  assert.equal(isAccountUsable("pending_verification", true), false);
  assert.equal(isAccountUsable("disabled", true), false);
  assert.equal(isAccountUsable("suspended", true), false);
  assert.equal(isAccountUsable("active", false), false);
  assert.equal(accountBlockReason("pending_verification", true), "not_verified");
  assert.equal(accountBlockReason("disabled", true), "account_disabled");
  assert.equal(accountBlockReason("active", false), "inactive");
  assert.equal(accountBlockReason("active", true), null);
});

test("RBAC: admin area access requires elevated role/permissions", () => {
  const guest = { authenticated: false, role: "viewer", permissions: [] };
  const viewer = { authenticated: true, role: "viewer", permissions: [] };
  const admin = { authenticated: true, role: "sponsor_admin", permissions: [PERMISSIONS.ADMIN_DASHBOARD_VIEW] };
  const wildcard = { authenticated: true, role: "viewer", permissions: ["*"] };
  assert.equal(canAccessAdminArea(guest), false);
  assert.equal(canAccessAdminArea(viewer), false);
  assert.equal(canAccessAdminArea(admin), true);
  assert.equal(canAccessAdminArea(wildcard), true);
});

test("password policy: rejects short and empty passwords", () => {
  assert.equal(validatePassword("short").valid, false);
  assert.equal(validatePassword("").valid, false);
  assert.equal(validatePassword("a-valid-password-123").valid, true);
});

test("email: verification link contains the token url (no plaintext hash)", async () => {
  const { subject, html, text } = renderEmail("ar", "verification", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.om", recipientName: "Ali" }, { verificationUrl: "https://akarpromax.om/verify-email?token=abc", tokenExpiryMinutes: 1440 });
  assert.ok(subject.length > 0);
  assert.ok(html.includes("https://akarpromax.om/verify-email?token=abc"));
  assert.ok(text.includes("https://akarpromax.om/verify-email?token=abc"));
  assert.ok(!html.includes("password"));
});

test("email: OTP email contains the one-time code in both html and text", () => {
  const { html, text } = renderEmail("en", "otp", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.om", otpCode: "123456" }, { otpExpirySeconds: 600 });
  assert.ok(html.includes("123456"));
  assert.ok(text.includes("123456"));
  assert.ok(/<html/i.test(html));
  assert.ok(/<title>/i.test(html));
});

test("email: reset email contains the reset url and is localized", () => {
  const ar = renderEmail("ar", "reset", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.om" }, { resetUrl: "https://akarpromax.om/reset-password?token=x", tokenExpiryMinutes: 1440 });
  const en = renderEmail("en", "reset", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.om" }, { resetUrl: "https://akarpromax.om/reset-password?token=x", tokenExpiryMinutes: 1440 });
  assert.ok(ar.html.includes("https://akarpromax.om/reset-password?token=x"));
  assert.ok(en.html.includes("https://akarpromax.om/reset-password?token=x"));
  assert.notEqual(ar.subject, en.subject);
});

test("email: welcome email renders for all locales with html + text", () => {
  for (const locale of ["ar", "en", "tr"]) {
    const { subject, html, text } = renderEmail(locale, "welcome", { brandTitle: "AkarProMax", brandUrl: "https://akarpromax.om", recipientName: "Mona" });
    assert.ok(subject.length > 0);
    assert.ok(html.length > 0);
    assert.ok(text.length > 0);
  }
});

test("email: welcome delivery locale prefers the stored user language over the route fallback", () => {
  assert.equal(resolveUserLocale("en", "ar"), "en");
  assert.equal(resolveUserLocale("tr", "ar"), "tr");
  assert.equal(resolveUserLocale("ar", "en"), "ar");
  assert.equal(resolveUserLocale(null, "en"), "en");
  assert.equal(resolveUserLocale("unknown", "tr"), "tr");
});

test("email readiness reports console transport as not production-capable and smtp as production-capable when configured", () => {
  assert.deepEqual(getEmailRuntimeStatus({ APP_URL: "http://localhost:3010" }), {
    transport: "console",
    configured: false,
    senderConfigured: false,
    publicBaseUrlConfigured: true,
    productionCapable: false,
  });

  assert.deepEqual(
    getEmailRuntimeStatus({
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "mailer",
      SMTP_PASS: "secret",
      SMTP_FROM: "no-reply@example.com",
      APP_PUBLIC_URL: "https://staging.akarpromax.om",
    }),
    {
      transport: "smtp",
      configured: true,
      senderConfigured: true,
      publicBaseUrlConfigured: true,
      productionCapable: true,
    },
  );
});

test("AMRS admin access denies provider-capability sessions and allows sponsor-style admins", () => {
  const providerCapability = {
    authenticated: true,
    email: "provider@example.com",
    displayName: "Provider",
    role: "viewer",
    countryCode: null,
    permissions: [PERMISSIONS.TOOLS_USE, PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN],
  };
  const sponsorAdmin = {
    authenticated: true,
    email: "sponsor-admin@example.com",
    displayName: "Sponsor Admin",
    role: "sponsor_admin",
    countryCode: null,
    permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.SPONSORS_APPROVE],
  };
  const superAdmin = {
    authenticated: true,
    email: "super@example.com",
    displayName: "Super Admin",
    role: "super_admin",
    countryCode: null,
    permissions: [PERMISSIONS.ADMIN_DASHBOARD_VIEW, "*"],
  };
  assert.equal(canAccessAmrsAdmin(providerCapability), false);
  assert.equal(canAccessAmrsAdmin(sponsorAdmin), true);
  assert.equal(canAccessAmrsAdmin(superAdmin), true);
});

test("rate limit: new ops (otp_request, email_verification_resend, verify_email) exist and are bounded", async () => {
  assert.ok(RATE_LIMIT_CONFIGS.otp_request, "otp_request config must exist");
  assert.ok(RATE_LIMIT_CONFIGS.email_verification_resend, "email_verification_resend config must exist");
  assert.ok(RATE_LIMIT_CONFIGS.verify_email, "verify_email config must exist");

  const store = new MemoryRateLimitStore();
  const limiter = new RateLimiter(store);
  for (let i = 0; i < 5; i++) {
    const r = await limiter.hit("otp_request", ["ip:1.2.3.4"]);
    if (i < 4) assert.equal(r.allowed, true);
  }
  const sixth = await limiter.hit("otp_request", ["ip:1.2.3.4"]);
  assert.equal(sixth.allowed, false);
  assert.ok(sixth.retryAfterSeconds >= 0);
});

test("rate limit: identifier dimension locks the same identifier faster than IP alone", async () => {
  const store = new MemoryRateLimitStore();
  const limiter = new RateLimiter(store);
  const config = RATE_LIMIT_CONFIGS.register; // limit 5
  let allowed = 0;
  for (let i = 0; i < config.limit; i++) {
    if ((await limiter.hit("register", ["ip:1.2.3.4", "id:user@example.com"])).allowed) allowed++;
  }
  const next = await limiter.hit("register", ["ip:1.2.3.4", "id:user@example.com"]);
  assert.equal(allowed, config.limit);
  assert.equal(next.allowed, false);
});

test("audit: sensitive fields are redacted and request ids are generated", () => {
  const redacted = redactFields({ password: "hunter2", token: "abc", email: "a@example.com", user_id: "123" });
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.token, "[REDACTED]");
  assert.equal(redacted.email, "a@example.com");
  assert.equal(redacted.user_id, "123");

  const id = createRequestId();
  assert.equal(typeof id, "string");
  assert.equal(id.length, 32);
  // Must not throw even though logSecurityEvent writes to stdout.
  assert.doesNotThrow(() => logSecurityEvent("AUTH_LOGIN_FAILED", { requestId: id, ip: "1.2.3.4" }));
});

test("token expiry minutes and otp code length", () => {
  assert.equal(tokenExpiryMinutes(), 24 * 60);
  const code = generateOtpValue();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});
