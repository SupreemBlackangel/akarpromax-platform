# Email / OTP Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference email/OTP

- **Libs:** nodemailer 9 (+ `@types/nodemailer`), `input-otp` (component), `web-push` (notifications, separate concern).
- **Flows (evidence in `auth-server*.js` scratch + routes):**
  - Email **verification**: `verificationToken = jwt.sign({ email }, secret, { expiresIn: "1h" })` → `/verify-email/:token`.
  - Password **reset**: `resetToken = jwt.sign({ userId, email }, secret, { expiresIn: "15m" })` → `/reset-password/:token`.
  - OTP component exists in UI kit but no OTP server flow found in route inventory (only jwt-token flows verified statically).
- **Weaknesses:**
  - Email tokens signed with `process.env.JWT_SECRET || "my_super_secret_key"` fallback (forgeable if env missing) — AUTH_SECURITY_FINDINGS.md.
  - Verification token carries email only (no userId/token rotation); no rate limiting on verify/resend evidence.
  - No OTP rate limiting or expiry enumeration in evidence.

## 2. Target email/OTP

- **Current:** `app/api/auth/verify` route exists (register/login flow scaffolding) but **no SMTP/email provider wired**, no forgot/reset routes, no OTP. `api/auth/register|login` exist; session cookie set on success.
- **Needs:** SMTP config (nodemailer), verification email with jose-signed short-lived token, forgot/reset endpoints, optional numeric OTP for account actions (align with directive's email OTP requirement).

## 3. Gap/action table

| Flow | Reference | Target | Action |
|---|---|---|---|
| Verify email | jwt email token (1h) + `/verify-email/:token` | `api/auth/verify` (no sender) | REBUILD: add SMTP + email template + sign with `SESSION_SECRET`-derived jose token; validate token → activate user |
| Password reset | jwt token (15m) + `/reset-password/:token` | none | REBUILD: `/api/auth/forgot` + `/api/auth/reset` + page in `(account)` |
| OTP | component only | none | REBUILD_FROM_BEHAVIOR: numeric OTP (approved `input-otp` or plain inputs) for sensitive actions; rate-limit + short expiry (5–10 min) + max attempts |
| Rate limiting | none verified | none | ADD: per-email/IP attempt limits (Phase 1) |

## 4. Decisions
- **REBUILD_FROM_BEHAVIOR** all email flows in target (no nodemailer dep approved yet — see DEPENDENCY_APPROVAL_LIST).
- **KEEP** jose session signer; use same secret domain for email tokens (separate TTL).
- **DO_NOT_MIGRATE** reference fallback-secret pattern or client-only token handling.

**Decision:** REBUILD target email/OTP (Phase 2), gated on SMTP/`nodemailer` approval. OTP numeric + token reset flows, rate-limited.
