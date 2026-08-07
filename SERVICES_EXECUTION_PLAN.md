================================================================================
SERVICES MARKETPLACE EXECUTION PLAN
================================================================================

Baseline commit: 5064183 (Phase 4 committed - branch refactor/architecture-foundation)
Current branch: refactor/architecture-foundation
Worktree status: Clean, all 118 tests passing, build successful

Existing service routes:
- Public: /services, /services/catalog, /services/catalog/[code], /providers/[id], /service-requests, /service-requests/[id], /service-requests/new, /service-requests/[id]/offer, /providers/apply
- Customer Dashboard: /dashboard/services (overview, my-requests, matched-requests, offers, offers/[id], jobs, jobs/[id], inbox, reviews, provider-profile)
- Admin: /admin/services (overview, providers, reports, categories tabs)
- API: /api/service-requests, /api/service-offers, /api/service-providers, /api/service-categories, /api/service-notifications, /api/service-messages, /api/service-jobs, /api/service-reports, /api/service-admin, /api/service-providers/me/matched-requests

Existing service APIs:
- Core: createRequest, listRequests, getRequest, cancelRequest, createOffer, listOffers, acceptOffer, updateOrderStatus, addReview, openDispute, sendMessage, threadMessages
- Marketplace: Provider profiles, categories, documents, portfolio, requests full lifecycle, offers full lifecycle, jobs, reviews, reports, messages, notifications, outbox
- Matching: findCandidateProviders, runMatching, computeMatchScore, distanceKm
- Admin: getAdminOverview, setProviderStatus, createServiceCategory, listProviderProfiles, moderateTarget

Existing database entities (D1/SQLite):
- service_categories, service_listings, service_requests, service_offers, service_orders, service_messages, service_reviews, service_disputes, service_bookmarks
- service_provider_profiles, service_provider_categories, service_provider_documents, service_provider_portfolio
- service_request_answers, service_request_attachments, service_request_matches, service_request_status_history, service_offer_revisions, service_job_timeline, service_reports, service_notifications, service_outbox_events

Existing user dashboard: /dashboard/services with ServiceDashboardShell (10 pages, sidebar nav, notifications bell)
Existing provider workspace: Same as customer dashboard (service_provider role uses same shell)
Existing admin pages: /admin/services with tabbed interface (overview, providers, reports, categories)
Existing sidebar sources: Hardcoded navItems in ServiceDashboardShell.tsx; Admin sidebar in admin-sidebar.tsx with SERVICE_PERMISSIONS array
Existing RBAC: service_supervisor role with 30+ permissions; granular PERMISSIONS constants; sponsor-auth.ts identity system

