# LEGACY UI PARITY MATRIX

**Baseline**: `staging-rc5` (`185ca11`) · 927/927 tests
**Legacy source**: `D:\new program\akarpromax-web - Copy\akarpromax-deploy\` (React SPA, Vite, 80+ routes)
**Date**: 2026-08-09

---

## A. PUBLIC PAGES — STATUS

| # | Legacy Route | Legacy Page | Current Route | Current Page | Status | Gap |
|---|---|---|---|---|---|---|
| 1 | `/` | Home (hero, smart landing, geo ad, properties, offices, news ticker, services, stats) | `/` | Home (welcome, properties, services, office band, account band) | ⚠️ PARTIAL | Missing: hero sliders, smart landing, geo ad banner, news ticker integration on homepage, stats section, offices section. Office section exists but lacks dark navy premium design. |
| 2 | `/properties` | Property listings (sale/rent, filters) | `/properties` | Property listings (sale/rent toggle, search) | ⚠️ PARTIAL | Missing: location-first search order (country→governorate→city→village→district), property type filters, area/bedroom/price range filters, auto-location, demo seed data. |
| 3 | `/properties/:id` | Property detail (images, map, office info, 3D viewer) | `/properties/[id]` | Property detail | ⚠️ PARTIAL | Missing: 3D building visualizer, image gallery, office contact card, similar properties. |
| 4 | `/offices` | Real estate offices directory | `/offices` | Organization discovery (real_estate type) | ✅ EXISTS | Uses shared organization discovery page. |
| 5 | `/offices/:id` | Office detail (listings, contact, reviews) | `/offices/[id]` | Organization profile | ✅ EXISTS | Uses shared organization profile page. |
| 6 | `/blog` | Blog/news articles | `/news` | News page | ⚠️ PARTIAL | Old: full blog with categories, pagination, search. New: news feed from API. Missing: blog-style layout, categories, article cards. |
| 7 | `/blog/:id` | Blog post detail | `/news` (no detail route) | — | ❌ MISSING | No individual news/blog post detail page. |
| 8 | `/about` | About page | `/about` | Public destination page | ✅ EXISTS | Static destination page via `public-destinations.ts`. |
| 9 | `/contact` | Contact page | `/contact` | Public destination page | ✅ EXISTS | Static destination page. |
| 10 | `/advertise` | Advertise with us | `/advertise` | Public destination page | ✅ EXISTS | Static destination page. |
| 11 | `/pricing` | Pricing plans | — | — | ❌ MISSING | No pricing page. |
| 12 | `/tools` | Engineering tools (catalog with active tool area) | `/tools` | Engineering tools (catalog with active tool area) | ✅ EXISTS | Full catalog with 14+ tools, search, filter, sort. |
| 13 | `/service-hub` | Service Hub (Uber-like bell dispatch) | `/services` | Services market (listings, categories) | ⚠️ DIFFERENT | Old: bell dispatch system with token wallet. New: marketplace model. Different paradigms. |
| 14 | `/services` | Other services listings | `/services` | Services page | ✅ EXISTS | |
| 15 | `/services/:id` | Service detail | `/services/[code]` | Service catalog page | ✅ EXISTS | |
| 16 | `/suppliers` | Suppliers directory | — | — | ❌ MISSING | No suppliers page. |
| 17 | `/suppliers/:id` | Supplier detail | — | — | ❌ MISSING | |
| 18 | `/software` | Software products | — | — | ❌ MISSING | |
| 19 | `/free-resources` | Free books & software | `/knowledge` | Knowledge page | ⚠️ DIFFERENT | Old: downloadable resources. New: static knowledge destination. |
| 20 | `/buy-license` | License purchase | — | — | ❌ MISSING | |
| 21 | `/verify-license` | License verification | — | — | ❌ MISSING | |
| 22 | `/download` | Software downloads | — | — | ❌ MISSING | |
| 23 | `/vehicle-services` | Vehicle services | — | — | ❌ MISSING | |
| 24 | `/arch-ai` | AI architectural consultant | — | — | ❌ MISSING | |
| 25 | `/land-analysis` | Land analysis tool | — | — | ❌ MISSING (but FindMyLand exists in tools) | |
| 26 | `/privacy` | Privacy policy | `/legal/[slug]` | Legal center | ✅ EXISTS | |
| 27 | `/terms` | Terms of service | `/legal/[slug]` | Legal center | ✅ EXISTS | |
| 28 | `/for-professionals` | Landing for professionals | — | — | ❌ MISSING | |
| 29 | `/for-offices` | Landing for offices | — | — | ❌ MISSING | |
| 30 | `/for-corporates` | Landing for corporates | — | — | ❌ MISSING | |

## B. AUTH PAGES — STATUS

| # | Legacy Route | Current Route | Status |
|---|---|---|---|
| 1 | `/login` | `/login` | ✅ EXISTS |
| 2 | `/register` | `/register` | ✅ EXISTS |
| 3 | `/onboarding` | `/onboarding` | ✅ EXISTS |
| 4 | `/forgot-password` | `/forgot-password` | ✅ EXISTS |
| 5 | `/reset-password` | `/reset-password` | ✅ EXISTS |
| 6 | `/verify-email` | `/verify-email` | ✅ EXISTS |
| 7 | `/verify-otp` | `/verify-otp` | ✅ EXISTS |
| 8 | `/join` (join as founder) | — | ❌ MISSING |

## C. DASHBOARD PAGES — STATUS

| # | Legacy Route | Current Route | Status |
|---|---|---|---|
| 1 | `/dashboard` | `/dashboard` | ✅ EXISTS |
| 2 | `/dashboard/submit` (submit property) | — | ❌ MISSING |
| 3 | `/dashboard/moderator` | — | ❌ MISSING |
| 4 | `/profile/:userId` | — | ❌ MISSING |
| 5 | `/profile/settings` | `/account/security` | ⚠️ DIFFERENT |
| 6 | `/settings` | — | ❌ MISSING |
| 7 | `/notifications` | — | ❌ MISSING |
| 8 | `/my-requests` | — | ❌ MISSING |
| 9 | `/my-service` | `/dashboard/services` | ⚠️ DIFFERENT |
| 10 | `/tokens` (buy tokens) | — | ❌ MISSING |
| 11 | `/subscribe/:planId` | — | ❌ MISSING |
| 12 | `/payment/success` | — | ❌ MISSING |
| 13 | `/payment/cancel` | — | ❌ MISSING |

## D. ADMIN PAGES — STATUS

| # | Legacy Route | Current Route | Status |
|---|---|---|---|
| 1 | `/admin/users` | `/admin/users` | ✅ EXISTS |
| 2 | `/admin/ads` | `/admin/ads` | ✅ EXISTS |
| 3 | `/admin/news-ticker` | `/admin/news` | ✅ EXISTS |
| 4 | `/admin/service-hub` | `/admin/services` | ✅ EXISTS |
| 5 | `/admin/membership` | — | ❌ MISSING |
| 6 | `/admin/payments` | — | ❌ MISSING |
| 7 | `/admin/licenses` | — | ❌ MISSING |
| 8 | `/admin/license-keys` | — | ❌ MISSING |
| 9 | `/admin/plans` | — | ❌ MISSING |
| 10 | `/admin/discounts` | — | ❌ MISSING |
| 11 | `/admin/moderators` | `/admin/roles` | ⚠️ DIFFERENT |
| 12 | `/admin/analytics` | `/admin/reports` | ⚠️ DIFFERENT |
| 13 | `/admin/emperor` | `/admin/settings` | ⚠️ DIFFERENT |
| 14 | `/admin/verification` | — | ❌ MISSING |
| 15 | `/admin/matchmaking` | — | ❌ MISSING |
| 16 | `/admin/activity-log` | — | ❌ MISSING |
| 17 | `/admin/notifications` | — | ❌ MISSING |
| 18 | `/admin/elite-leads` | — | ❌ MISSING |
| 19 | `/admin/service-reviews` | — | ❌ MISSING |
| 20 | `/admin/market-rates` | — | ❌ MISSING |
| 21 | `/admin/marketers` | — | ❌ MISSING |

## E. HOMEPAGE LAYOUT COMPARISON

### Legacy Homepage (section order):
1. **Hero sliders** — rotating hero images with CTAs
2. **Smart Landing** — adaptive content based on user type
3. **Geo Ad Banner** — location-based advertising
4. **Properties section** — featured listings grid
5. **Offices section** — verified offices
6. **News ticker** — scrolling announcements bar
7. **Services section** — service categories
8. **Stats section** — total properties, offices, users counts
9. **Footer** — full footer with contact, links, social

### Current Homepage (section order):
1. **Sponsor ribbon** — country sponsor banner
2. **Welcome band** — hero text with CTA
3. **Properties section** — featured listings
4. **Services section** — engineering tools cards
5. **Office band** — AkarProMax Office promotion (basic)
6. **Account band** — join CTA
7. **Footer** — basic footer

### Gaps:
- ❌ No hero sliders / rotating hero
- ❌ No smart landing (adaptive by user type)
- ❌ No geo ad banner
- ❌ No news ticker on homepage (exists as component, not integrated)
- ❌ No stats section
- ❌ No offices directory section
- ⚠️ Office section exists but lacks dark navy premium design with technical grid feel

## F. NAVIGATION COMPARISON

### Legacy Sidebar (12 items):
1. Home → `/`
2. Properties → `/properties`
3. Service Hub → `/service-hub`
4. Offices → `/offices`
5. Other Services → `/services`
6. Blog/Forum → `/blog`
7. Free Resources (Books) → `/free-resources`
8. Tools → `/tools`
9. Buy Tokens → `/tokens`
10. Notifications → `/notifications`
11. About → `/about`
12. Contact → `/contact`

### Current Sidebar (11 items — constitution):
1. Home → `/`
2. Properties → `/properties`
3. Engineering Tools → `/tools`
4. Services Market → `/services`
5. Real Estate Companies → `/offices`
6. Other Companies → `/companies`
7. Community → `/community`
8. Knowledge → `/knowledge`
9. Advertise → `/advertise`
10. About → `/about`
11. Contact → `/contact`

### Missing from current:
- Service Hub (bell dispatch) → partially covered by Services Market
- Blog/Forum → partially covered by Community
- Free Resources → partially covered by Knowledge
- Buy Tokens → N/A (no token system in new architecture)
- Notifications → exists in dashboard only

## G. DESIGN ELEMENTS COMPARISON

| Element | Legacy | Current | Gap |
|---|---|---|---|
| Office promotion | Dark navy background, grid/technical feel, yellow CTA, feature checklist, download CTAs, Windows/HWID/offline messaging | Basic blue band with orbit animation | ❌ Full redesign needed — restore dark navy premium design |
| Property cards | Image, tag (sale/rent), area, title, price, bedrooms/bathrooms | Image, tag, area, title, price, bedrooms/bathrooms | ✅ Parity |
| Service cards | Numbered list with title, description, arrow | Tool cards with icon, title, description, arrow | ⚠️ Different style but functional |
| Footer | Full: brand, quick links, useful links, contact info, social, payments, legal entity | Basic: brand, quick links, useful links, contact | ⚠️ Missing: payments, legal entity, more contact detail |
| Ad placements | `PageWithAds` wrapper, `GeoAdBanner`, position-based | `StandardPublicAdLayout` (8 slots, 9 families) | ✅ New system is more structured |
| Header | Logo, nav links, user actions | Logo, country/city/language/theme switchers, login/register | ✅ Different but functional |

## H. PRIORITY RESTORATION LIST

### P0 — Must Restore (core identity):
1. **Office promotion section** — dark navy premium design with config-driven data
2. **Homepage hero** — restore hero section with sliders or featured content
3. **Properties location-first search** — country→governorate→city order with real filters
4. **Footer enhancement** — restore full footer with contact details, legal entity, payments
5. **News ticker on homepage** — integrate existing component

### P1 — Should Restore (feature parity):
6. **House ad campaigns** — first-party campaigns via central ad engine
7. **Demo property seed** — realistic demo properties for visual review
8. **Tools page flagship** — ensure all legacy core tools present
9. **Blog/news detail page** — individual article view
10. **Stats section** — property/office/user counts on homepage

### P2 — Nice to Have (future):
11. Suppliers directory
12. Software/license pages
13. Vehicle services
14. AI architectural consultant
15. Pricing page
16. Landing pages (for-professionals, for-offices, for-corporates)

---

## IMPLEMENTATION NOTES

- All new pages/sections must use `PublicPageShell` or `StandardPublicAdLayout` for consistency
- Ad placements must go through the central engine (`lib/ads/engine.ts`), not hardcoded
- Property taxonomy: one canonical source managed by Admin, not duplicated
- Service taxonomy: single source shared by hub, registration, matching, requests
- Company taxonomy: entity type separate from specialty, one organizations backend
- Demo data must be clearly marked synthetic and removable
- No fake filters, forms, or ad inventory — everything must be functional or clearly marked as coming soon
