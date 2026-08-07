# Deployment Environment Matrix — Phase 5

Run-profile view. Full variable reference: `docs/runtime/ENVIRONMENT_MATRIX.md`.

## Profiles

### Development
| Concern | Value |
| --- | --- |
| Runtime | `vinext dev` (Workers/Vite) |
| DB provider | `postgres` (auth) + `d1` (content) |
| Cookie mode | HttpOnly, SameSite=Lax, Secure=false |
| APP_URL | `http://localhost:3000` |
| HTTPS | off |
| Seed policy | allowed (`SEED_DEMO_DATA=true`) |
| Email | console transport |
| SSE | DB-backed, works |
| Logging | verbose |

### Test
| Concern | Value |
| --- | --- |
| Runtime | `node --import tsx --test` (no server) |
| DB provider | `postgres` (via helpers/mocks where needed) + in-memory D1 |
| Cookie mode | HttpOnly, Secure=false |
| Seed policy | test seeds only |
| Email | `ConsoleEmailTransport` captured |
| SSE | `setRealtimeTransportForTesting` |

### Staging
| Concern | Value |
| --- | --- |
| Runtime | `vinext start` (Node production bundle) |
| DB provider | `postgres` (primary); `mysql` only if explicitly chosen |
| Cookie mode | HttpOnly, SameSite=Lax, Secure=true |
| HTTPS | on (reverse proxy) |
| Seed policy | blocked (production rules apply when `NODE_ENV=production`) |
| Email | SMTP or console (reports DEGRADED if unset) |
| SSE | hardened, DB-backed |

### Production
| Concern | Value |
| --- | --- |
| Runtime | `vinext start` (Node production bundle) |
| DB provider | **`postgres`** (declared architecture, ADR-001) |
| Cookie mode | HttpOnly, SameSite=Lax, Secure=true |
| HTTPS | on (reverse proxy; X-Forwarded-Proto policy documented) |
| Seed policy | **blocked** (`assertSeedAllowed()` refuses) |
| Email | SMTP required for verification; DEGRADED if unset |
| SSE | hardened, DB-backed |
| Logging | redacted; no secrets/stack to clients |

## Required variables by profile

| Variable | Dev | Test | Staging | Prod |
| --- | --- | --- | --- | --- |
| NODE_ENV | development | test | production | production |
| APP_URL | optional | default localhost | required | required |
| TRUSTED_ORIGINS | optional | optional | required | required |
| SESSION_SECRET | fallback | test fallback | required | required |
| DATABASE_URL | optional | optional | required | required |
| DB_PROVIDER | optional | optional | required | required (postgres) |
| MYSQL_URL | optional | optional | optional | optional |
| SEED_DEMO_DATA | optional | optional | n/a | n/a (blocked) |
| SMTP_* | n/a | n/a | optional | recommended |
| AD_TRACKING_SECRET | optional | optional | recommended | recommended |

## Production boot guard summary

`NODE_ENV=production` + missing `APP_URL`/`TRUSTED_ORIGINS`/`SESSION_SECRET`/
`DB_PROVIDER`/`DATABASE_URL` → fail-fast (`RuntimeEnvError`). No insecure
defaults exist for production-required secrets.
