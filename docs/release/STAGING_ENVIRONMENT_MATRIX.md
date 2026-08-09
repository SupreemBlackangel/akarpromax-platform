# Staging Environment Matrix

Canonical environment-variable inventory for the AkarProMax **Staging** deployment.

Every variable was collected from source, scripts, and config (see `VALIDATION SOURCE`).
Values here are NAMES + safe example formats only — **no real secret values**.

Related reference: `docs/deployment/ENVIRONMENT_MATRIX.md` (deployment view),
`docs/runtime/ENVIRONMENT_MATRIX.md` (runtime view), `.env.example` (safe template).

## Classification legend

| Class | Meaning |
|---|---|
| REQUIRED | Must be set for staging to boot / readiness to pass |
| OPTIONAL | Optional; safe default exists and is acceptable for staging |
| DEVELOPMENT_ONLY | Only meaningful under `NODE_ENV=development`; never enabled in staging |
| TEST_ONLY | Used only by the test suites |
| PRODUCTION_REQUIRED | Hard-fail if missing when `NODE_ENV=production` (staging is production-like) |
| SECRET | Must never be committed, logged, or exposed to clients |
| PUBLIC | Non-secret configuration value |

## Matrix

| VARIABLE | PURPOSE | REQUIRED FOR STAGING | SECRET | EXAMPLE FORMAT | VALIDATION SOURCE |
|---|---|---|---|---|---|
| `NODE_ENV` | Runtime profile | REQUIRED (`production`) | PUBLIC | `production` | `lib/config/runtime-env.ts:120` — `vinext start` does NOT set it; must be exported. `development` would disable `Secure` cookies, permissive origins, dev session fallback |
| `DB_PROVIDER` | Database provider selection | REQUIRED (`postgres`) | PUBLIC | `postgres` | `lib/config/runtime-env.ts:102-117` — production only accepts `postgres`; unset fails fast |
| `DATABASE_URL` | PostgreSQL connection (auth + content runtime) | REQUIRED | SECRET | `postgresql://user:password@host:5432/db?sslmode=require&channel_binding=require` | `lib/config/runtime-env.ts:133,157`; `lib/db/index.ts:4`; `lib/pg-runtime.ts`; required in production |
| `MYSQL_URL` | Legacy/opt-in MySQL content (only when `DB_PROVIDER=mysql`) | OPTIONAL | SECRET | `mysql://root:root@localhost:3306/akarpromax?charset=utf8mb4` | `lib/config/runtime-env.ts:122`; `lib/mysql-runtime.ts:18`; `lib/mysql-db.ts:11` — separate from `DATABASE_URL`; unused with `DB_PROVIDER=postgres` |
| `SESSION_SECRET` | HS256 session JWT signing key (≥32 chars, non-weak, not a dev/test fallback) | REQUIRED | SECRET | `openssl rand -hex 32` output | `lib/config/runtime-env.ts:126-132,163-177` — weak/placeholder rejected at boot in production |
| `APP_PUBLIC_URL` | Canonical public origin for all absolute links (email verification/reset/change links) | REQUIRED | PUBLIC | `https://staging.akarpromax.com` | `lib/config/runtime-env.ts:134-135,179`; `lib/email.ts:270` — takes precedence over `APP_URL`; no `localhost`/`127.0.0.1` |
| `APP_URL` | Legacy app URL (fallback when `APP_PUBLIC_URL` unset) | OPTIONAL | PUBLIC | `https://staging.akarpromax.com` | `lib/config/runtime-env.ts:134,179` |
| `TRUSTED_ORIGINS` | Comma-separated allowed origins for Origin checks (CSRF) | REQUIRED (≥1 valid entry) | PUBLIC | `https://staging.akarpromax.com` | `lib/config/runtime-env.ts:142-148`; `lib/security/origin.ts:45-81` — localhost is trusted ONLY in development |
| `EMAIL_TRANSPORT` | Email transport: `console` (never production-capable) or `smtp` | REQUIRED (`smtp`) | PUBLIC | `smtp` | `lib/config/runtime-env.ts:137-140`; `lib/email.ts:247-253,264-281`; invalid value rejected at boot in production |
| `SMTP_HOST` | SMTP relay host | REQUIRED (when `EMAIL_TRANSPORT=smtp`) | PUBLIC | `smtp.example.com` | `lib/email.ts:250-251,266` |
| `SMTP_PORT` | SMTP port | OPTIONAL | PUBLIC | `587` (STARTTLS) or `465` (implicit TLS) | `lib/email.ts:235` — default `587` |
| `SMTP_SECURE` | `true` for implicit TLS on 465, `false` for STARTTLS on 587 | OPTIONAL | PUBLIC | `false` | `lib/email.ts:236` |
| `SMTP_USER` | SMTP auth username | REQUIRED (when smtp) | SECRET (credential) | `no-reply@staging.akarpromax.com` | `lib/email.ts:240,267`; `getEmailRuntimeStatus` `configured` gate |
| `SMTP_PASS` | SMTP auth password/API token | REQUIRED (when smtp) | SECRET | provider-issued credential | `lib/email.ts:241,268`; never logged (`sanitizeSmtpError`, `tests/email-transport.test.mjs`) |
| `SMTP_FROM` | Legacy sender address (fallback for `MAIL_FROM_ADDRESS`) | OPTIONAL | PUBLIC | `no-reply@staging.akarpromax.com` | `lib/email.ts:231,269` |
| `MAIL_FROM_ADDRESS` | Production sender mailbox on the configured domain | REQUIRED (when smtp) | PUBLIC | `no-reply@staging.akarpromax.com` | `lib/email.ts:231,269` — must be a mailbox on a configured domain |
| `MAIL_FROM_NAME` | Sender display name | OPTIONAL | PUBLIC | `AkarProMax` | `lib/email.ts:232` — default `AkarProMax` |
| `MAIL_REPLY_TO` | Reply-to address for outbound mail | OPTIONAL | PUBLIC | `support@staging.akarpromax.com` | `lib/email.ts:239` |
| `AD_TRACKING_SECRET` | HMAC key for ad-tracking click/impression tokens | REQUIRED (else public default) | SECRET | `openssl rand -hex 32` output | `lib/ads/events.ts:19` — when unset a **public constant** `akar-ad-tracking-v1` is used; staging must override |
| `SEED_DEMO_DATA` | Opt-in demo/seed data (news, plans, services marketplace) | OPTIONAL (`false`) | PUBLIC | `false` | `lib/content-schema.ts:570` — production ignores unless explicitly `true` |
| `ENABLE_DEV_LOGIN` | Dev-only convenience login | DEVELOPMENT_ONLY | PUBLIC | (unset / `false`) | `lib/security/dev-login.ts:12` — accepted only when `NODE_ENV=development`; force-blocked otherwise |
| `SEED_ADMIN_EMAIL` | Migration-only first super-admin email (`scripts/seed-auth-admin.ts`) | OPTIONAL | PUBLIC | `admin@staging.akarpromax.com` | `scripts/seed-auth-admin.ts:11` — migration tool only, never read by the app |
| `SEED_ADMIN_PASSWORD` | Migration-only first super-admin password | OPTIONAL | SECRET | strong throwaway bootstrap password | `scripts/seed-auth-admin.ts:12` — rotate after first login |
| `PORT` | Port for `vinext start` | OPTIONAL | PUBLIC | `3000` | `node_modules/vinext/dist/server/prod-server.js` — default 3000 |
| `E2E_BASE_URL` | Target URL for `tests/e2e/production-runtime.test.mjs` | TEST_ONLY | PUBLIC | `https://staging.akarpromax.com` | `tests/e2e/production-runtime.test.mjs:23` |
| `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` | Pre-verified account for the E2E auth happy-path | TEST_ONLY | SECRET | synthetic UAT credentials | `tests/e2e/production-runtime.test.mjs:27-28` |

