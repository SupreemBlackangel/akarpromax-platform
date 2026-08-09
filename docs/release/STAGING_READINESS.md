# Staging Readiness

Consolidated readiness state for the AkarProMax production-like **Staging**
deployment. Companion docs:
`STAGING_ENVIRONMENT_MATRIX.md`, `STAGING_BUILD_RUNBOOK.md`,
`STAGING_DEPLOYMENT_RUNBOOK.md`, `STAGING_UAT_PLAN.md`,
`DATABASE_RUNTIME_MATRIX.md`, `STAGING_STORAGE_PLAN.md`,
`EMAIL_DNS_READINESS.md`, `OFFICE_STAGING_CONFIGURATION.md`,
`BACKUP_RESTORE_RUNBOOK.md`, `EMAIL_DELIVERY_CERTIFICATION.md`.

## Status

```text
STAGING INFRASTRUCTURE READY:   YES        (configuration contract, plans, runbooks)
READY TO DEPLOY TO STAGING:     YES        (per decision rule: code + config + DB +
                                            storage + security + runbook ready)
EMAIL READY:                    NO         (blocked only by real provider configuration)
FINAL APPLICATION CERTIFICATION (READY FOR STAGING USE / UAT): NO
                                            (granted only AFTER actual deployment +
                                            staging smoke + UAT)
DEPLOYMENT PERFORMED:           NO
```

## What is ready

| AREA | STATUS | EVIDENCE |
|---|---|---|
| Build/runtime reproducibility | READY | Node ≥22.13.0, npm ci, `vinext build`/`start`/`deploy`, postinstall patch — `STAGING_BUILD_RUNBOOK.md` |
| Hosting architecture | DOCUMENTED | Workers-runtime deployment ranked #1; Node `vinext start` documented limitation (PG/R2 cannot load) — `STAGING_DEPLOYMENT_RUNBOOK.md` |
| Environment contract | READY | Full inventory + required staging set + secrets classification — `STAGING_ENVIRONMENT_MATRIX.md` |
| Database plan | READY | PG-only architecture; module→DB matrix; clean + upgrade certification below — `DATABASE_RUNTIME_MATRIX.md` |
| Migrations | READY | Idempotent `ensurePgIdentitySchema` + `ensureContentSchema`/`ensureAdSchema`, latch-gated, additive |
| Storage | READY | R2 `SPONSOR_ASSETS` for sponsor/ad uploads; no ephemeral disk dependency; FML in-memory/ephemeral by design — `STAGING_STORAGE_PLAN.md` |
| Secrets | READY | Names-only in docs; git-ignored `.env*`; no `NEXT_PUBLIC_*`; no secrets in health output |
| Security (cookies/origin/CSRF/headers) | PASS (documented scope) | see `STAGING_DEPLOYMENT_RUNBOOK.md` §6 |
| Office staging contract | READY | full endpoint inventory + pairing/auth/realtime — `OFFICE_STAGING_CONFIGURATION.md` |
| Ads (incl. House fallback) | READY | certified engine; house fill for empty staging inventory; environment-isolated analytics |
| News/SSRF | READY | per-hop redirect validation, dedupe, draft+review on every entry |
| Rate limiting | PASS (single-instance) | in-memory per-worker stores; production-like but UAT-friendly |
| Backup/restore/rollback | READY | `BACKUP_RESTORE_RUNBOOK.md` |
| UAT plan | READY | personas 1-8 + journeys + synthetic data + first-admin bootstrap — `STAGING_UAT_PLAN.md` |
| Staging indexing/access | READY | noindex policy + invite-only/basic-auth gate documented |

## Blocker register

| LEVEL | BLOCKER | OWNER | GATE |
|---|---|---|---|
| P0 | Real SMTP provider not configured (`EMAIL_TRANSPORT` unset → console; `productionCapable=false`) | PO + infra | `EMAIL READY = NO`; `/api/health/ready` stays 503 in production until configured |
| P0 | SPF/DKIM/DMARC not configured on the sending domain | PO + DNS | inbox deliverability unverified — see `EMAIL_DNS_READINESS.md` |
| P1 | Staging hosting provisioned (Workers + domain + TLS + secrets + Neon + R2 bucket) | PO + infra | required before actual deployment (no provisioning done in this task) |
| P2 | Actual staging deployment + smoke + UAT execution | PO | `READY FOR STAGING USE / UAT` only after deployment |

Non-blocking documented limitations (no feature work this task):
Node `vinext start` cannot load PG/R2 (`cloudflare:`); security headers coverage
is per-route (no global middleware); origin checks are enforced on auth routes
(mutating APIs rely on session/Bearer auth); rate limiters are per-worker.

## Clean database certification (Part 13)

A **fresh** staging database must become schema-ready with zero destructive
steps:

```text
provision empty staging PG
→ npm run db:migrate:pg          (applyPgIdentitySchema → ak_identity_schema_meta v1)
→ npm run db:check:pg            (probePublicPgIdentitySchema → exit 0)
→ first readiness probe          (ensureContentSchema + ensureAdSchema → latch)
→ GET /api/health                (schema.mode=postgres, ready=true, identity ready)
→ seed only approved staging fixtures (SEED_DEMO_DATA=false by default; synthetic UAT data)
```

Expected critical tables present: `users`, `audit_events`,
`verification_challenges`, `organizations`, `organization_members`,
`organization_branches`, `verification_records`, `reputation_profiles`,
`reputation_evaluations`, `reputation_history` (identity) + content tables
(`news_*`, `ad_campaigns`, `ad_creatives`, `ad_impressions`, `ad_clicks`,
`sponsors`, `services_*`, `i18n_*`, `properties_*`, `integration_*`,
`office_realtime_events`, ...).

## Upgrade database certification (Part 14)

An existing DB from a previous schema baseline upgrades additively:

```text
pre-current schema
→ additive migrations (CREATE ... IF NOT EXISTS; ALTER ... ADD COLUMN via
  AD_CAMPAIGN_NEW_COLUMNS / AD_TRACKING_NEW_COLUMNS / AD_CREATIVE_NEW_COLUMNS)
→ current schema
```

No destructive reset. Latch (`ak_content_schema_meta` / `ak_identity_schema_meta`)
skips re-application once satisfied; missing columns are added idempotently
(`lib/ad-schema.ts`, `lib/content-schema.ts:536-578`).

## Certification evidence (Part 13/14 — run this phase)

- **Clean identity schema apply** (real PG, throwaway temp schema):
  `tests/amrs/pg-identity-schema.test.ts` → `PASS` — `applyPgIdentitySchema`
  creates all 10 required AMRS/auth tables, `missingTables=[]`,
  `appliedVersion=1`. Temp schema dropped after.
- **Upgrade identity schema** (pre-AMRS auth schema → `applyPgIdentitySchema`):
  same test → `PASS` — additive, no destructive reset.
- **Content/ad DDL contract (clean DDL + additive migrations)**:
  `tests/ads-schema-contract.test.mjs` → `PASS` (4/4) — every `loadActiveAds` /
  `loadCreatives` / tracking SELECT column exists in DDL or ALTER migrations
  (`tablet_media_url`, `channel`, `inventory_class`, `creative_id`, ...).
- **Live readiness** (`vinext dev` :3010): `/api/health` →
  `contentSchema.ready=true`, `identitySchema.ready=true` (10/10 tables present).
