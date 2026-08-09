# Staging Build Runbook

Reproducible build/install/run for the production-like Staging environment.

## Runtime requirements

| ITEM | VALUE | SOURCE |
|---|---|---|
| Node.js | **>= 22.13.0** | `package.json` `engines.node` |
| Package manager | **npm** (lockfile v3) | `package-lock.json` (`lockfileVersion: 3`) — no yarn/pnpm lockfiles |
| Build command | `npm run build` → `vinext build` | `package.json:10` |
| Start command | `npm start` → `vinext start --port $PORT` | `package.json:11`; prod-server defaults to `PORT`/3000 |
| Dev command | `npm run dev` → `vinext dev` | `package.json:9` |
| Install | `npm ci` (reproducible) | `docs/deployment/PRODUCTION_DEPLOYMENT.md:6` |

## Important build/runtime facts

1. **`postinstall`** runs `scripts/patch-vinext-windows.mjs` (`package.json:12`)
   which re-applies the Windows static-assets fix on every install
   (`node_modules/vinext/dist/server/static-file-cache.js:207`). Any install
   must run the full install lifecycle — do not skip `npm ci`'s lifecycle
   scripts.
2. **`NODE_ENV` is not set by the toolchain.** `vinext dev`/`build` set it via
   the Vite plugin hook, but `vinext start` does not. Staging MUST export
   `NODE_ENV=production` itself (otherwise the app boots in development mode:
   permissive origins, non-Secure cookies, dev session fallback).
3. **`DB_PROVIDER=postgres` required** in production (`lib/config/runtime-env.ts:113-115`);
   unset → fail-fast; `d1`/`mysql` → rejected in production.
4. **Build output is Workers-targeted** (`dist/server/wrangler.json`: D1 `DB`,
   R2 `SPONSOR_ASSETS`, `nodejs_compat`). The intended runtime is the Cloudflare
   Workers runtime (`vinext deploy`), which provides `cloudflare:sockets`
   (Postgres), `cloudflare:workers` (R2). Plain-Node `vinext start` cannot load
   PG or the R2 binding today (documented in `AGENTS.md`); staging deployment
   must account for this (see `STAGING_DEPLOYMENT_RUNBOOK.md`).

## Commands

```bash
# 1. Install (reproduces node_modules exactly; reapplies the vinext patch)
npm ci

# 2. Type check
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Full test (build + unit suites)
npm test

# 5. Build the production bundle
npm run build

# 6. Architecture/boundary guards
node scripts/check-architecture.mjs
node scripts/check-module-boundaries.mjs

# 7. Run (staging) — env from the staging secret store
export NODE_ENV=production
export DB_PROVIDER=postgres
# ... all vars from STAGING_ENVIRONMENT_MATRIX.md ...
npm start            # vinext start --port 3000
```

## Migration commands (pre-boot)

```bash
# Apply PG identity/auth schema (users, audit, verification, AMRS) — idempotent
npm run db:migrate:pg            # node --import tsx scripts/apply-pg-identity-schema.ts

# Verify identity schema readiness (exit 1 if not ready)
npm run db:check:pg              # scripts/check-pg-identity-schema.ts

# Content schema (news, ads, services, i18n, properties, integration) is applied
# automatically by the runtime on first readiness probe (ensureContentSchema +
# ensureAdSchema, latch-gated) — no separate command required.
```

First super-admin (migration-time only):
```bash
SEED_ADMIN_EMAIL=admin@staging.akarpromax.com \
SEED_ADMIN_PASSWORD=<strong throwaway> \
  node --import tsx scripts/seed-auth-admin.ts
```

## Health checks

```bash
curl -s http://localhost:3000/api/health/live    # {"status":"alive"} — process up
curl -s http://localhost:3000/api/health         # 200 schema/identity ready
curl -s http://localhost:3000/api/health/ready   # 200 ready (email gate when NODE_ENV=production)
```

## Reproducibility guarantees

- Lockfile pinned (`npm ci`), fixed Node floor, engine-verified.
- Vinext Windows patch re-applied on install (documented in
  `docs/runtime/VINEXT_RUNTIME_PATCHES.md`).
- Additive/idempotent schema DDL with latch gating — the same build produces
  the same schema on a clean or upgraded DB (`DATABASE_RUNTIME_MATRIX.md`).
