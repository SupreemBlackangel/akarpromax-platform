# Staging Deployment Runbook

Exact sequence + architecture guidance for deploying the production-like
Staging environment. **STOP before actual deployment** — provisioning requires
Product Owner approval.

## 1. Supported staging deployment options (ranked by architectural fit)

The build is **Workers-targeted** (`dist/server/wrangler.json`: D1 `DB`, R2
`SPONSOR_ASSETS`, `nodejs_compat`; Postgres via `cloudflare:sockets`; uploads
via `cloudflare:workers`). Fit ranking reflects what the existing architecture
actually requires — no provider is forced.

| # | OPTION | FIT | NOTES |
|---|---|---|---|
| 1 | **Cloudflare Workers + custom domain** (recommended) | HIGH | Matches the bundle exactly: provides `cloudflare:sockets` (Postgres), `cloudflare:workers` (R2 `SPONSOR_ASSETS`), D1 dev-parity, HTTPS, edge rate-limit trust (`cf-connecting-ip`). Deploy via `vinext deploy` (CLI command exists). Requires Cloudflare account + Neon PG + R2 bucket + domain. |
| 2 | Cloudflare Workers (workers.dev subdomain only) | MEDIUM | Same runtime fit; workers.dev URL is not a branded domain — acceptable for internal UAT, not for customer-facing staging. `APP_PUBLIC_URL`/`TRUSTED_ORIGINS` would use the workers.dev origin. |
| 3 | Node server via `vinext start` (VPS/Railway/Render) | LOW today | Plain Node cannot load `cloudflare:sockets`/`cloudflare:workers` → PG queries and R2 uploads fail (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, `AGENTS.md`). Only viable if a Node-targeted build is produced — documented as a real constraint, not silently worked around. |
| 4 | MySQL-backed Node (`DB_PROVIDER=mysql`) | NOT for staging | Legacy compat only; production architecture is PG-only; auth still needs PG. Excluded by `runtime-env.ts:113-115` in production. |
| 5 | Docker/containers | NOT READY | No Dockerfile exists; a container would need the Node-targeted build from option 3 first. |

**Decision:** staging should be option 1 (Cloudflare Workers + branded staging
subdomain) to match production. Any alternative requires PO approval and an
explicit deviation record.

## 2. Staging domain plan

Recommended (clear environment separation, no production-shadowing):

```text
staging.akarpromax.com   # primary recommendation — unambiguous environment
# alternative: beta.akarpromax.com  (favors "beta program" framing)
```

- `staging.` pros: zero ambiguity vs production, standard convention, easy to
  extend (`staging2.` for a second env).
- `beta.` pros: user-friendly "early access" framing; cons: ambiguous about
  production shadowing.
- **No DNS changes now.** Record the chosen name here before provisioning.
- `APP_PUBLIC_URL=https://staging.akarpromax.com` must be the only origin used
  in email links; no `localhost`/`127.0.0.1` ever.

## 3. HTTPS (required)

- Staging must be served over HTTPS end-to-end; email links and auth cookies
  assume HTTPS.
- Session cookie: `Secure` is enabled when `NODE_ENV=production`
  (`lib/auth/session.ts:104`) — browsers drop `Secure` cookies over plain HTTP,
  so a plain-HTTP staging with `NODE_ENV=production` breaks logins. Terminate
  TLS at the edge and keep the app behind it.
- Recommended edge: Cloudflare TLS (full/ strict) with HSTS
  (`Strict-Transport-Security: max-age=63072000; includeSubDomains` is emitted
  only when `isProduction()` — `lib/security/headers.ts:36-38`).
- No production-like staging approval over plain HTTP.

## 4. Environment (see STAGING_ENVIRONMENT_MATRIX.md)

Required set:

```text
NODE_ENV=production
DB_PROVIDER=postgres
DATABASE_URL=<staging PG>
SESSION_SECRET=<strong random>
APP_PUBLIC_URL=https://staging.akarpromax.com
TRUSTED_ORIGINS=https://staging.akarpromax.com
EMAIL_TRANSPORT=smtp
SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS
MAIL_FROM_ADDRESS=no-reply@staging.akarpromax.com
MAIL_FROM_NAME=AkarProMax
MAIL_REPLY_TO=support@staging.akarpromax.com
AD_TRACKING_SECRET=<strong random>
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD   # migration-time only
```

## 5. Deployment sequence

```text
1. provision runtime        (Cloudflare Workers; name + staging subdomain + TLS)
2. configure secrets        (secret store: DB, SESSION_SECRET, SMTP, AD_TRACKING)
3. provision database       (empty staging PostgreSQL, isolated from prod)
4. configure storage        (R2 bucket, bind as SPONSOR_ASSETS)
5. run migrations           (npm run db:migrate:pg; content schema on readiness)
6. verify schema            (npm run db:check:pg; /api/health schema.ready=true)
7. build                    (npm run build)
8. start app                (vinext deploy / npm start per option 1)
9. health check             (GET /api/health/live → alive)
10. readiness check         (GET /api/health/ready → 200)
11. configure SMTP          (EMAIL_TRANSPORT=smtp + SMTP/MAIL vars)
12. email check             (npm run email:check → productionCapable=true)
13. smoke test              (tests/e2e/production-runtime.test.mjs vs staging)
14. UAT                     (docs/release/STAGING_UAT_PLAN.md)
```

