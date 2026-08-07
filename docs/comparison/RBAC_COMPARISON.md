# RBAC Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference RBAC

- **Model:** single string `role` on user record; `requireRole(...roles)` middleware in `server/api/src/middleware/auth.ts`.
- **Admin:** `ProtectedRoute` in SPA with `adminOnly` prop; admin screens call `requireRole("admin")`-style guards on API.
- **Limitations:**
  - Coarse-grained (role-string equality only; no permissions matrix).
  - Front-end gate is a client-side prop (bypassable); back-end gate is per-route `requireRole` (inconsistent — `AdminAuctions` registered without `adminOnly`).
  - No audit trail of role changes; no supervisor-type roles.
  - Role changes require token refresh (30d token holds old role).

## 2. Target RBAC

- **Model:** session payload carries `role` + `permissions[]` (`lib/auth/identity-map.ts` `permissionsForSessionRole`, `mapSessionRole`); `lib/rbac/check.ts` centralizes checks; `PermissionGuard` (`src/components/PermissionGuard.tsx`) renders gates client-side; server-side `requireSessionUser()` + `hasSponsorPermission()` gate every admin/data route (`lib/sponsor-auth.ts`).
- **Roles (directive non-negotiable):** USER, ADMIN, PROPERTY_SUPERVISOR, SERVICE_SUPERVISOR, CONTENT_SUPERVISOR, ADS_SUPERVISOR. New users default to USER; admin promotions are **audit-logged** (Phase 5 auth consolidation committed).
- **Permissions catalog:** frontend `ROLE_CATALOG` + `PERMISSIONS` constants (`src/constants/`).
- **Strengths:** server-authoritative gates; permissions derived from session server-side; consistent single identity source (session cookie only).

## 3. Comparison

| Aspect | Reference | Target |
|---|---|---|
| Granularity | role string | role + permission matrix |
| Server authority | per-route middleware (uneven) | central `requireSessionUser`/`hasSponsorPermission` on all admin/data routes |
| Front-end gate | client `adminOnly` prop | `PermissionGuard` + session-backed viewer |
| Supervisor roles | none | 4 supervisor roles (property/service/content/ads) |
| Admin promotion audit | none | audit-logged (Phase 5) |
| Default new-user role | implicit | USER (explicit) |
| Revocation speed | 30d JWT | cookie delete / expiry 7d |

## 4. Decisions
- **KEEP** target RBAC entirely. REUSE_AS_IS.
- **REBUILD (migrate)** reference admin screens onto target permission gates — each `/admin/*` page declares required permission(s); no page relies on role-string equality.
- **DO_NOT_MIGRATE** `adminOnly` prop pattern or per-route string-role middleware.

**Decision:** KEEP target; port reference admin screens onto target permission gates (ADAPT).
