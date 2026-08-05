# Routes Inventory

## Summary
- Page routes: 18
- API routes: 52
- Layout files: 1
- Dynamic page segments: `/properties/[id]`, `/admin/sponsors/[id]`, `/admin/sponsors/[id]/edit`
- Dynamic API segments: `/api/i18n/[locale]`, `/api/services/listings/[id]`, `/api/services/orders/[id]`, `/api/services/orders/[id]/review`, `/api/services/requests/[id]`, `/api/services/requests/[id]/offers`
- Route groups: none
- `loading.tsx` / `error.tsx` / `not-found.tsx`: none found

## Layout Scope
| Scope | File | Notes |
| --- | --- | --- |
| Global | `app/layout.tsx` | Single root layout for all public, workspace, and admin routes. No nested layout boundaries exist. |

## Page Routes
| Route | File | Audience | Notes |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Public | Main landing page with locale/theme/location controls, ads, sponsor ribbon, account dialog, and embedded admin navigation logic. |
| `/services` | `app/services/page.tsx` | Public | Services marketplace browse/request/create route with its own local header and no shared public shell. |
| `/tools` | `app/tools/page.tsx` | Workspace | Engineering tools module behind `tools.use` gate. Public path, workspace-like behavior. |
| `/properties/[id]` | `app/properties/[id]/page.tsx` | Public | Property detail demo page with hardcoded content and dense ad placement usage. |
| `/admin` | `app/admin/page.tsx` | Admin | Admin dashboard entry. |
| `/admin/ads` | `app/admin/ads/page.tsx` | Admin | Advertising center and campaign wizard. |
| `/admin/i18n` | `app/admin/i18n/page.tsx` | Admin | Translation management and version rollback UI. |
| `/admin/news` | `app/admin/news/page.tsx` | Admin | News ticker administration. |
| `/admin/reports` | `app/admin/reports/page.tsx` | Admin | Reporting and analytics page. |
| `/admin/roles` | `app/admin/roles/page.tsx` | Admin | RBAC matrix viewer. |
| `/admin/settings` | `app/admin/settings/page.tsx` | Admin | Subscription plans/pricing management under a generic settings route. |
| `/admin/sponsors` | `app/admin/sponsors/page.tsx` | Admin | Sponsor profile list UI. |
| `/admin/sponsors/banner` | `app/admin/sponsors/banner/page.tsx` | Admin | Legacy sponsor campaign/access/analytics control surface. |
| `/admin/sponsors/new` | `app/admin/sponsors/new/page.tsx` | Admin | New sponsor form. |
| `/admin/sponsors/requests` | `app/admin/sponsors/requests/page.tsx` | Admin | Sponsor approval requests list. |
| `/admin/sponsors/[id]` | `app/admin/sponsors/[id]/page.tsx` | Admin | Sponsor profile detail page. |
| `/admin/sponsors/[id]/edit` | `app/admin/sponsors/[id]/edit/page.tsx` | Admin | Sponsor edit form. |
| `/admin/users` | `app/admin/users/page.tsx` | Admin | Sponsor access and admin user management. |

## API Routes

### Auth and Identity
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/auth/login` | `POST, OPTIONS` | `app/api/auth/login/route.ts` | Login against PostgreSQL auth users and create cookie session. |
| `/api/auth/logout` | `POST, OPTIONS` | `app/api/auth/logout/route.ts` | Destroy cookie session. |
| `/api/auth/me` | `GET, OPTIONS` | `app/api/auth/me/route.ts` | Resolve current authenticated user from session. |
| `/api/auth/register` | `POST, OPTIONS` | `app/api/auth/register/route.ts` | Register auth user in PostgreSQL and create session. |
| `/api/auth/verify` | `POST, OPTIONS` | `app/api/auth/verify/route.ts` | Verify sign-up challenge against MySQL tables. |
| `/api/user-context` | `GET` | `app/api/user-context/route.ts` | Resolve viewer/sponsor identity for UI gating. |

### Ads and Advertising Operations
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/ad-assets` | `GET, POST, DELETE` | `app/api/ad-assets/route.ts` | Legacy/public ad asset media CRUD. |
| `/api/ad-events` | `POST` | `app/api/ad-events/route.ts` | Track hero ad event stream from home page. |
| `/api/ads` | `GET, POST, PATCH, DELETE` | `app/api/ads/route.ts` | Public ad campaign query/mutation endpoint. |
| `/api/ads/click` | `POST, GET` | `app/api/ads/click/route.ts` | Ad click tracking and redirect flow. |
| `/api/ads/conversion` | `POST` | `app/api/ads/conversion/route.ts` | Ad conversion tracking. |
| `/api/ads/impression` | `POST` | `app/api/ads/impression/route.ts` | Ad impression tracking. |
| `/api/ads/match` | `POST` | `app/api/ads/match/route.ts` | Single-slot ad matching. |
| `/api/ads/match-batch` | `POST` | `app/api/ads/match-batch/route.ts` | Batch ad matching. |
| `/api/ads/request` | `POST` | `app/api/ads/request/route.ts` | Requestable ad slot submission from public UI. |

