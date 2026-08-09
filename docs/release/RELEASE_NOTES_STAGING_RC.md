# Release Notes — Staging Release Candidate 1

High-level notes for `AkarProMax 2027 — Staging Release Candidate 1`
(tag `staging-rc1`, branch `refactor/architecture-foundation`).

No credentials, tokens, attack details, or private test-account passwords are
included in this document by design.

## Major modules in this release

- **Authentication & email verification architecture** — cookie-session auth,
  login/register/me, verify/verify-email/resend, forgot/reset password, email
  change with OTP, locale-aware email templates (ar/en/tr).
- **AMRS (Akar Market Rating System)** — provider onboarding, professional
  capability, organizations (public directory + business presence), verification
  moderation, reputation evaluation (policy-based), Rising/Gold/ProMax eligibility,
  normal-user restrictions, professional vs organization reputation separation,
  admin dashboard/retention/verification controls.
- **Professionals / Providers** — public provider directory and detail pages,
  profile management, apply/submit flow.
- **Properties** — public property detail pages with contextual advertising.
- **Services Marketplace** — listings, requests, matching (incl. geo), offers,
  accept/decline with double-accept protection, jobs, provider completion,
  customer confirmation, unconfirmed completion handling, disputes, reviews.
- **Find My Land** — deed resolution pipeline (classifier, CRS detection,
  geometry, confidence), land save/map/share/directions, surveyor discovery,
  quote requests; privacy-aware (in-memory, no OCR/PII persisted).
- **Engineering Tools** — calculators, coordinate converter, PDF/DXF helpers,
  land mapper, Find My Land (entry point `/tools`).
- **News & Ticker** — RSS/Atom ingestion (manual/scheduled/breaking), eligibility
  + page targeting, website/office delivery, placements, analytics with limits,
  SSRF/XSS protections, public `/news` page, admin workspace.
- **Legal Center** — terms, privacy, marketplace/services/provider/advertising/
  review/dispute policies, acceptable use, IP policy. Every draft retains
  `REQUIRES HUMAN LEGAL REVIEW BEFORE PRODUCTION`.
- **Advertising Network** — central match engine, placement registry, targeting,
  multi-creative campaigns, dynamic house/fallback inventory, website + office
  channels, valid-impression model, analytics, safe zones, admin multi-creative
  authoring, no fake admin controls.
- **AkarProMax Office integrations** — pairing, device auth (Bearer, scopes),
  sync, radar, news/ticker, ads, notifications, SSE realtime. No localhost-only
  assumptions embedded.
- **Admin operations** — AMRS admin, ads admin, news admin, stats, translation
  tooling, seed/apply scripts.
- **Translations** — AR (RTL) / EN / TR (LTR); critical UI and email templates.
- **Security hardening** — origin/CSRF checks, security headers, rate limits,
  audit logging with secret redaction, SSRF protections, environment-driven
  configuration with fail-fast production validation.
- **SEO-relevant metadata** — environment-aware metadata base, per-locale
  titles/descriptions, OG/Twitter tags, icons/manifest.

## Staging infrastructure preparation (docs)

Readiness, environment matrix, build/deployment runbooks, UAT plan, database
runtime matrix, storage plan, email DNS readiness, Office staging configuration,
backup/restore runbook, and the final gap register all live under
`docs/release/`.

## Known limitations (non-blocking)

- Production requires PostgreSQL (`DB_PROVIDER=postgres`); D1 is dev-only.
- Plain-Node `vinext start` cannot load `cloudflare:` imports (PG/R2), so the
  Workers runtime is the target deployment.
- `AD_TRACKING_SECRET` falls back to a public constant when unset — staging must
  set a strong value.
- Email delivery currently uses the `console` transport until a real provider is
  configured.
- Public property directory (`/properties` index) is not in this release; only
  `/properties/[id]` detail pages exist.

## External requirements before UAT

Real SMTP provider, SPF/DKIM/DMARC on the sending domain, staging hosting
(Workers + domain + TLS + Neon + R2), and a real staging deployment + smoke test.
