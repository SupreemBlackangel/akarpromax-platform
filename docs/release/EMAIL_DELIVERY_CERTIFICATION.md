# Email Delivery Certification

## Transport Infrastructure (built this phase)

- `lib/email.ts` now ships a real, testable SMTP transport:
  - `SmtpEmailTransport` (nodemailer `^9.0.5`) with `fromName`/`replyTo`,
    connection + greeting + socket timeouts, per-send transporter, and
    `testConnection()` (SMTP `verify`).
  - `ConsoleEmailTransport.testConnection()` returns a safe "console is not a
    real provider" result — console is **never** `productionCapable`.
  - `EmailDeliveryError` with a safe `category` (`config|auth|refused|timeout|
    connection|protocol`) and `sanitizeSmtpError()` that strips SMTP
    secrets/passwords from messages and stacks.
  - `EMAIL_TRANSPORT` env selection (`console|smtp`; legacy auto-detect from
    `SMTP_HOST` retained) with inline production validation
    (invalid value -> `RuntimeEnvError`, variable `EMAIL_TRANSPORT`).
  - `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` / `MAIL_REPLY_TO` support.
  - `APP_PUBLIC_URL` now takes precedence over `APP_URL` for all email links
    (`buildVerificationEmailUrl`, reset links, CTA URLs).
- Tooling: `scripts/email-provider-check.ts` via `npm run email:check` — reads
  config only, never sends, never prints secrets.
- Regression: `tests/email-transport.test.mjs` (16 tests) — real SMTP round-trip
  against a local protocol-accurate sink (auth, `From` name, subject/HTML/text),
  auth-failure -> `category=auth`, connection-refused -> `refused`, silent
  server -> `timeout` (no secret leakage in any path), readiness matrix
  (`productionCapable` only when `smtp + SMTP_HOST + sender + APP_PUBLIC_URL`),
  template plain-text fallback for ar/en/tr, RTL/LTR assertions, and
  `APP_PUBLIC_URL` precedence.

## Runtime Provider

- Provider: `ConsoleEmailTransport`
- Configured: `NO`
- Sender configured: `NO`
- Evidence:
  - No `SMTP_*` environment variables were present at runtime.
  - `lib/email.ts` falls back to the console transport when `SMTP_HOST` is absent.
  - Live `/api/health` and `/api/health/ready` report
    `email.transport = "console"`, `configured = false`,
    `productionCapable = false`.
  - `npm run email:check`:
    `transport: console`, `configured: false`, `productionCapable: false`,
    `EMAIL READY FOR STAGING = NO — blocked only by real provider configuration.`

## Live Registration / Verification

- Registration: `PASS`
  - `POST /api/auth/register` -> `201`
  - Response included `requiresVerification: true` and `status: pending_verification`.
- Verification email triggered: `PASS`
  - Live console transport event observed for:
    - `cert-register-1@akarpromax.om`
    - `cert-register-2@akarpromax.om`
- Actual delivery: `NOT AVAILABLE`
  - The environment has no real SMTP/API provider configured, so inbox delivery could not be verified.
- Verification link/OTP path: `PASS`
  - `POST /api/auth/verify-email` with a valid runtime challenge token -> `200`
  - `POST /api/auth/verify-otp` for email-change OTP -> `200`
- Expiration: `PASS`
  - Automated verification tests cover expired token/OTP rejection.
- Single-use: `PASS`
  - Live token reuse after successful verify returned `400 invalid_or_expired_token`.
- Resend: `PASS`
  - `POST /api/auth/verify-email/resend` -> `200`
- Welcome email: `PASS`
  - Welcome email trigger observed once on successful account verification via console transport.

## Template / Localization

- AR template: `PASS`
  - Render tests pass.
  - Arabic verification-related mail was observed on the console transport.
- EN template: `PASS`
  - English registration verification mail was observed live (`Verify your email on AkarProMax`).
- TR template: `PASS`
  - Render tests pass.
- Mobile HTML: `PASS`
  - HTML templates render successfully in tests.
- Plain-text fallback: `PASS`
  - Text bodies render alongside HTML in tests.

## Security

- Secrets in logs: `NO`
  - Runtime logs did not expose raw verification tokens, OTPs, SMTP secrets, or API keys.
  - `sanitizeSmtpError` regression tests prove SMTP passwords never reach error
    messages or stacks across auth/timeout/refused/protocol failures.
- Invalid token: `PASS`
  - `POST /api/auth/verify-email` with an invalid token -> `400`
- Unverified login blocked: `PASS`
  - Login before verification -> `403 account_blocked / not_verified`
- Preferred-language welcome delivery: `PASS`
  - Fixed so the stored user `preferredLanguage` drives the welcome email locale after verification.
- Transport failure honesty: `PASS`
  - SMTP failures surface as `EmailDeliveryError` and are never reported as
    `sent=true`; the console transport labels itself not production-capable.

## DNS / Production Readiness

- SPF: `REQUIRES DNS CONFIGURATION`
- DKIM: `REQUIRES DNS CONFIGURATION`
- DMARC: `REQUIRES DNS CONFIGURATION`
- Production gate: `PASS` — production boots only with
  `EMAIL_TRANSPORT=console|smtp`; anything else is a hard `RuntimeEnvError`.

## Summary Matrix

- Provider configured: `NO`
- Sender configured: `NO`
- Real verification email triggered: `YES`
- Provider accepted message: `YES (console transport)`
- Actual inbox delivery verified: `NOT AVAILABLE`
- SMTP transport (nodemailer) unit/E2E against local sink: `PASS` (16 tests)
- SMTP failure sanitization (no secret leakage): `PASS`
- SMTP `testConnection` verify: `PASS` (unit, against local sink)
- Production capability gating (console never capable): `PASS`
- `APP_PUBLIC_URL` precedence over `APP_URL`: `PASS`
- Verification link/OTP: `PASS`
- Expiration: `PASS`
- Single-use: `PASS`
- Resend: `PASS`
- Welcome triggered once: `PASS`
- AR template: `PASS`
- EN template: `PASS`
- TR template: `PASS`
- Mobile HTML: `PASS`
- Plain-text fallback: `PASS`
- Secrets in logs: `NO`
- SPF/DKIM/DMARC: `REQUIRES DNS CONFIGURATION`

## Decision

- `EMAIL READY = NO`
- `READY FOR STAGING = NO`
- Status: `BLOCKED ONLY BY REAL PROVIDER CONFIGURATION` — all transport code,
  tests, and gating are in place and green; the sole blocker is a real SMTP/API
  provider (host/user/pass/sender/`APP_PUBLIC_URL`) plus SPF/DKIM/DMARC DNS
  records, then an actual inbox-delivery journey.
