# Backup / Restore Runbook (Staging)

A backup without a tested restore path is not a backup. This runbook covers
backup, restore, validation, readiness verification, and rollback for the
production-like Staging environment.

## What must be backed up

| ARTIFACT | WHERE | BACKUP MECHANISM |
|---|---|---|
| PostgreSQL (content + identity) | Staging PG (Neon-class) | Provider-native backup (Neon: branches / time-travel / `pg_dump`) |
| R2 object storage (sponsor + ad creatives) | `SPONSOR_ASSETS` bucket | R2 versioning / lifecycle copy to a backup bucket, or periodic object copy |
| Configuration / secrets | Staging secret store (env) | Store names ONLY in the repo; values only in the secret store; export encrypted bundle on first provisioning |
| Code + build artifact | Git + build output | Git tags; rebuild from tag (build reproducibility — see `STAGING_BUILD_RUNBOOK.md`) |

## 1. Backup

### Database (PostgreSQL)

Recommended cadence: at minimum a daily `pg_dump` and before/after every
deployment or migration.

```bash
# Logical backup (password via environment, never CLI flag)
PGPASSWORD="$DATABASE_URL_PASSWORD" pg_dump \
  --no-owner --no-acl \
  "$STAGING_DATABASE_URL" > staging-$(date +%F-%H%M).sql
```

Retention: keep daily backups ≥ 14 days and one pre-deploy snapshot per release.
If the provider offers automated backups/branches (Neon), enable them and record
the retention policy; the `pg_dump` export is the portable off-site copy.

### Object storage (R2)

- Enable bucket versioning on `SPONSOR_ASSETS`, or
- configure a lifecycle rule copying objects to a backup bucket, or
- run a periodic `rclone`/SDK sync to a separate bucket.

### Secrets recovery

- Secrets live only in the staging secret store (never in Git).
- On provisioning, export one **encrypted** bundle (e.g. `age`/`sops`-encrypted
  file) into a secure offline location so staging can be recreated even if the
  secret store is lost.
- Rotate `SESSION_SECRET`, `AD_TRACKING_SECRET`, SMTP and DB credentials after
  any suspected leak.

## 2. Restore

### Database restore

```bash
# 1. Stop traffic to the app (or point to a maintenance flag)
# 2. Create a fresh empty database
createdb "$STAGING_DB_NAME"
# 3. Restore the dump
PGPASSWORD="$DATABASE_URL_PASSWORD" psql "$STAGING_DATABASE_URL" < staging-<timestamp>.sql
# 4. Verify schema latch + readiness (below)
```

Restore is **not** destructive to unrelated artifacts; it replaces only the DB.

### Object storage restore

- R2: revert bucket version / copy objects back from the backup bucket.
- Validate a sample of objects resolves (GET returns 200 with expected
  content-type).

## 3. Validation

After any restore:

1. `npm run db:check:pg` → exit 0 (identity schema probe)
   (`scripts/check-pg-identity-schema.ts`).
2. `GET /api/health` → `200` with `schema.mode === "postgres"`,
   `identitySchema.ready === true`, `contentSchema.ready === true`.
3. `GET /api/health/ready` → `200` (once email `productionCapable` in scope).
4. Spot-check: `GET /api/news`, `GET /api/properties` → 200 with expected rows;
   admin login works; a sponsor asset URL returns 200.
5. If restoring for a release, run the staging smoke suite
   (`tests/e2e/production-runtime.test.mjs` against staging).

## 4. Readiness verification

Same gates as deployment (`STAGING_DEPLOYMENT_RUNBOOK.md` step list):

- `/api/health/live` → `{status:"alive"}`
- `/api/health` → `200` (schema + identity ready)
- `/api/health/ready` → `200` (includes email `productionCapable` when
  `NODE_ENV=production`; otherwise 503 by design)

## 5. Rollback

Rollback = revert the application/build, NOT destructive schema rollback.

1. **Detect** a bad release: health/readiness 503, elevated error rate, or
   failed smoke.
2. **Stop/rollback traffic**: point the host/load-balancer back to the previous
   build, or re-deploy the previous release tag.
3. **Restore previous build**: `git checkout <previous-release-tag>` +
   `npm ci` + `npm run build`.
4. **DB compatibility**: migrations are additive and idempotent
   (`CREATE ... IF NOT EXISTS`, latch-gated). A previous build is compatible
   with a newer additive schema. If a release changed a column type
   incompatibly, restore the pre-deploy DB backup (see §2) **before** rolling
   back the build.
5. **Health check**: re-run readiness; only route traffic once
   `/api/health/ready` returns 200.
6. Record the rollback in the release notes/gap register.

## Rules

- Never run destructive `DROP`/`RESET` on staging except in a throwaway
  sandbox for clean-schema testing.
- Never copy sensitive production data into staging.
- Backups/restores of the staging DB are the same procedure used for
  production (staging is the dress rehearsal).
