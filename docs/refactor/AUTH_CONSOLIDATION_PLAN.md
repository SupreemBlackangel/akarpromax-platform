# AUTH CONSOLIDATION PLAN

> **Phase 5 status (2026-08-06):** Execution-order items 5-8 are complete.
> `app/chatgpt-auth.ts` was deleted; all 15 admin gates use `requireSessionUser()`
> from `lib/sponsor-auth.ts` (session-only, no ChatGPT headers, no bearer, no
> localhost fallback); `AccountDialog.tsx` no longer touches `localStorage`;
> `getSponsorIdentity()` resolves from the `akar_session` cookie only. Remaining
> items (email verification, OTP, RBAC migration of `sponsor_access`, first-login
> welcome, audit log) are tracked separately.

## Target Identity Model
- The only production identity provider is **AkarProMax Identity**.
- The only production session transport is **secure HttpOnly cookies**.
- Browser `localStorage` bearer-token auth is prohibited in production.
- OpenAI/ChatGPT header identity is prohibited in production.
- Localhost auto-admin fallback is prohibited in production.
- Authorization must be server-side and role/permission based.
- The target identity feature set includes:
  - Email/password login
  - Email verification
  - OTP flow
  - Secure HttpOnly cookies
  - Server-side authorization
  - Roles and granular permissions
  - Temporary restrictions
  - Audit log
  - First-login welcome flow

## Current Auth Systems

### System 1: AkarProMax Identity Cookie Session
- Status: keep and harden
- Files:
  - `lib/auth/session.ts`
  - `app/api/auth/login/route.ts`
  - `app/api/auth/register/route.ts`
  - `app/api/auth/me/route.ts`
  - `app/api/auth/logout/route.ts`
  - `src/components/AccountDialog.tsx`
  - `src/components/tools/ToolsGate.tsx`
  - `app/api/user-context/route.ts`
  - `lib/sponsor-auth.ts`
- Session method:
  - `akar_session` JWT cookie signed by `jose`
- Current strengths:
  - Already cookie-based
  - Already has login/register/logout/me route family
  - Already resolves user server-side in multiple places
- Current risks:
  - Session model is mixed with other identity paths
  - Verification currently depends on MySQL flow
  - Authorization is partly client-fetched (`PermissionGuard`, `ToolsGate`) instead of fully server-enforced

### System 2: Browser Bearer Token via `localStorage`
- Status: disable and remove
- Files:
  - `src/components/AccountDialog.tsx`
  - `app/chatgpt-auth.ts`
- Session method:
  - `localStorage["akar_token"]`
  - optional `Authorization: Bearer ...`
- Current risks:
  - Violates the approved production session model
  - Exposes tokens to XSS risk
  - Creates two parallel browser auth paths
  - Login flow does not consistently issue a token, so behavior is partially broken already

### System 3: OpenAI/ChatGPT Header Identity
- Status: disable and remove from production
- Files:
  - `app/chatgpt-auth.ts`
  - All admin page gates calling `requireChatGPTUser()`
    - `app/admin/page.tsx`
    - `app/admin/ads/page.tsx`
    - `app/admin/i18n/page.tsx`
    - `app/admin/news/page.tsx`
    - `app/admin/reports/page.tsx`
    - `app/admin/roles/page.tsx`
    - `app/admin/settings/page.tsx`
    - `app/admin/sponsors/page.tsx`
    - `app/admin/sponsors/banner/page.tsx`
    - `app/admin/sponsors/new/page.tsx`
    - `app/admin/sponsors/requests/page.tsx`
    - `app/admin/sponsors/[id]/page.tsx`
    - `app/admin/sponsors/[id]/edit/page.tsx`
    - `app/admin/users/page.tsx`
- Session method:
  - trusted request headers and optional bearer lookup
- Current risks:
  - Non-product identity source
  - Breaks portability of admin auth
  - Makes admin access dependent on host or upstream header injection

### System 4: Localhost Auto-Admin Fallback
- Status: disable and remove from production
- Files:
  - `app/chatgpt-auth.ts`
  - references in tests/seeds using `admin@localhost.akarpromax`
- Session method:
  - host-based implicit admin grant on localhost
- Current risks:
  - Bypass path outside the approved identity system
  - Encourages hidden assumptions in admin gates and tests

## Supporting Identity Resolver That Must Be Simplified
- File: `lib/sponsor-auth.ts`
- Current behavior:
  - tries session identity first
  - then ChatGPT/header identity
  - then runtime `sponsor_access`
  - then MySQL admin-role promotion
