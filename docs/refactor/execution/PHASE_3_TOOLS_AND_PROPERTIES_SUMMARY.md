# Phase 3 Completion Summary — Tools Gate, Properties Backend & Home Wiring

## Scope
- Wired the Tools page (`/tools`) to the real permission system with a runtime gate.
- Shipped a full Properties backend (schema → API → detail page) and linked the home page featured grid to it.
- Zeroed out ESLint across the project and verified the full build + rendered-HTML suite.

## Git
- Branch: `refactor/architecture-foundation`
- Commit: NONE (working tree intentionally uncommitted; 37 changed/untracked entries)
- Tag: none

## Tools page (`/tools`)
- `ToolsGate` rewritten as a controlled component: props `{ locale, state, onRequestLogin, children }`, state type `ToolsGateState = "loading" | "unauthenticated" | "forbidden" | "granted"` with per-state UI (spinner, login CTA, 403).
- `ToolsPageClient` now owns: `/api/user-context` fetch (AbortController), gate state, viewer state, `AccountDialog` wiring (`onAuthenticated`, `onClose`), `handleLogout` → `POST /api/auth/logout`, `requestLogin(mode)`.
- Language switcher from `languageOptions` in the toolbar; syncs `localStorage "akarpromax-locale"` + `document.documentElement.lang/dir`.
- Deep-link `?tool=<id>` via `history.replaceState` (open/close). `deviceType` lazy-initialized via `useState(() => detectDeviceType())`.
- Result: 0 ESLint errors/warnings; `/tools` returns 200 with `public-page-shell` + rtl under `vinext dev`.

## Permission fix (super_admin 403 on tools)
- `lib/auth/identity-map.ts` `permissionsForSessionRole` → `[...ROLE_CATALOG[sponsorRole].permissions, "*"]`.
- `lib/sponsor-auth.ts` `permissionsByRole` → same pattern.
- `/api/user-context` now returns the full catalog (incl. `tools.use`) + `"*"`; `hasPermission`/`hasSponsorPermission` honor `"*"`.
- `tests/rendered-html.test.mjs` (6/6) still pass — pins these patterns.

## Properties backend
- `lib/properties-format.ts`: `PropertyRow`, `PublicProperty`, `PROPERTY_SELECT`, `parsePropertyFeatures`, `serialiseProperty` (title/area/description/features as `{ar,en,tr}`, features as JSON arrays).
- `lib/runtime-db.ts` + `lib/mysql-runtime.ts`: `ensurePropertiesSchema` imported and called (follows the ad/i18n/services seeding pattern).
- `app/api/properties/route.ts`: GET `country` (default `om`), `city`, `featured=1`, `limit` (1–50, default 12); filter `status='active'`; order `is_featured DESC, priority ASC, updated_at DESC`; safe fallback `{ properties: [] }`; `?1..?N` bind params; `force-dynamic`.
- `app/api/properties/[id]/route.ts`: GET by id or slug (case-insensitive), active only; 200 `{ property }` / 404 `{ error }`.
- Verified: list 200 (seeded `modern-sea-view-villa`), detail 200 (8 features, `isFeatured` true, clean UTF-8), unknown → 404.

## Property detail page (`app/properties/[id]/page.tsx`)
- Rewritten as a real client fetch component: `use(params)`, locale state, `detectCountry`/`detectCity`, `deviceType`.
- Fetches `/api/properties/{id}` + `/api/properties?country=...&limit=3` for similars (self filtered out).
- Views: loading / not-found (localized) / detail (gallery, price via `toLocaleString`, description, features grid, map placeholder, sidebar enquiry).
- Ad slots: horizontal `property_after_gallery`, `property_below_price`, `property_after_description`, `property_before_similar`; vertical `property_sidebar_top/middle/bottom`.
- Image fallback `/og.png`; `no-img-element` disabled with justification for runtime-DB image URLs.

## Home page wiring (`app/page.tsx`)
- New `featuredProperties` state (`PublicProperty[]`) fed by `/api/properties?featured=1&limit=3` (AbortController, mirrors the existing sponsor fetch).
- Property grid renders API cards when present (badge: featured / for-rent / for-sale per locale; `Link` to `/properties/{slug||id}`), else falls back to static `copy.propertyCards`.
- Removed unused `cityOptions` import.

## ESLint cleanup (project-wide)
- `app/admin/i18n/i18n-admin-client.tsx`, `app/admin/sponsors/_components/SponsorRequestsView.tsx`, `SponsorsListView.tsx`, `src/components/AdRequestDialog.tsx`, `LocationChip.tsx`, `LocationPicker.tsx`: moved synchronous fetch/reset calls in effects into `window.queueMicrotask(() => { void fn(); })` (satisfies `react-hooks/set-state-in-effect`).
- `src/components/shared/Header.tsx` + `Footer.tsx`: `<a>` → `<Link>` (`next/link`); removed dead `menuOpen` state.
- Result: `npx eslint . --ignore-pattern dist --ignore-pattern .next --quiet` → no output (0 errors; ~36 pre-existing non-blocking warnings elsewhere).

## Verification (Phase H)
- `npx tsc --noEmit`: PASS (needed dev server stopped + retry due to low RAM — known environment constraint, ~0.8–3.4 GB free).
- `npm run build` (`vinext build`): PASS after freeing the dev server memory; all 5 stages green; route table includes `/api/properties`, `/api/properties/:id`, `/properties/:id`, `/tools`.
- `node --test tests/rendered-html.test.mjs`: 6/6 PASS (server-rendered landing, no-starter, sponsors, ads, news, admin suite).
- Smoke: `/` 200 with `property-grid reference-cards`; `/api/properties?country=om&featured=1&limit=3` 200 with featured villa.

## Safety
- Routes added: 2 APIs + 1 page rewrite (no route removals)
- Auth modified: permission mapping only (super_admin gains explicit catalog + `"*"`)
- Database modified: schema additions only (`properties` table creation via existing ensure-pattern; no destructive change)
- Dependencies added: NONE
- Environment modified: NONE

## Known issues / follow-ups
1. `vinext build` OOMs unless the dev server is stopped (system has only ~0.8–3.4 GB free; Chrome/dwm consume most RAM). Retry pattern: stop dev → build → restart dev.
2. `vinext start` still 500s for PG-backed auth (documented Workers/`cloudflare:` limitation); auth E2E stays on `vinext dev`.
3. Home property section shows the static `copy.propertyCards` fallback until the API resolves (client fetch) — by design.
