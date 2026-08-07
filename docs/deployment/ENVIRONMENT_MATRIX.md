# Environment Matrix

| Env | `NODE_ENV` | `DB_PROVIDER` | Database | `SESSION_COOKIE secure` | Notes |
|---|---|---|---|---|---|
| Local dev | development | (unset) | D1 local | false (dev) | `vinext dev`; D1 binding only. |
| Local dev (PG) | development | postgres | PostgreSQL | false (dev) | Optional; `DATABASE_URL` required. |
| Preview / staging | production | postgres | PostgreSQL (Neon/staging) | true | `APP_URL`/`TRUSTED_ORIGINS` set to the preview host. |
| Production | production | postgres | PostgreSQL (Neon) | true | `DB_PROVIDER=postgres` required; auth + content both PG. |
| Legacy compat | production | mysql | MySQL | true | Opt-in; content + auth still PG (hybrid only if explicitly accepted). |

### Cookie `secure` flag

`lib/auth/session.ts::buildSessionCookieOptions`: `secure = NODE_ENV === "production"`.

- In production (`NODE_ENV=production`) the session cookie is `Secure`; this requires HTTPS termination at the edge/load balancer. The raw `Cookie` header is always read first (`headers()`), so `/me` authenticates over HTTPS in production.
- Over local `vinext start` HTTP with `NODE_ENV=production`: `Secure` cookies are **not** sent back by HTTP clients, so the E2E harness reads the cookie value from the `Set-Cookie` response and re-submits it manually in the `Cookie` header (which browsers/clients do for same-origin). This is a documented local-test strategy; it does not change production security.

### Local test strategy vs HTTPS production strategy

| Concern | Local HTTP (`vinext start`, `NODE_ENV=production`) | Production HTTPS |
|---|---|---|
| Set-Cookie `Secure` | true | true |
| Client returns cookie over HTTP | No (browser). E2E harness injects `Cookie` header explicitly. | Yes (HTTPS). |
| Session validation | reads raw `Cookie` header | reads raw `Cookie` header |
| Security posture | unchanged | unchanged |

No `Secure=false` path exists in production-accessible code.
