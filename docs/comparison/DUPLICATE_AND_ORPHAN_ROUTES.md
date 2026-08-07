# Duplicate & Orphan Routes

**Mode:** PLAN (read-only).

---

## 1. Reference duplicates (in `akarpromax-web/akar-frontend-src/src/pages/`)

| Duplicate pair | Evidence | Action |
|---|---|---|
| `Profile.tsx` vs `ProfilePage.tsx`; both bound: `/profile/:userId` AND `/profile/:username` | `App.tsx` registers both paths | Keep ONE canonical profile page; single route. REMOVE other. |
| `Dashboard.tsx` vs `DashboardPage.tsx` | `App.tsx` binds `/dashboard` to `Dashboard` | Keep canonical; REMOVE twin. |
| `ServiceHub.tsx` vs `ServiceHubPage.tsx` | `App.tsx` binds `/service-hub` to `ServiceHub` | Keep canonical; REMOVE twin. |
| `AdminUsers.tsx` vs `AdminUsersPage.tsx` | `App.tsx` binds `/admin/users` to `AdminUsers` | Keep canonical; REMOVE twin. |
| `AdminAds.tsx` + `AdminAds.tsx.bak.0` | backup file in tree | DELETE `.bak.0` on migration. |
| `schema.prisma.bak.0`, `ads.ts.bak.0` | server backups | DELETE during port. |

## 2. Reference orphans / dead-ends

| Item | Why orphan | Action |
|---|---|---|
| `/home-vehicle-services` | SPA redirect shim to `/vehicle-services` | DO_NOT_MIGRATE. |
| `/dev-login` (`DevLogin.tsx`) | Developer-only login route exposed in production bundle | DO_NOT_MIGRATE (security). |
| `AdminAuctions` route | Registered in `App.tsx` WITHOUT `adminOnly` guard (other admin routes have it) | Fix on port: gate with admin role. |
| `AdminFreeResources.tsx` | No `/admin/free-resources` route found in `App.tsx` extract | Confirm; either wire or drop on port. |
| Root debris (26 `.js` scratch scripts, `_edit/`, `.vite/`, cookie logs, `nginx-akarpromax.conf`) | Unreferenced by `akarpromax-web` | REFERENCE_ONLY archive; never migrate. |

## 3. Target duplicates / orphans

- **Routes:** none found (`glob` of `app/**/page.tsx` and `route.ts` shows a clean tree; no `.bak`, no twin pages).
- **Scratch at repo root:** `_e2e_ads.mjs`, `_e2e_clean.mjs`, `_e2e_seed.mjs`, build logs/bundles and a backup folder remain from prior work. Not wired into `package.json` scripts. Post-approval cleanup task (files only, not architecture).
- **`admin/services` vs `dashboard/services`:** same business surface (services marketplace) intentionally split across Admin (management) and Workspace (participant) groups — NOT a duplicate; keep.

## 4. Orphan reference features with no target home (decision: rebuild or drop)

| Feature | Route(s) | Decision |
|---|---|---|
| Auctions (6 pages + admin) | `/auctions*`, `/admin/auctions` | REBUILD_FROM_BEHAVIOR (REST, no socket) |
| Tenders (4 pages + admin) | `/tenders*` | REBUILD_FROM_BEHAVIOR |
| Vehicle services | `/vehicle-services` | REBUILD (module under services) |
| Market history / investment radar | `/market-history`, `/investment-radar` | REBUILD (analytics dashboards) |
| Licensing/Payments | `/software`, `/buy-license`, `/subscribe`, `/payment/*`, `/admin/payments` | REBUILD (needs payment approval — DEPENDENCY_APPROVAL_LIST) |
| Marketer/Advertiser/Partner programs | 8 routes | REBUILD (Phase 8) |

**Decision:** KEEP target clean routing; on port, delete all reference twins/backups and never migrate `/dev-login` or `/home-vehicle-services`. Fix the `AdminAuctions` missing-guard bug in the rebuilt version.
