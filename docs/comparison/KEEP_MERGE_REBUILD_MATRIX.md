# KEEP / MERGE / REBUILD Matrix

**Mode:** PLAN (read-only). Consolidated decision ledger for the migration. Every item carries an implementation choice: REUSE_AS_IS | ADAPT | REBUILD_FROM_BEHAVIOR | DO_NOT_MIGRATE.

---

## 1. Target architecture — KEEP (REUSE_AS_IS)

| Area | Rationale |
|---|---|
| Framework (Next 16 + Vinext + RSC) | Directive; already implemented |
| Route groups `(public)/(account)/(workspace)/(admin)` | Layering non-negotiable |
| `app/api` route-handler model (94 handlers) | Server-first |
| Shared admin layout + sidebar (`admin/layout.tsx`, `admin-sidebar.tsx`) | Committed `ce74fb2` |
| Session-cookie auth (`lib/auth/session.ts`, jose) | Security posture (AUTH_SECURITY_FINDINGS) |
| RBAC (role + permissions, `lib/rbac`, `PermissionGuard`, `ROLE_CATALOG`) | Directive roles; audit-logged promotions |
| Identity source = cookie only (`lib/sponsor-auth.ts`) | Removes header/localStorage/fallback identities |
| Drizzle ORM + PG primary; D1 runtime (dev); MySQL fallback (start) | Single-ORM rule; AGENTS.md |
| `getDb()` per-request pattern | Required for dev runtime |
| Ads engine (`lib/ads/*`, `AdSlot`, `api/ads/*`) | D1-backed, scoped, event-tracked |
| News ticker (`api/news`, `NewsTicker`, admin) | Superior to reference (scope/priority/schedule/trilingual) |
| Services marketplace (`api/service-*`, dashboard, admin) | Superset vs reference service hub |
| Tools framework (lazy `ToolsPageClient`, `ToolsGate`, 15+5 components) | Gated, code-split, locale-aware |
| i18n home-grown (`lib/i18n/*`, `api/i18n`, admin panel) | RTL + ar/en/tr; no new dep needed |
| Module-boundary + architecture checks (`scripts/check-*.mjs`) | Enforcement gates |
| Tools libs (proj4, leaflet, tesseract.js, pdfjs-dist, mammoth, docx) | Already at parity or newer |

## 2. MERGE — ADAPT (port reference implementation, adjusted to target)

| Feature | Reference artifact | Port as |
|---|---|---|
| Home landing sections | `HeroSection`, `HeroSlideshow`, `HeroAdsBanner`, `PageHero*`, `SmartLandingBanner`, `WelcomeBanner` | `(public)` home rebuild on `PublicPageShell` |
| Property listing index + submit | `Properties`, `SubmitProperty`, `PropertyListingForm` | Public + account flows |
| Office/supplier directories | `Offices`, `OfficeCard`, `Suppliers` | Public + admin |
| Account/profile | `DashboardProfile`, `ProfilePage` (canonical), `LoginForm`, `Register`, `ResetPassword`, `VerifyEmail`, `ForgotPasswordModal` | `(account)` group |
| Admin screens (~23 missing) | e.g. `AdminBlog`, `AdminTickets`, `AdminSEO`, `AdminAnalytics`, `AdminNotifications`, `AdminVerification`, `AdminLookups`, `AdminMarketRates`, `AdminPlans`, `AdminPayments`, `AdminLicenses`, `AdminDiscounts`, `AdminMembership`, `AdminContent`, `AdminProperties`, `AdminArtisans`, `AdminChat`, `AdminCategories`, `AdminReports`(exists), `AdminServiceReviews`, `AdminModerators`, `AdminMatchmaking`, `AdminRelistMonitoring`, `AdminEliteLeads` | New `/admin/*` pages under target permissions |
| UI primitives | `components/ui/*` (Radix + cva + tailwind-merge + cn) | `src/components/ui/` (approval item) |
| Mobile sticky contact | `MobileStickyContact` | `PublicPageShell` responsive layer |
| Rich text editor | `RichTextEditor` | Rebuild on approved editor or plain textarea (ADAPT/REBUILD) |
| Tools parity (6 overlap tools) | `Tools.tsx` behaviors | Port into target tool components |
| Ad banners/rotating | `RotatingAd`, `AdBanner`, `GeoAdBanner`, `PropertyAdBanner` | Wrap target `AdSlot` |
| Email verification/reset/OTP | behavior + `input-otp` | New `api/auth/forgot|reset` + verify sender (SMTP approval) |

## 3. MERGE — REBUILD_FROM_BEHAVIOR (re-implement on target stack)

| Feature | Why rebuild |
|---|---|
| Auctions (list/detail/FAQ/terms/stats/history, dashboard, admin) | socket.io realtime → REST; D1/PG models |
| Tenders (create/detail/bids + admin) | REST + D1/PG |
| Market history / investment radar | analytics dashboards on data routes |
| Vehicle services | module under services catalog |
| Architectural consultant (arch-ai) | no AI dep initially; guided module |
| Partners/Marketers/Advertisers | channel programs on RBAC |
| Licensing / software / verify | license-key tables + admin |
| Pricing / subscribe / payments | needs PayPal dep approval |
| PWA / offline / install | Wrangler static + SW (no plugin) |
| Notifications (web-push) | approval-gated |
| Auto news generation | feeds from future CMS |
| Per-page ticker targeting | optional extension of `scope` |

## 4. DO_NOT_MIGRATE

| Item | Reason |
|---|---|
| JWT Bearer client auth | XSS theft risk (R2) |
| `/dev-login` | backdoor |
| Header identity / localStorage bearer / `admin@localhost.*` fallback | removed in target by design |
| Reference `adminOnly` prop + role-string middleware | replace with permissions |
| `AdminAuctions` unguarded route bug | fix on port |
| three.js/onnxruntime-web stack | no consumer; heavy |
| socket.io realtime model | rebuild as REST |
| Page twins (`Dashboard/DashboardPage`, `Profile/ProfilePage`, `ServiceHub/ServiceHubPage`, `AdminUsers/AdminUsersPage`) | duplicates |
| `.bak.0` files, committed `.env`, `dev.db`, `chat.sqlite` | secrets/artifacts (R7) |
| Root debris: 26 scratch JS, `_edit/`, `_backup-*`, `recovery-*` | archive only |
| Reference SPA router (wouter) | replaced by filesystem routes |
| next-themes | keep class-based dark mode |
| Hardcoded secret fallback pattern | CRITICAL (R1) |

## 5. New (target-only) — KEEP
Engineering calculators, CAD preview/validation, sponsor management (profiles/plans/subscriptions/branches/documents/contracts/invoices/events/activity), i18n admin, ads match/impression/click/conversion tracking, service matching engine, role matrix with 4 supervisors.

## 6. Scoring note
Every MERGE above was assigned ADAPT or REBUILD_FROM_BEHAVIOR explicitly; nothing imported as-is from reference into target. Reference = behavior/design source; target = implementation substrate.