## Runtime bindings (deployment config, not env vars)

Configured in `.openai/hosting.json` and wired by `vite.config.ts`:

| BINDING | PURPOSE | STAGING |
|---|---|---|
| D1 `DB` | Local content DB in `vinext dev` only (`@cloudflare/vite-plugin` shim). Production/staging content uses PostgreSQL | NOT required on staging (dev-only) |
| R2 `SPONSOR_ASSETS` | Object storage for sponsor + ad creative uploads (`lib/runtime-assets.ts:1-5`) | REQUIRED on staging (bind the R2 bucket name `SPONSOR_ASSETS`) |

## Staging required-set (the gate)

```text
NODE_ENV=production
DB_PROVIDER=postgres
DATABASE_URL=<staging Neon/Postgres URL>
SESSION_SECRET=<64-hex random, non-weak>
APP_PUBLIC_URL=https://staging.akarpromax.com
TRUSTED_ORIGINS=https://staging.akarpromax.com
EMAIL_TRANSPORT=smtp
SMTP_HOST=<provider relay>
SMTP_PORT=587          (STARTTLS) or 465 (SMTP_SECURE=true)
SMTP_SECURE=false
SMTP_USER=<provider username>
SMTP_PASS=<provider secret>
MAIL_FROM_ADDRESS=no-reply@staging.akarpromax.com
MAIL_FROM_NAME=AkarProMax
MAIL_REPLY_TO=support@staging.akarpromax.com
AD_TRACKING_SECRET=<64-hex random>
```

Optional but recommended: `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` for the first
super-admin bootstrap (migration-time only), `PORT=3000`.

## Never set on staging

```text
ENABLE_DEV_LOGIN=true            # development-only convenience login
EMAIL_TRANSPORT=console          # readiness gate: /api/health/ready stays 503
APP_PUBLIC_URL=http://localhost:* / http://127.0.0.1:*
TRUSTED_ORIGINS=http://localhost:*   # localhost is dev-only (lib/security/origin.ts:7,74-76)
```

## Secret-handling rules

- `.env` / `.env.*` are git-ignored (`.gitignore:46-50`) — never commit real values.
- No `NEXT_PUBLIC_*` variables exist in the codebase (grep-verified) — nothing
  secret ships into browser bundles via env.
- SMTP credentials are scrubbed from errors/logs by `sanitizeSmtpError`
  (`lib/email.ts`; regression `tests/email-transport.test.mjs`).
- `/api/health*` never includes secret values (only safe readiness booleans).
