# Phase 0 — Result

Generated: 2026-08-06

Phase 0 (Foundation Hardening) is complete in the target repo
`E:\Akarpromax new 2027\V 2.0 GPT - Copy` (branch `refactor/architecture-foundation`).
Reference repo `D:\new program - Copy` was never modified.

## Final gate run

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | **0 errors** (23 warnings, all pre-existing in files untouched by Phase 0: cad/*, LocationPicker, SponsorIdentity, Sidebar, pdf-export; none in Phase 0 files) |
| Typecheck | `npx tsc --noEmit` | **Clean (0 errors)** |
| Architecture | `node scripts/check-architecture.mjs` | **PASS** (0 violations; arch-025 line-count warnings pre-existing) |
| Module boundaries | `node scripts/check-module-boundaries.mjs` | **PASS** (0 violations) |
| Build | `npm run build` (vinext build) | **Pass** |
| Baseline tests | `npm test` (6 explicit files) | **44/44 pass** |
| Full suite | `node --import tsx --test tests/*.test.mjs` + `tests/services-e2e.mjs` | **130/130 pass** (44 baseline + 42 new security tests + 12 a11y + 1 e2e gate + rendered-html) |

## Delivered

### Security & runtime
1. **Runtime env fail-fast** — `lib/config/runtime-env.ts`: production rejects
   missing/short/weak/placeholder `SESSION_SECRET`, missing `DATABASE_URL` /
   `APP_URL`, empty `TRUSTED_ORIGINS`; dev/test fallback secrets; never logs
   values. (`tests/runtime-env.test.mjs`, 17)
2. **Origin/CSRF guard** — `lib/security/origin.ts`: safe-method bypass, webhook
   extension point (empty set), localhost-only-in-dev, uniform 403. (`tests/origin-guard.test.mjs`, 9)
3. **Auth rate limiting** — `lib/security/rate-limit.ts`: per-op limits, sha256
   hashed keys, cooldowns, identifier/IP normalization, in-memory store with
   prod warning + horizontal-scale policy. (`tests/rate-limit.test.mjs`, 12)
4. **Session hardening** — `lib/auth/session.ts`: HS256 pinned, jti rotation,
   relative `exp` (jose quirk documented), revocation set, hardened cookie
   attrs. (`tests/session.test.mjs`, 9)
5. **Dev-login guard** — `lib/security/dev-login.ts`: blocked in prod/test,
   dev-only opt-in; route still absent. (`tests/dev-login.test.mjs`, 5)
6. **Schema latch + health** — `lib/runtime-db.ts` (single-flight schema mode),
   `GET /api/health` (200/503, no creds/URLs/SQL). (`tests/schema-latch.test.mjs`, 8)
7. **Security headers** — `lib/security/headers.ts`: CSP-Report-Only,
   nosniff, Referrer-Policy, Permissions-Policy, framing, HSTS prod-only.
   (`tests/security-headers.test.mjs`, 7)
8. **Errors + audit + handler** — `lib/errors/api-error.ts` (`fieldErrors`),
   `lib/security/audit.ts` (request ids, redaction, `[security]` events),
   `lib/api/handler.ts` (origin first, unified error shape, never logs secrets).
   (`tests/audit-log.test.mjs`, 7)
9. **Auth routes migrated** — `app/api/auth/{login,register,verify,logout,me}`
   use the handler: boot validation, origin guard, request ids, `Cache-Control:
   no-store`, security headers, rate limits (login/register/verify), preserved
   `409 already_registered` and 400/410/401 contracts.

### UI / accessibility
10. **UI primitives** — `src/components/ui/`: `VisuallyHidden`, `SkipLink`,
    `FormError`, `FormField`, `focus-trap`.
11. **Shared surfaces hardened** — `Modal` (unique title id, focus trap, focus
    restore), `Input` (`aria-invalid`/`aria-describedby`/`role="alert"`),
    `AccountDialog` (focus trap + restore + field-level aria wiring), skip link
    in `app/layout.tsx`, `#main-content` landmark, reduced-motion CSS block.
    (`tests/accessibility.test.mjs`, 12)

### Docs & inventory
12. Reports: `docs/audit/ROOT_CLEANUP_REPORT.md` (root `_e2e_*.mjs` →
    `REMOVE_FROM_GIT`; logs/bundle already ignored).
13. ADRs: `ADR-PHASE-0-CSRF-PROTECTION`, `ADR-PHASE-0-SESSION-COOKIE`.
14. Policies: `AUTH_RATE_LIMIT_POLICY`, `SECURITY_HEADERS_POLICY`,
    `SECRET_ROTATION_REQUIRED`, `REMOVAL_PLAN`.
15. Inventories: `docs/ui/RADIX_PRIMITIVES_INVENTORY.md` (no Radix added).
16. Verification: `PHASE_0_BASELINE`, `PHASE_0_ACCESSIBILITY_BASELINE`.
17. `.env.example` updated (`APP_URL`, `TRUSTED_ORIGINS`, `ENABLE_DEV_LOGIN`,
    `ALLOW_MYSQL_FALLBACK`, placeholder notes).

## Known limitations (unchanged, documented)
- PG-backed auth runs only under `vinext dev` (Node/Workers runtime); `vinext
  start` stays MySQL-backed.
- In-memory rate-limit + session revocation → shared store required before
  horizontal scaling.
- CSP is Report-Only this phase; enforcing it is a follow-up.
- Missing-Origin callers (non-browser) are accepted by design (SameSite +
  rate limiting still apply).

## Not in scope / never done
- No changes to business logic, colors, RTL, or Dark Mode.
- No new ORM/auth provider, no DB schema change, no new dependency.
- No Phase 1 work started. Reference repo untouched.
