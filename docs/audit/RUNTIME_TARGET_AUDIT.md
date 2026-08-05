# Runtime Target Audit

Generated: 2026-08-05

## Current Runtime Configuration

### Dev Runtime (`vinext dev`)
- **Runtime:** Cloudflare Workers (via @cloudflare/vite-plugin)
- **Database:** D1 (Cloudflare) + MySQL (local fallback)
- **Auth:** PostgreSQL via `cloudflare:sockets` (works in Workers)
- **Status:** Functional for D1-backed routes

### Start Runtime (`vinext start`)
- **Runtime:** Workers bundle loaded by Node.js
- **Problem:** Workers bundle imports `cloudflare:sockets` which Node.js cannot load
- **Database:** PostgreSQL fails → auth breaks; MySQL works for runtime data
- **Status:** Broken for PostgreSQL-backed routes

### Worker Runtime (`worker/index.ts`)
- **Runtime:** Cloudflare Workers
- **Database:** D1 via `env.DB` binding
- **Status:** Production Cloudflare deployment (not used internally)

### Node Runtime (target)
- **Runtime:** Node.js (planned)
- **Database:** PostgreSQL + PostGIS direct connection
- **Status:** Not yet implemented

## Files That Determine Runtime

| File | Line(s) | Import | Effect |
|------|---------|--------|--------|
| `vite.config.ts` | 51 | `vinext()` | Selects Workers build target |
| `worker/index.ts` | 1-3 | `vinext/server/*` | Workers entry point |
| `db/index.ts` | 1 | `cloudflare:workers` | D1 binding for content DB |
| `lib/runtime-db.ts` | 11 | `cloudflare:workers` | Runtime DB adapter |
| `lib/runtime-assets.ts` | 2 | `cloudflare:workers` | Asset URL resolver |
| `types/cloudflare-runtime.d.ts` | 50 | `cloudflare:workers` | Type declarations |

## Packages Importing `cloudflare:sockets`

- `postgres-js` (via `lib/db/index.ts` Drizzle adapter)
  - Inlined in Workers bundle as `import("cloudflare:sockets")`
  - Fails under Node.js with `ERR_UNSUPPORTED_ESM_URL_SCHEME`

## Affected Routes

### Under `vinext start` (production build):
- `/api/auth/login` → 500 (PG connection fails)
- `/api/auth/register` → 500
- `/api/auth/me` → 500
- `/api/user-context` → 500
- All routes using `getSponsorIdentity()` → 500
- All routes using `getChatGPTUser()` → degraded (localhost fallback only)

### Under `vinext dev`:
- D1-backed routes work (news, sponsors, ads)
- PG-backed routes work (auth) — per-request connection required
- MySQL-backed routes work (runtime data fallback)

## Build Strategy

```
vinext dev   → Workers runtime (Vite + @cloudflare/vite-plugin)
vinext build → Workers bundle (for Cloudflare deployment)
vinext start → Workers bundle loaded by Node.js (BROKEN for PG)
```

## Deferred Fix Plan

1. **Phase 2:** Create separate Node.js build target
2. **Phase 2:** Externalize `cloudflare:sockets` in Node build
3. **Phase 3:** Implement proper Node.js runtime for `vinext start`
4. **Phase 3:** Remove Workers dependency from production auth flows

## Rollback

If runtime changes break dev workflow:
1. Revert `vite.config.ts` to Workers-only configuration
2. Remove any Node-specific build scripts
3. Restore `worker/index.ts` as primary entry point

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PG connection fails under start | HIGH | CERTAIN | Documented; auth uses MySQL fallback |
| D1 unavailable under start | MEDIUM | EXPECTED | Routes degrade to empty results |
| Workers features unavailable in Node | MEDIUM | POSSIBLE | Use polyfills or conditional imports |
| Build complexity increases | LOW | CERTAIN | Document build targets clearly |
