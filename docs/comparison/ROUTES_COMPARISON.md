# Routes Comparison

**Mode:** PLAN (read-only). Sources: reference `src/App.tsx` (wouter), target `app/` filesystem.

---

## 1. Reference routes (~120 in `App.tsx`)

Public: `/`, `/login`, `/register`, `/join`, `/for-professionals`, `/for-offices`, `/for-corporates`, `/properties`, `/properties/:id`, `/offices`, `/offices/:id`, `/blog`, `/blog/:id`, `/about`, `/contact`, `/pricing`, `/subscribe/:planId`, `/suppliers`, `/suppliers/:id`, `/software`, `/download`, `/buy-license`, `/verify-license`, `/services`, `/services/:id`, `/free-resources`, `/privacy`, `/terms`, `/payment/success|cancel`, `/advertise`, `/verify/:code`, `/partner-portal`, `/profile/:userId|:username`, `/inbox`, `/auctions(/terms|faq|stats|history|:id)`, `/tenders`, `/tenders/:id`, `/tools`, `/arch-ai`, `/consultant-dashboard`, `/market-history`, `/investment-radar`, `/vehicle-services`, `/home-vehicle-services`, `/technician/inbox|settings`, `/service-hub`, `/verify-email/:token`, `/reset-password/:token`, `/dev-login`.

Authenticated: `/dashboard`, `/dashboard/profile|submit|auctions|bids|tenders(/bids|/create)`, `/blog/write`, `/upgrade-artisan`, `/my-companies`, `/create-company`, `/my-requests`, `/office-requests`, `/my-service`, `/partner-portal/dashboard`, `/marketer/*` (register, profile, available-properties, proposals, contracts), `/advertiser/*` (proposals, contracts).

Admin (adminOnly): `/admin/*` — users, membership, ads, news-ticker, payments, licenses, license-keys, plans, discounts, moderators, analytics, emperor, verification, matchmaking, activity-log, elite-leads, service-reviews, market-rates, chat, properties, artisans, blog, tickets, notifications, reports, settings, content, seo, lookups, marketers, auctions, relist-monitoring, tenders, categories.

## 2. Target routes (37 pages + 94 API handlers)

Pages: `/` , `(account)`, `(workspace)`, `/admin`, `/admin/ads|i18n|news|reports|roles|services|settings|sponsors(+banner|new|requests|[id]|[id]/edit)|users`, `/dashboard/services(+inbox|jobs([id])|matched-requests|my-requests|offers([id])|provider-profile|reviews)`, `/properties/[id]`, `/providers/apply|[id]`, `/service-requests/new|[id]([id]/offer)`, `/services`, `/services/catalog|[code]`, `/tools`.

API: `/api/auth/*` (login, logout, me, register, verify), `/api/news`, `/api/i18n/*`, `/api/ads/*` (click, conversion, impression, match, match-batch, request), `/api/ad-assets`, `/api/ad-events`, `/api/admin/*` (ads, analytics, stats), `/api/location`, `/api/office-links`, `/api/properties/[id]`, `/api/service-*` (requests, providers, jobs, offers, messages, notifications, reviews, reports, categories), `/api/sponsor-*` (access, activity, assets, branches, contracts, documents, events, invoices, payments, plans, profiles, subscriptions, users), `/api/sponsors`, `/api/user-context`.

## 3. Feature parity map (reference → target route)

| Reference feature | Target equivalent | Gap |
|---|---|---|
| `/properties`, `/properties/:id`, `/dashboard/submit` | `/properties/[id]` + `/api/properties/[id]` | Listing index + submit NOT built (see PAGES_COMPARISON) |
| `/offices*`, `/suppliers*`, `/software`, `/download`, `/buy-license`, `/verify-license`, `/free-resources`, `/advertise`, `/pricing`, `/subscribe/:planId`, `/payment/*` | — | Missing (license/pricing/payment commercial flows) |
| `/blog*`, `/blog/write` | — | Missing (CMS) |
| `/auctions*`, `/tenders*`, `/market-history`, `/investment-radar`, `/arch-ai`, `/vehicle-services`, `/service-hub` | `/services*` (service hub analog) | Auctions/tenders/vehicle/radar missing |
| `/partner-portal*`, `/marketer/*`, `/advertiser/*` | — | Missing (channel programs) |
| `/inbox`, `/messages`, `/technician/*`, `/my-service` | `/dashboard/services/*` (inbox, jobs, offers, matched-requests) | Technician inbox analog partially covered |
| `/admin/*` (32 screens) | `/admin/*` (9 screens + sponsors subpages) | News-ticker→`/admin/news`; ads→`/admin/ads`; others missing (payments, licenses, blog, auctions, tenders, SEO, analytics, content, lookups, membership, plans, moderators, chat, properties, artisans, verification, matchmaking, activity-log, elite-leads, market-rates, discounts, emperor, marketers, categories, reports→exists, settings→exists, users→exists, roles→NEW) |
| `/dev-login` | — | NOT carried forward (security) |
| `/verify-email/:token`, `/reset-password/:token` | `/api/auth/verify` (+ register/login in target) | Email flows NOT built (see EMAIL_OTP_COMPARISON) |

## 4. Orphans/duplicates (details in DUPLICATE_AND_ORPHAN_ROUTES.md)

- Reference: `Profile.tsx` vs `ProfilePage.tsx`, `Dashboard.tsx` vs `DashboardPage.tsx`, `ServiceHub.tsx` vs `ServiceHubPage.tsx`, `AdminUsers.tsx` vs `AdminUsersPage.tsx`, `/profile/:userId` vs `/profile/:username`, `/home-vehicle-services` redirect shim, `AdminAuctions` route lacks `adminOnly`.
- Target: no route-level duplicates found; `admin/services` client mirrors `dashboard/services` business surface (intentional admin vs workspace split).

## 5. Decisions

- **KEEP** target route model (filesystem + route groups). REUSE_AS_IS.
- **REBUILD** missing reference features as target pages in the correct group (Public: properties/blog/auctions/tenders/licensing/pricing; Account/Workspace: dashboard extras; Admin: 20+ missing screens) — implementation phases in IMPLEMENTATION_PHASES.md.
- **DO_NOT_MIGRATE:** `/dev-login`; duplicate page twins; `/home-vehicle-services` shim; any route relying on client-only auth.
- **REFERENCE_ONLY:** auction socket/tenders flows need re-architecting to REST before porting.
