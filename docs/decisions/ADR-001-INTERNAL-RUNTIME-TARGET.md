# ADR-001: Internal Runtime Target

Generated: 2026-08-05

## Status

ACCEPTED (documentation only — no code changes in this phase)

## Context

The current production bundle is built for Cloudflare Workers runtime.
The `vinext` build system targets Workers by default, and `postgres-js`
internally imports `cloudflare:sockets` which works under Workers but
fails under Node.js with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.

This means `vinext start` (production build) cannot connect to PostgreSQL
directly, breaking authentication flows in production.

## Decision

The internal production runtime target is:

- **Runtime:** Node.js (not Cloudflare Workers)
- **Server:** Internal Linux VM/Docker or dedicated server
- **Database:** PostgreSQL + PostGIS
- **Cache:** Redis
- **Object Storage:** MinIO
- **Reverse Proxy:** Nginx or Caddy

The Cloudflare Workers runtime is used only for:
- Local development (`vinext dev`)
- D1-backed content routes (news, sponsors, ads)
- Static asset serving

## Rationale

1. PostgreSQL direct connection requires Node.js socket support
2. Workers runtime cannot load `cloudflare:sockets` in Node.js context
3. Internal deployment gives full control over infrastructure
4. Redis provides session caching and rate limiting
5. MinIO provides S3-compatible object storage on-premise

## Consequences

### Positive
- Direct PostgreSQL connection without Workers shim
- Full control over deployment environment
- No dependency on Cloudflare runtime limitations

### Negative
- Need to maintain separate build targets (Workers for dev, Node for prod)
- Workers-specific features (D1, KV) unavailable in Node mode
- Build complexity increases

## Files That Determine Runtime

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vinext plugin configuration |
| `worker/index.ts` | Cloudflare Worker entry point |
| `types/cloudflare-runtime.d.ts` | Workers type declarations |
| `db/index.ts` | Imports `cloudflare:workers` |
| `lib/runtime-db.ts` | Imports `cloudflare:workers` |
| `lib/runtime-assets.ts` | Imports `cloudflare:workers` |
| `package.json` | Vinext scripts (dev/build/start) |

## Packages Importing `cloudflare:sockets`

- `postgres-js` (indirect via `lib/db` Drizzle adapter)

## Affected Routes

All routes using `lib/db` (PostgreSQL) fail under `vinext start`:
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/me`
- `/api/user-context`
- All routes using `getSponsorIdentity()`
- All routes using `getChatGPTUser()`

## Deferred Actions (Phase 2+)

1. Create Node.js-specific build configuration
2. Separate Workers runtime (dev) from Node runtime (prod)
3. Remove `cloudflare:sockets` dependency from production bundle
4. Implement proper session handling for Node.js runtime

## Rollback

If runtime changes cause issues, revert to Workers-only build by
restoring `vite.config.ts` and removing any Node-specific configuration.
