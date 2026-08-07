# Production Deployment

## Runtime

- Node ≥ 22.13.0 (see `package.json` `engines.node`).
- `npm ci` (reproducible lockfile; never `npm install` in CI).
- `npm run build` → `vinext build` produces `dist/server/`.
- `npm start` → `vinext start --port $PORT`.

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DB_PROVIDER` | yes (production) | — | `postgres` required for production auth+content. |
| `DATABASE_URL` | yes | — | PostgreSQL connection string (`postgresql://...&sslmode=require`). |
| `MYSQL_URL` | only if `DB_PROVIDER=mysql` | `mysql://root:root@localhost:3306/akarpromax` | Legacy/compat only. |
| `SESSION_SECRET` | yes | — | ≥32-byte hex. HS256 session JWT signing key. |
| `APP_URL` | yes | — | Public origin (e.g. `https://akarpromax.om`). |
| `TRUSTED_ORIGINS` | yes | — | Comma list of allowed origins for CSRF/origin checks. |
| `NODE_ENV` | yes | `production` | Must be `production` for `Secure` session cookies. |
| `SEED_DEMO_DATA` | no | false | `true` only for preview/verification against fresh PG. |

## Steps

1. `npm ci`
2. Set environment (see `docs/deployment/ENVIRONMENT_MATRIX.md`).
3. Ensure PostgreSQL target is reachable and the schema is initialized (see `MIGRATION_RUNBOOK.md`). For a fresh DB, the app applies the content schema on first readiness probe; auth tables come from the Drizzle migration (`db:generate` + `db:migrate` is NOT used for auth — auth DDL is applied by `lib/db` at query time via `ensureContentSchema`-equivalent path; see `DATABASE_DEPLOYMENT.md`).
4. `npm run build`.
5. `npm start`.
6. Wait for readiness: `GET /api/health` → `200 { schema:{mode:"postgres", ready:true} }`.
7. Smoke:
   - `GET /` → 200
   - `GET /api/news` → 200
   - `GET /assets/*.css`, `/assets/*.js` → 200
   - `POST /api/auth/register` → 201
   - `POST /api/auth/login` → 200 + `Set-Cookie: akar_session=`
   - `GET /api/auth/me` → `{authenticated:true}`
   - `POST /api/auth/logout` → 200

## Rollback

If the new build is unhealthy, deploy the previous safe commit (see `ROLLBACK_RUNBOOK.md`). The content schema latch is backward-compatible (idempotent DDL, `IF NOT EXISTS`); auth tables are additive.
