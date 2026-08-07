================================================================================
RECOVERY EXECUTION PLAN
================================================================================

Baseline commit: 5064183 (docs(phase3): migration matrix, result, and ADR for feature-page adoption)
Current branch: refactor/architecture-foundation
Worktree: Modified files from Phase 4 auth (uncommitted), INTEGRATION_EXECUTION_PLAN.md, SERVICES_EXECUTION_PLAN.md

Services marketplace current health:
- 118 tests passing
- Build successful
- 22 services marketplace tables in D1/MySQL
- 30+ services APIs (/api/services/* and /api/service-*)
- Matching engine with Haversine geo matching
- RBAC with service_provider, service_supervisor, sponsor_admin, super_admin
- Seed data with 30 categories, 4 providers, 4 requests
- Public pages: /services, /services/catalog/[code], /providers/[id], /service-requests, /service-requests/[id], /service-requests/new, /service-requests/[id]/offer, /providers/apply
- Customer dashboard: 9 pages under /dashboard/services/
- Admin services: /admin/services with tabs (overview, providers, reports, categories)

Existing service tests: 118 passing (services-marketplace, services-matching, services-authz, services-api, services-e2e, auth-phase4, etc.)

Service gaps confirmed:
1. Services Categories Page — `/services/categories` does not exist
2. Service Request Wizard — `/service-requests/new` is single form, needs 8-step wizard
3. Centralized Sidebar Config — No `src/config/*sidebar.ts`, navItems hardcoded in ServiceDashboardShell.tsx
4. Customer Dashboard Sidebar Missing — "الخدمات الجارية", "الخدمات المكتملة", "المفضلة", "الإشعارات", "الإعدادات"
5. Provider Workspace Missing — "الطلبات القريبة", "الطلبات المتاحة", "معرض الأعمال", "مناطق التغطية", "أوقات العمل", "الوثائق والتحقق"
6. Service Supervisor Dashboard — Does not exist at `/dashboard/services/supervisor`
7. Disputes Pages — Only API route exists, no dashboard pages
8. Dashboard Counts API — Does not exist
9. State Machine Alignment — Current statuses need mapping to canonical model
10. Duplicate API Routes — `/api/services/*` and `/api/service-*` both exist
11. Seed Data — Need to review/expand for comprehensive test coverage
12. Documentation — 12 docs files need creation

Files expected to change:
- app/services/categories/page.tsx (NEW)
- app/service-requests/new/page.tsx (REFACTOR to wizard)
- src/config/user-sidebar.ts (NEW)
- src/config/provider-sidebar.ts (NEW)
- src/config/service-supervisor-sidebar.ts (NEW)
- src/config/admin-sidebar.ts (NEW)
- src/components/services/ServiceDashboardShell.tsx (REFACTOR to use config)
- app/dashboard/services/* (ADD missing pages)
- app/dashboard/services/supervisor/* (NEW)
- app/dashboard/services/disputes/* (NEW)
- app/api/service-dashboard/counts/route.ts (NEW)
- lib/services/state-machine.ts (NEW)
- lib/services/seed-marketplace.ts (EXTEND)
- docs/services/*.md (12 NEW files)

Database changes required for Stage A: NO (all tables exist)
API changes required: YES (new counts API, consolidate duplicate routes)

Sidebar migration: REFACTOR ServiceDashboardShell to use centralized config
Wizard migration: CONVERT single form to 8-step with draft save/resume
Supervisor workspace: CREATE new at /dashboard/services/supervisor
Disputes: CREATE dashboard pages for customer/provider/supervisor
Counts API: CREATE /api/service-dashboard/counts
State-machine alignment: CREATE adapter mapping current → canonical
Seed update: EXTEND existing seed-marketplace.ts
Legacy API consolidation: DEFER removal, create compatibility layer

Connected Ecosystem plan preserved: YES (INTEGRATION_EXECUTION_PLAN.md exists)
Connected Ecosystem implementation blocked until Stage A: YES

Integration plan file: INTEGRATION_EXECUTION_PLAN.md
Database target concern: D1/MySQL current, PostGIS future — Stage A uses existing Haversine adapter; Stage B will create GeoRadar abstraction for PostGIS migration

Stage A verification gates:
- npm run lint
- npm run typecheck
- npm run test (all 118+ existing + new tests)
- npm run build
- npm run architecture
- npm run boundaries
- All public services routes work
- Customer dashboard works with complete sidebar
- Provider workspace works with complete sidebar
- Supervisor dashboard works with RBAC
- Admin services works
- Disputes workflow works
- Wizard draft/resume works
- State transitions protected
- Seed idempotent, rejects production

Rollback point: git revert to 5064183
================================================================================