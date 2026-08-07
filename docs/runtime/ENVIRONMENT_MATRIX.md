# Environment Matrix — Phase 5

Authoritative inventory of environment variables. Each entry: purpose, environments,
secret flag, boot validation, module usage, production behavior when missing.

Classification legend:

- `REQUIRED_PRODUCTION` — boot fails in production when missing/invalid.
- `OPTIONAL_PRODUCTION` — allowed in production; behavior degrades when absent.
- `DEVELOPMENT_ONLY` — honored only in non-production; ignored in production.
- `TEST_ONLY` — used only by the test suite.
- `MIGRATION_ONLY` — consumed by scripts/CLI, never by the running app.
- `DEPRECATED` — still read for backward compatibility; slated for removal.
- `TOOL_ONLY` — tooling/wrangler/vite, not application logic.

## Core

### NODE_ENV
- Purpose: runtime profile selector.
- Environments: all.
- Secret: no.
- Values: `development` | `test` | `production` (default `development`).
- Boot validation: `lib/config/runtime-env.ts` casts to `NodeEnv`; unknown values are treated as `development` — **fail-fast in production requires explicitly `production`**.
- Module usage: runtime-env, session cookie secure flag, headers, origin, rate-limit warning.
- Missing in production: treated as development → insecure cookie flag and permissive origins. **Must be `production` in prod.**

### APP_URL
- Purpose: canonical public origin (absolute URLs, Origin validation baseline).
- Environments: production required; dev/test default `http://localhost:3000`.
- Secret: no.
- Boot validation: must be a valid http(s) URL; production rejects missing/invalid (`fail`).
- Module usage: runtime-env, `lib/security/origin.ts`.
- Missing in production: **boot failure**.

### TRUSTED_ORIGINS
- Purpose: comma-separated additional allowed origins for state-changing API requests (CSRF).
- Environments: production required; optional elsewhere.
- Secret: no.
- Boot validation: each entry must be a valid http(s) origin; production requires ≥1.
- Module usage: runtime-env, origin.ts.
- Missing in production: **boot failure** (origin validation then allows only `APP_URL`).

### SESSION_SECRET
- Purpose: HMAC key for the `akar_session` JWT cookie.
- Environments: production required; dev/test fall back to documented dev/test secrets.
- Secret: **YES**.
- Boot validation: production requires ≥32 chars, rejects known weak/placeholder values and dev/test fallbacks.
- Module usage: `lib/auth/session.ts` (sign/verify).
- Missing in production: **boot failure**.

## Database

### DB_PROVIDER (new in Phase 5)
- Purpose: **explicit, deterministic database provider selection.**
- Environments: all (production must match the declared architecture).
- Values: `postgres` | `mysql` | `d1` (d1 is development/edge only).
- Secret: no.
- Boot validation: production **only** allows `postgres` (per ADR-001) and requires the var to be set — missing, `mysql`, or `d1` fail fast. Unknown values fail in all environments. Dev/test default to `d1` when unset, and accept an explicit `postgres` or `mysql`.
- Module usage: `lib/config/runtime-env.ts` (parsing), `lib/runtime-db.ts` (schema mode selection); replaces silent auto-detection and the D1→MySQL fallback.
- Missing in production: **boot failure**; in dev/test the documented default `d1` applies.

### DATABASE_URL
- Purpose: PostgreSQL connection string (auth layer + content runtime primary).
- Environments: production required; dev/test optional.
- Secret: **YES**.
- Boot validation: production requires it; must be a valid postgres URL.
- Module usage: `lib/db/index.ts` (`postgres(url, { ssl: "require", prepare: false })`), `lib/pg-runtime.ts` (D1Database adapter over postgres), `drizzle.config.ts`, `scripts/seed-auth-admin.ts`.
- Missing in production: **boot failure**.