## 6. Security posture on staging (audited state)

### Cookies (PASS with note)
- `akar_session`: `HttpOnly`, `SameSite=Lax`, `Path=/`, 7-day maxAge,
  host-only (no `Domain`), `Secure` iff `NODE_ENV=production`
  (`lib/auth/session.ts:101-109`). Good for staging HTTPS. Note: `Secure` is
  env-derived, not TLS-aware — keep TLS at the edge (see §3).

### Origin / CSRF (PASS for auth surface; documented scope)
- Production requires `TRUSTED_ORIGINS` (≥1) and rejects invalid entries at
  boot (`runtime-env.ts:142-148`).
- `localhost`/`127.0.0.1`/`[::1]` are trusted **only in development**
  (`lib/security/origin.ts:7,74-76`) — staging must rely on the real origin,
  local dev keeps working.
- Origin checks are enforced on the 13 `/api/auth/*` routes; other mutating
  APIs are protected by session/Bearer auth (documented limitation, no
  feature work in this task). No regression.

### Security headers (documented scope)
- Auth + health routes emit CSP-Report-Only, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`,
  `COOP: same-origin`, and HSTS (prod only) via `applySecurityHeaders`
  (`lib/security/headers.ts:26-38`). Coverage is per-route (16/142 files) — no
  global middleware exists. Staging edge should add the same headers as defense
  in depth without breaking Office/SSE/asset integrations.

### Rate limiting (PASS for single-instance staging)
- In-memory per-worker stores: auth ops (login 10/60s, register 5/60s,
  email_verification_resend 3/60s + 600s cooldown, OTP/verify limits,
  change_email 5/60s, office_pairing_complete 5/60s, office_sync_push 120/60s)
  and AMRS ops (`lib/security/rate-limit.ts:26-40`,
  `lib/amrs/security.ts:23-30`).
- Limits are production-like but UAT-friendly; single-instance staging is fine.
- `clientIp` trusts `cf-connecting-ip` first — correct behind Cloudflare.
- Multi-worker scaling requires a shared store (documented in
  `docs/runtime/MULTI_INSTANCE_READINESS.md`).

### Logging / errors (PASS with notes)
- `logSecurityEvent` redacts top-level sensitive keys
  (`lib/security/audit.ts:4-5,47-59`); no passwords/tokens/OTP reach logs
  (current call sites verified clean).
- `sanitizeSmtpError` scrubs SMTP credentials from errors/stacks.
- Clients never receive stack traces; some non-auth routes echo generic
  `error.message` (documented limitation, no feature work).
- **Set `AD_TRACKING_SECRET`** — the default `akar-ad-tracking-v1` is public
  (`lib/ads/events.ts:19`).

### Health / readiness (PASS)
- `/api/health/live` (process alive), `/api/health` + `/api/health/ready`
  (schema + identity + email capability). Production readiness returns 503
  unless schema, identity, AND email `productionCapable` are true
  (`app/api/health/route.ts:46`). No secrets exposed.

## 7. Ads / House fallback on empty staging inventory

- Staging may have zero commercial campaigns; the engine's house/fallback
  inventory fills every placement (3-commercial threshold → house fill)
  (`tests/ads-engine.test.mjs` regression). UAT pages never look empty and no
  dummy commercial data is required.
- Website and Office channels stay isolated (`channels` JSON); staging ad
  impressions/clicks land in the staging DB only — never production
  billing/reporting (analytics separation by environment).

## 8. News / external sources on staging

- RSS fetch → per-hop redirect validation → normalize → validate → dedupe
  (content hash) → all entries land as `draft` + `REVIEW_REQUIRED` — no staging
  bypass (`lib/news/ingestion.ts:67,99-101,158-166,174-189`).
- SSRF protection is enforced on every redirect hop; 512 KiB download cap.
- No localhost-only feed assumptions; feeds are configured per environment.

## 9. Dependency audit

- No major dependency changes performed in this task. `nodemailer` 9.x was
  already added for the SMTP transport in the certified baseline.
- `npm audit --audit-level=high` (run this phase): **21 findings (16 high)**,
  all concentrated in `ws@8.18.0` reachable **only** through the dev/build
  toolchain (`@cloudflare/vite-plugin@1.37.1` → `miniflare`). `ws` is not a
  runtime dependency of the server bundle; there is no runtime-path
  vulnerability. Remediation requires upgrading `@cloudflare/vite-plugin`
  **outside its stated range** (`1.51.1`), which is a breaking change —
  deferred per the no-version-churn policy unless it becomes a real blocker.
- Recommended staging-time audit: re-run `npm audit` before each release; no
  version churn unless a real security blocker requires it.

## 10. Backup / restore / rollback

See `docs/release/BACKUP_RESTORE_RUNBOOK.md` (backup, restore, validation,
readiness, rollback; additive-migration policy).