### Admin APIs
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/admin/ads` | `GET, POST, PATCH, DELETE` | `app/api/admin/ads/route.ts` | Admin ad campaign CRUD. |
| `/api/admin/ads/approve` | `POST` | `app/api/admin/ads/approve/route.ts` | Ad approval action. |
| `/api/admin/ads/stats` | `GET` | `app/api/admin/ads/stats/route.ts` | Ad center statistics. |
| `/api/admin/analytics` | `GET` | `app/api/admin/analytics/route.ts` | Reporting analytics feed. |
| `/api/admin/stats` | `GET` | `app/api/admin/stats/route.ts` | Dashboard KPI feed. |

### Sponsors and Sponsor Platform
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/sponsors` | `GET, POST, PATCH, DELETE` | `app/api/sponsors/route.ts` | Sponsor campaign CRUD and public sponsor feed. |
| `/api/sponsor-access` | `GET, POST, DELETE` | `app/api/sponsor-access/route.ts` | Sponsor access/user-role mapping CRUD. |
| `/api/sponsor-activity` | `GET` | `app/api/sponsor-activity/route.ts` | Sponsor activity log feed. |
| `/api/sponsor-assets` | `GET, POST, DELETE` | `app/api/sponsor-assets/route.ts` | Sponsor logo/banner asset management. |
| `/api/sponsor-branches` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-branches/route.ts` | Sponsor branch CRUD. |
| `/api/sponsor-contracts` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-contracts/route.ts` | Sponsor contract CRUD. |
| `/api/sponsor-documents` | `GET, POST, DELETE` | `app/api/sponsor-documents/route.ts` | Sponsor document CRUD. |
| `/api/sponsor-events` | `POST` | `app/api/sponsor-events/route.ts` | Sponsor impression/click tracking. |
| `/api/sponsor-invoices` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-invoices/route.ts` | Sponsor invoice CRUD. |
| `/api/sponsor-payments` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-payments/route.ts` | Sponsor payment CRUD. |
| `/api/sponsor-plans` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-plans/route.ts` | Sponsor plan CRUD. |
| `/api/sponsor-profiles` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-profiles/route.ts` | Sponsor profile CRUD. |
| `/api/sponsor-subscriptions` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-subscriptions/route.ts` | Sponsor subscription CRUD. |
| `/api/sponsor-users` | `GET, POST, PATCH, DELETE` | `app/api/sponsor-users/route.ts` | Sponsor member CRUD. |

### Services Marketplace APIs
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/services/categories` | `GET, POST, OPTIONS` | `app/api/services/categories/route.ts` | Service category list/create. |
| `/api/services/disputes` | `GET, POST, PATCH, OPTIONS` | `app/api/services/disputes/route.ts` | Service dispute list/create/update. |
| `/api/services/listings` | `GET, POST, PATCH, OPTIONS` | `app/api/services/listings/route.ts` | Service listing list/create/update. |
| `/api/services/listings/[id]` | `GET, PATCH, OPTIONS` | `app/api/services/listings/[id]/route.ts` | Single service listing read/update. |
| `/api/services/messages` | `POST, GET, OPTIONS` | `app/api/services/messages/route.ts` | Service thread messages. |
| `/api/services/orders/[id]` | `PATCH, OPTIONS` | `app/api/services/orders/[id]/route.ts` | Service order status update. |
| `/api/services/orders/[id]/review` | `POST, GET, OPTIONS` | `app/api/services/orders/[id]/review/route.ts` | Review creation/list for service orders. |
| `/api/services/requests` | `GET, POST, OPTIONS` | `app/api/services/requests/route.ts` | Service request list/create. |
| `/api/services/requests/[id]` | `GET, PATCH, OPTIONS` | `app/api/services/requests/[id]/route.ts` | Single service request read/update. |
| `/api/services/requests/[id]/offers` | `GET, POST, OPTIONS` | `app/api/services/requests/[id]/offers/route.ts` | Offer list/create for a service request. |
| `/api/services/reviews` | `GET, OPTIONS` | `app/api/services/reviews/route.ts` | Service reviews feed. |

### I18n and Content Support
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/i18n/[locale]` | `GET` | `app/api/i18n/[locale]/route.ts` | Public translation bundle fetch. |
| `/api/i18n/admin/keys` | `GET, OPTIONS` | `app/api/i18n/admin/keys/route.ts` | Translation key listing/filtering. |
| `/api/i18n/admin/values` | `POST, OPTIONS` | `app/api/i18n/admin/values/route.ts` | Translation value update. |
| `/api/i18n/admin/versions` | `GET, POST, OPTIONS` | `app/api/i18n/admin/versions/route.ts` | Translation version publish and rollback. |
| `/api/news` | `GET, POST, PATCH, DELETE` | `app/api/news/route.ts` | Public ticker feed and admin news CRUD. |

### Utility and Cross-Cutting APIs
| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/api/location` | `GET` | `app/api/location/route.ts` | Reverse geocoding for location pickers/dialogs. |
| `/api/office-links` | `GET, POST, PATCH, DELETE` | `app/api/office-links/route.ts` | Office link management. |

## Observations
- There is only one global layout. Public, workspace, and admin surfaces are separated by inline page/client shells rather than route-level layouts.
- No dedicated account routes currently exist. Authentication is dialog-driven on public pages.
- The route tree is shallow, but sponsor/admin concerns are split across multiple overlapping routes.
- Public route coverage is thin: there is no `/properties` listing page, no `/offices`, no `/auctions`, no `/about`, no `/contact`, and no `/legal` route family yet.