### MYSQL_URL
- Purpose: MySQL connection string (legacy/compatibility content backend, opt-in via `DB_PROVIDER=mysql`; drizzle MySQL config).
- Environments: optional everywhere; used only when provider is `mysql`.
- Secret: **YES**.
- Boot validation: none at boot unless provider=`mysql`; `lib/mysql-runtime.ts`/`lib/mysql-db.ts` read it.
- Module usage: `lib/mysql-runtime.ts`, `lib/mysql-db.ts`, `drizzle.mysql.config.ts`.
- Missing in production: fine when provider=`postgres` (mysql is optional). **No insecure default in production.**

### ALLOW_MYSQL_FALLBACK (REMOVED in Phase 5)
- Purpose: previously permitted silent D1→MySQL fallback on schema-init failure.
- Phase 5: **removed.** There is no implicit fallback of any kind; the active provider is always `DB_PROVIDER`-driven. A `d1` request without the binding fails fast with `SchemaModeError` rather than degrading to MySQL.

## Seeds

The content runtime bootstraps its schema and seed data idempotently on first
use (`ensureContentSchema` in `lib/content-schema.ts`); the seed inserts are
guard-checked (skip when rows already exist) and are not gated behind an env
flag in the current implementation. `scripts/seed-*.ts` are standalone
`MIGRATION_ONLY` entry points that call the same schema/seed helpers.

### SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (MIGRATION_ONLY)
- Purpose: admin bootstrap script (`scripts/seed-auth-admin.ts`).
- Secret: **YES** (password).
- Boot validation: script enforces password length ≥8.
- Module usage: script only — never read by the app.
- Defaults are placeholders (`admin@akarpromax.om` / `ChangeMe123!`) — **must be overridden in any non-local run**.

## Email

### SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
- Purpose: SMTP transport when configured; otherwise `ConsoleEmailTransport`.
- Environments: optional production; dev/test default to console.
- Secret: **YES** (SMTP_PASS, SMTP_USER).
- Boot validation: none (email is `DEGRADED_ALLOWED`); health reports degraded when configured transport is unhealthy.
- Module usage: `lib/email.ts::resolveTransport()`.
- Missing SMTP_HOST in production: email falls back to console transport — **documented DEGRADED; verification delivery must not claim success**.

## Auth/dev

### ENABLE_DEV_LOGIN (DEVELOPMENT_ONLY)
- Purpose: enables the dev-login bypass path.
- Environments: development only; force-blocked in production and tests.
- Secret: no.
- Module usage: `lib/security/dev-login.ts`.

## Ad tracking

### AD_TRACKING_SECRET (OPTIONAL_PRODUCTION)
- Purpose: HMAC secret for ad-tracking click/impression tokens.
- Secret: **YES**.
- Boot validation: none; falls back to `"akar-ad-tracking-v1"` (known, public default).
- Production behavior when missing: uses the public default — **flag for operator to set**; token forgery risk if left default.
- Module usage: `lib/ads/events.ts`.

## Tooling (TOOL_ONLY, no app impact)

- `CODEX_SANDBOX` — seatbelt polling hint for `vite.config.ts`.
- `WRANGLER_WRITE_LOGS` / `WRANGLER_LOG_PATH` / `MINIFLARE_REGISTRY_PATH` — wrangler/miniflare state paths.

## D1 bindings

- Not env vars: D1 binding (`DB`) comes from `hosting.json` → `vite.config.ts` `localBindingConfig`. Development/edge only; absent in the production Node runtime.

## Boot validation summary (production)

| Variable | Missing in production |
| --- | --- |
| NODE_ENV=production | insecure defaults |
| APP_URL | fail |
| TRUSTED_ORIGINS | fail |
| SESSION_SECRET | fail |
| DB_PROVIDER | fail (must equal declared architecture) |
| DATABASE_URL | fail |
| MYSQL_URL | OK (optional) |
| SMTP_* | OK (degraded) |
| AD_TRACKING_SECRET | OK (flag for operator) |

## `.env.example` (Phase 5)

Safe placeholders only; no real secrets; no production-required value left blank with an insecure default; MySQL shown as legacy/optional.
