# Implementation Phases

**Mode:** PLAN (read-only). Ordered roadmap. Each phase = one approved commit(s) with tests; every phase must pass the verification gates (see MIGRATION_AND_ENHANCEMENT_PLAN §4) before the next starts. Dependency installs only within the owning phase and only from DEPENDENCY_APPROVAL_LIST.

---

## Phase 0 — Foundation hardening (foundation)
- `SESSION_SECRET` boot guard (`lib/auth/session.ts`).
- Central CSRF/origin check for cookie sessions (state-changing routes).
- Auth rate limits (login/register/verify) + account-lockout flagging.
- Adopt approved Radix primitives → `src/components/ui/` (D-01…D-09); upgrade `Modal` focus-trap; toasts (D-05).
- A11y baseline: focus-visible, `role="status"`/`alert` regions, label wiring.
- Fix `sponsorSchemaReady` sticky-fallback (retry/latch).
- Root cleanup (files only): `_e2e_*.mjs`, logs, backup dirs.
- Gates: tsc, architecture/boundary checks, eslint, `npm test` (+ new tests for hardening).

## Phase 1 — Account & session UX
- `(account)` route group: profile, login/register UX parity (ADAPT from reference `LoginForm`/`Register`/`ForgotPasswordModal`), session refresh handling.
- Verify cookie-session behavior under `vinext start` (HTTP) with raw-`Cookie` read (AR-2); document results in AGENTS.md.
- Optional: `react-hook-form` decision (D-13) with product.
- Tests: auth flows (dev), rendered-html.

## Phase 2 — Email verification, reset & OTP
- `nodemailer` (D-10) SMTP config + templates (ar/en/tr).
- `api/auth/verify` (activate), `api/auth/forgot`, `api/auth/reset` with jose short-lived tokens (no reference fallback-secret pattern).
- OTP for sensitive account actions (D-11) — rate-limited, 5–10 min expiry, max attempts.
- Tests: email token expiry/attempt limits.

## Phase 3 — Public home & landing
- Home rebuild on `PublicPageShell`: hero + slideshows, rotating ad banners (wrap `AdSlot`), featured properties/offices/services, welcome/SmartLanding sections (ADAPT reference components).
- Mobile sticky contact; dark-mode + RTL parity; reduced-motion guard.
- Tests: rendered-html for home, a11y spot checks.

## Phase 4 — Properties, offices, suppliers
- Properties listing index + detail + submit (account flow) with location filters.
- Offices directory + detail; Suppliers directory + detail.
- Admin: `/admin/properties` (ADAPT `AdminProperties`), lookups.
- Data: D1/PG tables + seeds; map reference `dev.db` shape to new schema.
- Tests: CRUD + scoping.

## Phase 5 — Content, CMS & legal pages
- Blog/CMS: public blog + detail + write; `/admin/blog` (CONTENT_SUPERVISOR); categories; free resources.
- About/Contact/Pricing (static) + privacy/terms.
- Rich-text: `RichTextEditor` ADAPT or approved editor; store HTML safely (sanitize).
- i18n re-keying discipline (MS-1) — no raw garbled strings.
- Tests: CMS CRUD + role gates.

## Phase 6 — Tools parity, analytics dashboards
- Tools parity: deed→`LandMapper`, coord/area/dxf/pdf behaviors ADAPT into target components.
- Upload hardening (size/type/magic bytes) + rate limits (SE-5).
- Optional PDF generation (D-12) if contract/export feature approved.
- Market history + investment radar analytics (new data routes + admin).
- Tests: tool component behavior + API validation.

## Phase 7 — Marketplaces: services ext, auctions, tenders, matchmaking
- Services extensions: vehicle services, service reviews, market rates, disputes, `AdminServiceReviews`, `AdminMarketRates`, `AdminServiceMarket`.
- Auctions: REST rebuild (list/detail/FAQ/terms/stats/history, dashboard, `/admin/auctions` — permission-gated, fixing reference guard bug).
- Tenders: list/create/detail/bids + `/admin/tenders`.
- Matchmaking + relist monitoring + elite leads.
- Tests: marketplace flows, RBAC gates.

## Phase 8 — Commercial & channels
- Licensing/software/download/verify; `AdminSoftwareLicenses`, `AdminLicenseKeys`, `AdminPlans`, `AdminDiscounts`.
- Pricing/subscribe/payments (D-14 approval); `AdminPayments`.
- Partners/marketers/advertisers programs (8 routes) under RBAC; `AdminMarketers`, contracts/proposals.
- Notifications (web-push) if approved.
- Tests: payment webhook/flow, channel permission tests.

## Phase 9 — PWA, polish, full audit, docs
- PWA/offline via Wrangler static + service worker (no plugin).
- Perf pass (bundle budgets, code-split verification); full axe/screen-reader audit.
- Remaining admin screens from reference; final FEATURE_MATRIX close-out.
- Update AGENTS.md (vinext patch note, D1/dev vs MySQL/start, session limitation), README, docs.
- Final: `npm test` full suite green; architecture/boundary checks; eslint clean (except pre-existing warnings).

## Definition of done
All phases complete; every FEATURE_MATRIX item closed; security backlog (Phase 0) implemented; no reference framework/dep imported without approval; tests + docs updated; work committed feature-scoped.