- Required end state:
  - session identity only
  - scoped permissions resolved from PostgreSQL-backed RBAC data only

## Session Standard
- Cookie name: keep one canonical session cookie namespace
- Required attributes:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` unless a stricter approved flow requires otherwise
  - `Path=/`
- Session policy:
  - no auth token persistence in `localStorage`
  - no client-trusted role source
  - all role/permission checks resolved on the server

## Plan to Disable Non-Approved Systems

### Disable Plan for Browser Bearer Token
1. Remove `localStorage` token writes from `AccountDialog`.
2. Remove `bearerHeader()` from the browser auth flow.
3. Remove bearer-token reads from `app/chatgpt-auth.ts`.
4. Replace any remaining token-based `Authorization` assumptions with cookie-backed server calls.

### Disable Plan for OpenAI/ChatGPT Header Identity
1. Replace `requireChatGPTUser()` in admin routes with AkarProMax session guard.
2. Replace header-derived identity in `getChatGPTUser()` call sites with session-derived identity service.
3. Remove header parsing from production auth path.
4. Leave any adapter needed for non-production tooling outside production runtime, if still required.

### Disable Plan for Localhost Auto-Admin
1. Remove host-based admin fallback from admin identity resolution.
2. Replace local admin testing with seeded AkarProMax Identity users in PostgreSQL.
3. Update tests and seeds to authenticate through the approved identity path only.

## User and Session Migration Plan

### Users
1. Treat PostgreSQL auth users as the initial canonical seed set.
2. Import MySQL/D1 user records into PostgreSQL staging.
3. Match by normalized email first, then phone, then explicit legacy mapping table.
4. Merge metadata fields:
  - verified state
  - country/city
  - last login
  - status
5. Migrate scoped sponsor/admin roles into PostgreSQL RBAC assignment tables.

### Sessions
- Do **not** blindly migrate live legacy sessions.
- Reason:
  - cookie format, signature path, and security guarantees differ across systems
  - header and `localStorage` auth are being retired, not preserved
- Safe strategy:
  - preserve users and verification state
  - expire legacy sessions at cutover
  - force re-login using AkarProMax Identity

### Verification and OTP
1. Migrate active unconsumed verification challenges only if still valid.
2. Expired or consumed challenges are archived, not reissued as active.
3. New OTP/verification issuance moves to PostgreSQL-backed identity tables.

### Scoped Permissions and Restrictions
1. Convert `sponsor_access` rows into PostgreSQL scope assignments.
2. Convert role strings into normalized RBAC role keys.
3. Add temporary restriction tables in PostgreSQL for timed blocks/suspensions.

## Execution Order
1. Freeze new auth-related feature work.
2. Model final PostgreSQL identity + RBAC schema.
3. Introduce one server-side identity service abstraction.
4. Re-point `/api/auth/*` and `/api/user-context` to the new identity service.
5. Move admin route guards off `requireChatGPTUser()` and onto cookie-backed server checks.
6. Remove `localStorage` bearer token logic.
7. Remove header identity logic.
8. Remove localhost auto-admin fallback.
9. Run user/RBAC migration and verification.
10. Enable first-login welcome flow and temporary restrictions on the unified system.

## Permission and Auth Test Plan
- Anonymous user cannot access `/admin`.
- Authenticated standard user can access public/account routes only.
- Authorized admin can access `/admin` modules according to permissions.
- User without `TOOLS_USE` cannot access `/tools` or future deferred workspace tools.
- Email verification required state is respected.
- OTP challenge expiry and retry limits work correctly.
- Session cookie has `HttpOnly`, `Secure`, and `SameSite` attributes.
- Logout invalidates the current session.
- Temporary restriction expires correctly.
- Audit log entry is written for login, logout, admin-sensitive actions, and permission changes.

## Rollback Plan
- Keep a release tag and deployment rollback target before cutover.
- Preserve legacy auth source code until the unified path passes staged verification, but do not keep non-approved systems active in production after cutover.
- If cutover fails:
  1. redeploy previous tagged release
  2. restore previous session secret/config if changed
  3. restore PostgreSQL snapshot if RBAC/user migration corrupted state
  4. invalidate all partially migrated sessions
  5. reopen access through the last known-good AkarProMax release only

## Success Criteria
- Exactly one production identity system remains.
- Exactly one production session transport remains.
- All admin and user authorization is server-side.
- No `localStorage` auth, header identity, or localhost fallback remains in production.
