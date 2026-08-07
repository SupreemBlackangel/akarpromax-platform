# Auth Security Findings

**Mode:** PLAN (read-only). Findings from static inspection of reference (`D:\new program - Copy`) and target (`E:\...`). Severity: CRITICAL/HIGH/MEDIUM/LOW. No changes made.

---

## Reference findings

| # | Severity | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| R1 | CRITICAL | Hardcoded JWT fallback secret `"my_super_secret_key"` if `JWT_SECRET` unset | `auth-server*.js` (8 files): `jwt.sign(..., process.env.JWT_SECRET \|\| "my_super_secret_key", ...)`, same for `jwt.verify` | Never port. Enforce required secret (target `lib/auth/session.ts` throws via `!` but reads env; add runtime check + refuse to boot without `SESSION_SECRET`) |
| R2 | HIGH | JWT stored client-side (Bearer) → XSS token theft; no HttpOnly cookie | `middleware/auth.ts` `requireAuth` reads `req.headers.authorization` | Keep target HttpOnly cookie model (already) |
| R3 | HIGH | 30-day unrotatable stateless JWT; no revocation | `generateToken` `expiresIn: "30d"` | Target 7d cookie + logout deletes cookie (already); consider session table if revocation needed |
| R4 | HIGH | Developer backdoor route `/dev-login` shipped in bundle | `DevLogin.tsx` + `App.tsx` route | DO_NOT_MIGRATE (target has none) |
| R5 | MEDIUM | `AdminAuctions` route registered WITHOUT `adminOnly` | `App.tsx` `/admin/auctions` entry | Fix on port (guard with permission) |
| R6 | MEDIUM | Client-only `adminOnly` prop gate (bypassable) | `ProtectedRoute` usage | Target server-side gates (already) |
| R7 | MEDIUM | Committed secrets/artifacts: `server/.env` (key list: PORT, CHAT_PORT, JWT_SECRET, ENC_KEY, ENC_SALT, DESKTOP_SIGNATURE, NODE_ENV), `prisma/dev.db`, `chat.sqlite` | repo tree | Never commit real secrets; target commits `.env.example` only (already) |
| R8 | MEDIUM | No email-token rate limiting or per-request origin/CSRF checks verified | route inventory | Add rate limiting + origin checks (Phase 1) |
| R9 | LOW | Page twins / `.bak.0` backups double the attack surface (dead code) | `AdminAds.tsx.bak.0`, `schema.prisma.bak.0` | Delete on port |
| R10 | LOW | `optionalAuth` swallows verify errors (silent identity fallback) | middleware | Avoid optional auth on privileged data |

## Target findings

| # | Severity | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| T1 | MEDIUM | Cookie session under `vinext start` isn't reliably readable → `authenticated:false` on `/api/auth/me` (HTTP). Workaround exists for wizard; full-reload persistence blocked | AGENTS.md "Production session-cookie limitation" | Phase 1: add explicit `Cookie`-header read already present in `readSessionCookieValue`; verify on start after PG/MySQL auth decision; document |
| T2 | MEDIUM | No CSRF token; SameSite=lax mitigates most cross-site POST but custom headers/origin checks not centralized | `lib/auth/session.ts:36-42` | Phase 1: central origin/Referer check or double-submit token for state-changing routes |
| T3 | MEDIUM | `SESSION_SECRET` loaded via `process.env.SESSION_SECRET!` non-null assertion — server will not fail fast with a helpful message if unset | `lib/auth/session.ts:10` | Add explicit env guard at boot |
| T4 | LOW | `getSession` catches all jwtVerify errors → null (fine) but no distinction between expired vs invalid for UX | `lib/auth/session.ts:49-53` | Optionally surface expiry for refresh UX |
| T5 | INFO | Runtime DB fallback MySQL on D1 schema-init failure is a singleton — a reject leaves MySQL fallback until restart | AGENTS.md runtime-db | Future: retry/latch instead of sticky fallback |

## Cross-project
- Both use bcryptjs (KEEP target usage). Both lack: login rate limiting, account lockout, MFA — Phase 1 hardening backlog.
- Target must NOT reintroduce reference patterns: header identity, localStorage bearer, `admin@localhost.*` fallback, `/dev-login`.

**Decision:** REMOVE all reference auth patterns from consideration; KEEP target session model and add Phase 1 hardening (T2, T3) + email rate limits (R8-equivalent) when email flows are rebuilt.
