# Migration & Enhancement Plan

**Mode:** PLAN (read-only). High-level roadmap; detailed task breakdown in IMPLEMENTATION_PHASES.md.

---

## 1. Principles
- **KEEP target** architecture; reference = behavior/design source only (no framework/dep import without approval).
- Every rebuilt feature follows target layering: `Page → Route/Controller → Service → Repository → Adapter (PG/D1/MySQL)`.
- Public ≠ Admin; admin pages permission-gated via `requireSessionUser` + `PermissionGuard`.
- Single provider: Drizzle (PG primary), session auth, no duplicate libs.
- No Page→DB/Repository; no Public→Admin imports.
- All new routes verified by `check-architecture.mjs`, `check-module-boundaries.mjs`, `npm run lint`, `npm test` (build + 44 tests) after each phase.

## 2. Migration waves

### Wave A — Foundation hardening (Phase 0)
- `SESSION_SECRET` boot guard; central CSRF/origin check; auth rate limits; `src/components/ui/` Radix adoption (approved subset); a11y baseline (focus traps, live regions); clean root scratch (`_e2e_*.mjs`, logs, backup) — files only.

### Wave B — Identity & account (Phase 1–2)
- Phase 1: account UI (`(account)` group), profile, session hardening, login/register UX parity.
- Phase 2: email verification + reset + OTP (`api/auth/verify|forgot|reset`), SMTP (nodemailer approval), templates (ar/en/tr).

### Wave C — Public verticals (Phase 3–5)
- Phase 3: home landing rebuild (hero/slideshows/banners/featured) on `PublicPageShell`; mobile sticky contact; dark/RTL parity.
- Phase 4: properties (listing index + detail + submit), offices, suppliers directories + location filters.
- Phase 5: blog/CMS (public + `/admin/blog` under CONTENT_SUPERVISOR), free resources, about/contact/pricing/legal pages.

### Wave D — Marketplaces & analytics (Phase 6–7)
- Phase 6: tools parity (deed→LandMapper, coord/area/dxf/pdf parity) + upload hardening + rate limits; engineering tools keep.
- Phase 7: services extensions (vehicle services, service reviews, market rates), market history + investment radar analytics, auctions + tenders (REST rebuild), matchmaking.

### Wave E — Commercial & channels (Phase 8)
- Licensing/software/download/verify; pricing/subscribe/payments (PayPal approval); partners/marketers/advertisers programs; notifications (web-push approval); ads self-service parity.

### Wave F — PWA & polish (Phase 9)
- PWA/offline via Wrangler; perf pass; full a11y audit; remaining admin screens from reference; final feature-matrix verification; update AGENTS.md + docs.

## 3. Data migration
- Reference SQLite/Prisma data is NOT migrated wholesale. D1/PG schemas are the source of truth.
- Content tables (news/sponsors/ads) already seeded in D1 (dev). MySQL seeds for `start` per AGENTS.md.
- License/payments/blog data: new tables defined at implementation; optional one-time import script (post-approval) from reference `dev.db` — with `.bak`/`.env` never touched.

## 4. Verification gates (every phase)
1. `npx tsc --noEmit`
2. `node scripts/check-architecture.mjs` + `node scripts/check-module-boundaries.mjs`
3. `npx eslint app lib src`
4. `npm test` (build + 44 tests, plus new tests per feature)
5. Manual E2E on `vinext dev` (D1 routes) and `vinext start` (MySQL fallback), auth on dev only.

## 5. Risks to flag (full: RISK_REGISTER.md)
- PG unavailable under `start` (auth E2E dev-only) — HIGH.
- Cookie session unreliable under `start` over HTTP — MEDIUM.
- Reference garbled string encoding in AR/EN tool code — MEDIUM (re-key via i18n).
- 23 admin screens = large port scope — MEDIUM (phase it).
- New deps require DEPENDENCY_APPROVAL_LIST sign-off.

## 6. Definition of done
All phases pass gates; FEATURE_MATRIX items closed (KEEP/MERGE); no reference framework code imported; security backlog (Phase 0) implemented; docs updated; all commits feature-scoped with tests.
