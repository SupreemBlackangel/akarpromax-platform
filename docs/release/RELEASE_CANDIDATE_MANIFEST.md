# AkarProMax 2027 — Staging Release Candidate 1 — Manifest

## Release identity

```text
Name:            AkarProMax 2027 — Staging Release Candidate 1
Short tag:       staging-rc1
Date:            2026-08-09
Branch:          refactor/architecture-foundation
Git HEAD before freeze:  a757e20 (feat(news): news & ticker engine …)
Git HEAD after freeze:   staging-rc1 (annotated local tag; see git log)
Local release commit:    created locally, NOT pushed
```

Versioning note: the repository does not yet define a project semantic-version
convention (package.json `0.1.0` is the vinext starter template identity). No
incompatible semver was invented; the release is identified by the release
candidate name + tag above.

## Feature freeze declaration

No new product features are permitted into this Release Candidate. The RC scope
is locked to the already-certified surface: authentication, email verification
architecture, AMRS, professionals, organizations, verification, reputation,
Gold/ProMax, directory, properties, services marketplace, service matching,
offers, jobs, completion, customer confirmation, reviews, disputes, Find My
Land, engineering tools, news, ticker, legal center, marketplace governance,
advertising network (multi-creative, dynamic house/fallback), AkarProMax Office
integrations, admin operations, translations, SEO-relevant metadata, security
hardening. No Product Marketplace, no RFQ, no pricing/subscriptions/payments.

## Certification summary (run at freeze)

| Gate | Result | Evidence |
|---|---|---|
| Full test suite | 912 / 912 PASS | 114 suites (tsx, `--test-concurrency=2`) |
| Email transport | 16 / 16 PASS | `tests/email-transport.test.mjs` |
| Ads / Office regression | 21 / 21 PASS | `tests/ads-engine.test.mjs` + `tests/ads-schema-contract.test.mjs` + `tests/integrations-news-ads.test.mjs` |
| Production-runtime smoke | 14 / 14 PASS | `tests/e2e/production-runtime.test.mjs` (live :3010) |
| `npm test` (build + subset) | 192 / 192 PASS | — |
| TypeScript | PASS | `npx tsc --noEmit` EXIT=0 |
| ESLint | PASS (0 errors) | `npm run lint` — 63 pre-existing warnings |
| Build | PASS | `npm run build` (vinext build) — `dist/server/wrangler.json` (Workers) |
| Architecture | PASS | `scripts/check-architecture.mjs` (warnings only) |
| Module boundaries | PASS | `scripts/check-module-boundaries.mjs` — 0 violations |
| git diff --check | PASS | — |

Toolchain: Node v24.14.0, npm 11.9.0 (package-lock v3).

## Schema status

| Schema | Status | Evidence |
|---|---|---|
| Clean identity migration | PASS | `tests/amrs/pg-identity-schema.test.ts` (2/2, temp schema + drop) |
| Upgrade migration | PASS | same test — additive onto pre-AMRS auth schema |
| Content schema | READY | `ensureContentSchema` idempotent (latch `ak_content_schema_meta`) |
| Identity schema | READY | `ensurePgIdentitySchema` v1 (latch `ak_identity_schema_meta`) |
| Advertising schema | READY | `tests/ads-schema-contract.test.mjs` (4/4 DDL+migration column contract) |

No destructive resets. All migrations additive and latch-gated.

## Known accepted technical debt

Full register: `KNOWN_DEBT_REGISTER.md`. Headline items: legacy Services
email-key identity (non-transactional rekey), dev-tool `ws` vulnerability chain,
SMTP external configuration, legal documents awaiting human legal review, stale
`SERVICE_PROVIDERS_APPLY` documentation, 63 pre-existing lint warnings,
duplicate `/providers` vs `/directory` Providers surface.

## Known external deployment blockers (non-code)

```text
Real SMTP provider:  NOT CONFIGURED
SPF / DKIM / DMARC:  NOT CONFIGURED
Actual inbox:        NOT YET CERTIFIED
Staging hosting:     NOT PROVISIONED (Workers + domain + TLS + Neon + R2)
Staging deploy+UAT:  NOT PERFORMED
```

These are deployment requirements, not reasons to modify application code.
`EMAIL READY = NO` stays in force until a real provider + DNS + inbox journey
are certified. Staging `noindex` is an infrastructure concern (deployment
config), not a source change.

## Freeze statement

```text
RELEASE CANDIDATE SOURCE: FROZEN — no feature work before Staging without
explicitly reopening this Release Candidate.
```
