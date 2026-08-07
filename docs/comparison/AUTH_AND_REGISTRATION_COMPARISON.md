# Auth & Registration Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference auth flow

- **Stack:** Express 5 + `jsonwebtoken` (JWT Bearer). Evidence: `server/api/src/middleware/auth.ts`.
- **Signup:** `server/api/src/routes/auth.ts` (Register page → POST). Uses bcryptjs for hashing (dep listed).
- **Session:** `generateToken(user)` → `jwt.sign(..., { expiresIn: "30d" })`; client stores token (Bearer header on every request via `requireAuth`/`optionalAuth` middleware).
- **Email verification:** `/verify-email/:token` page; `auth-server*.js` scratch scripts show `verificationToken = jwt.sign({ email }, JWT_SECRET || "my_super_secret_key", { expiresIn: "1h" })` and a reset flow with `expiresIn: "15m"` — verification/reset use **email tokens** sent via nodemailer (dep listed).
- **Password reset:** `/reset-password/:token` page; same fallback-secret risk.
- **Roles:** single string `role` on user; `requireRole(...roles)` middleware checks `req.user.role`.
- **Weaknesses:**
  - JWT in `Authorization` header implies client-side token storage (localStorage risk — XSS theft).
  - 30-day expiry without refresh/rotation.
  - Hardcoded fallback `JWT_SECRET` (`"my_super_secret_key"`) across 8 root scratch scripts — if any production copy used it, tokens are forgeable.
  - `DevLogin.tsx` backdoor route; `AdminAuctions` route missing admin guard.
  - No cookie flags (HttpOnly/Secure/SameSite) — none exist because tokens aren't cookies.
  - No server-side session revocation (JWT stateless) — logout is client-only.

## 2. Target auth flow

- **Stack:** Session cookie `akar_session` (jose HS256, 7d) — `lib/auth/session.ts:9-43`.
- **Login/Register/me:** `app/api/auth/login|register|me|logout|verify/route.ts`; bcryptjs hash (`lib/auth/password.ts`).
- **Identity chain:** `lib/auth/identity-map.ts` maps session role → permissions (`permissionsForSessionRole`); `lib/rbac/check.ts` + `PermissionGuard` enforce front-end; `lib/sponsor-auth.ts` (`requireSessionUser`, `getSponsorIdentity`) gates all admin/data routes.
- **Cookie flags:** `httpOnly: true`, `secure` in production, `sameSite: "lax"`, 7d maxAge (`lib/auth/session.ts:36-42`).
- **Revocation:** `destroySession()` deletes cookie (`:105-108`); server-side `logout` route.
- **Header identity removed:** no ChatGPT header identity, no localStorage bearer, no `admin@localhost.*` fallback (AGENTS.md).
- **Weaknesses (known, documented):**
  - Under `vinext start`, `cookies()`/`headers()` cookie reads are unreliable → `GET /api/auth/me` returns `authenticated:false` over HTTP; account wizard builds viewer from local state (AGENTS.md). Session persistence across full reload blocked in start mode. This is a **platform limitation**, not a design flaw.
  - PG auth runs under `vinext dev` only (PG cannot load under `start` — `cloudflare:` sockets). MySQL-backed auth under start is a future option.

## 3. Comparison table

| Aspect | Reference | Target | Verdict |
|---|---|---|---|
| Credential storage | JWT in client (Bearer) | HttpOnly cookie | TARGET (cookie wins) |
| Expiry | 30d, no refresh | 7d, no refresh | TARGET (shorter; consider rotation later) |
| CSRF exposure | Bearer (n/a) | Cookie + sameSite=lax; no CSRF token yet | RISK — add CSRF token or rely on SameSite+origin checks (Phase 1) |
| Hashing | bcryptjs | bcryptjs 3.0.3 | Same (KEEP target) |
| Email verify/reset | nodemailer + jwt email tokens | `api/auth/verify` exists; email sending NOT built | REBUILD email provider (approval item) |
| Roles | string role | role + permissions array | TARGET (RBAC_COMPARISON) |
| Logout | client-side only | cookie delete + route | TARGET |
| Session revocation | none (stateless) | cookie delete; no server blacklist | Adequate for scope; note future needs |
| Dev backdoor | `/dev-login` | none | TARGET (removed) |

## 4. Decisions
- **KEEP** target session-cookie auth. REUSE_AS_IS.
- **MERGE (REBUILD_FROM_BEHAVIOR):** email verification + reset flows into `api/auth/verify` + new `api/auth/forgot|reset` routes using jose email tokens + SMTP provider (nodemailer) — approval item.
- **ADD (Phase 1):** CSRF origin/same-site hardening for cookie session under start mode.
- **DO_NOT_MIGRATE:** reference JWT Bearer model, `DevLogin`, localStorage identity, header identity.

**Decision:** KEEP target; port reference email flows as REBUILD; harden CSRF in Phase 1.