Files to inspect: All lib/services/*.ts, app/api/service-*/**/*.ts, app/dashboard/services/**/*.tsx, app/admin/services/**/*.tsx, src/components/services/*.tsx, tests/services-*.mjs
Files to modify: ServiceDashboardShell.tsx (add missing nav items), Create /services/categories page, Create provider workspace sidebar config, Create service supervisor dashboard
Files to create: docs/services/*.md (11 docs), src/config/user-sidebar.ts, src/config/provider-sidebar.ts, src/config/service-supervisor-sidebar.ts
Files to deprecate: None (consolidate /api/service-* and /api/services/* routes if needed)
Dependencies proposed: None (all deps exist)

Public services strategy:
- KEEP existing /services hub page with categories, providers, requests sections
- CREATE /services/categories page listing all categories with search/filter
- REFACTOR service request wizard to 8-step flow (currently single form)
- KEEP provider profile page at /providers/[id]
- KEEP catalog pages at /services/catalog/[code]

Customer dashboard strategy:
- KEEP existing 10-page dashboard with ServiceDashboardShell
- ADD missing sidebar items per requirements: "الخدمات الجارية" (in-progress), "الخدمات المكتملة" (completed), "المفضلة" (bookmarks)
- REFACTOR navItems in ServiceDashboardShell to use centralized config

Provider workspace strategy:
- EXTEND ServiceDashboardShell navItems with provider-specific items: "الطلبات القريبة", "الطلبات المتاحة", "معرض الأعمال", "مناطق التغطية", "أوقات العمل", "الوثائق والتحقق"
- CREATE centralized provider-sidebar config
- KEEP existing provider-profile, matched-requests, offers, jobs pages

Supervisor dashboard strategy:
- CREATE dedicated /dashboard/services/supervisor page (separate from admin)
- ADD sidebar items: "نظرة عامة", "طلبات الخدمات", "طلبات قيد المراجعة", "الطلبات المفتوحة", "العروض", "مقدمو الخدمات", "طلبات التحقق", "التصنيفات", "المناطق والتغطية", "التقييمات", "الشكاوى والنزاعات", "الإعلانات الخاصة بالخدمات", "الإشعارات", "التقارير", "الإعدادات", "سجل التدقيق"
- USE service_supervisor role permissions for access control

Admin integration strategy:
- KEEP existing /admin/services with tabs
- ADD routes: /admin/services/requests, /admin/services/offers, /admin/services/reviews, /admin/services/disputes, /admin/services/settings
- REFACTOR admin-client.tsx to use centralized sidebar config

Sidebar strategy:
- CREATE src/config/user-sidebar.ts, src/config/provider-sidebar.ts, src/config/service-supervisor-sidebar.ts, src/config/admin-sidebar.ts
- Each item: { key, labelKey, href, icon, requiredRole, requiredPermission, badgeSource, featureFlag, children }
- REFACTOR ServiceDashboardShell and AdminSidebar to use configs
- BADGE COUNTS: Single API call for all badges (/api/service-dashboard/counts)

Service request strategy:
- REFACTOR /service-requests/new to 8-step wizard:
  1. اختيار التصنيف والخدمة
  2. وصف المشكلة أو العمل المطلوب
  3. تحديد الدولة والمدينة والحي
  4. تحديد الموقع ونطاق الخدمة
  5. إضافة الصور والمرفقات
  6. تحديد الموعد والميزانية
  7. بيانات التواصل
  8. المراجعة والإرسال
- ADD Draft save/resume functionality
- KEEP dynamic fields per category from service_categories.dynamic_fields

Offer strategy:
- KEEP existing offer lifecycle: sent → accepted/rejected/withdrawn/revised
- ADD revision history (already in service_offer_revisions)
- KEEP single active offer per provider per request (enforced by unique index)

State-machine strategy:
- ALIGN statuses with requirements: DRAFT, PENDING_REVIEW, OPEN, RECEIVING_OFFERS, OFFER_ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED, EXPIRED, DISPUTED
- CREATE centralized state machine in lib/services/state-machine.ts
- VALIDATE all transitions through service layer (already enforced in marketplace.ts)

Geographic matching strategy:
- KEEP existing haversine distanceKm in match-score.ts
- ADD PostGIS support when PostgreSQL available (currently D1/SQLite)
- EXTEND radius configuration per category/provider
- KEEP service_radius_km on provider profile

Notification strategy:
- KEEP existing in-app notifications (service_notifications table)
- MAP all required events to notification types
- KEEP email channel via existing email service (console/SMTP)
- NO new push/desktop providers in this phase

Review strategy:
- KEEP existing review system (service_reviews table with sub-ratings)
- ENFORCE "only after completed order" rule (already in addReviewFull)
- KEEP admin moderation (setReviewHidden)

Dispute strategy:
- KEEP existing dispute system (service_disputes table)
- ADD dedicated dispute pages in dashboard and admin
- MAP statuses: OPEN, UNDER_REVIEW, WAITING_CUSTOMER, WAITING_PROVIDER, RESOLVED, REJECTED, CLOSED

Seed-data strategy:
- KEEP existing seed-marketplace.ts with 30 categories, 4 providers, 4 requests, demo job
- ADD idempotent seed command: npm run seed:services
- ENSURE production protection (check NODE_ENV !== 'production')
- DOCUMENT in docs/services/SERVICES_SEED_DATA.md

Security strategy:
- KEEP Phase 0/4 auth: session-only, HS256 JWT, rate limiting, origin checks
- KEEP server-side RBAC on all API routes
- VALIDATE all file uploads (type, size, count)
- PREVENT IDOR via ownership checks in service layer
- AUDIT LOG: All state changes write to service_audit/outbox

Migration strategy:
- NO breaking schema changes needed (existing schema comprehensive)
- ADD missing indexes if performance requires
- CONSOLIDATE /api/service-* and /api/services/* routes (dual routes exist)

API impact:
- EXISTING: /api/service-requests, /api/service-offers, /api/service-providers, /api/service-categories, /api/service-notifications, /api/service-messages, /api/service-jobs, /api/service-reports, /api/service-admin, /api/service-providers/me/matched-requests
- DUPLICATE: /api/services/* routes exist (legacy) - mark for deprecation
- NEW: /api/service-dashboard/counts (badge aggregation), /api/service-disputes (if missing)

Role/permission impact:
- EXISTING: service_provider, service_supervisor roles with comprehensive permissions
- NO new roles needed
- VERIFY all API routes check correct permissions

Test plan:
- RUN existing 118 tests (all passing)
- ADD tests for: new wizard steps, supervisor dashboard, dispute pages, geographic matching edge cases
- VERIFY: RBAC tests cover service_supervisor vs admin separation
- VERIFY: State machine transition tests
- VERIFY: Seed idempotency and production protection

Rollback plan:
- Git revert to baseline commit 5064183
- NO database migrations to rollback (schema additive only)
- Seed data cleanup: DELETE FROM service_* WHERE email LIKE '%@localhost.akarpromax'

Out-of-scope:
- Social login integration
- Phase 5 features
- Real-time push notifications (WebSocket/Server-Sent Events)
- Mobile app API
- Advanced analytics/ML matching
- Multi-country deployment automation
- Copying reference project code (PHP/Laravel backend)
================================================================================