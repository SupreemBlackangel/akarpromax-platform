# Stage B Known Limitations & Runtime Matrix — Connected Ecosystem

Status: **Implemented** · Deviations and constraints recorded

## Runtime matrix

| Runtime | Schema backend | Works |
| --- | --- | --- |
| `vinext dev` | D1 (via `cloudflare:workers` `env.DB`) | Full integration surface incl. auth E2E |
| `vinext start` | MySQL (via `translateSql`) | Data routes (news/sponsors/ads/admin) work; **auth is 500** because PG cannot load (`cloudflare:` ESM) — see AGENTS.md |

## Confirmed limitations (from AGENTS.md)

1. **Static-asset 404 on Windows** (`vinext` 0.0.50): the one-line
   `path.relative(...).split(path.sep).join("/")` patch in
   `node_modules/vinext/dist/server/static-file-cache.js` is lost on
   `npm install` — re-apply if CSS/JS 404 after reinstalling.
2. **`vinext dev` + MySQL/drizzle** → `EvalError` (codegen disallowed). MySQL-backed
   E2E must use `vinext start`.
3. **D1 routes only under `vinext dev`**; under `vinext start` the D1 binding is
   absent and data routes degrade to MySQL (news ticker falls back to static copy).
4. **Session cookie under `vinext start`** — `cookies()` doesn't read the incoming
   Cookie header over HTTP, so `GET /api/auth/me` returns `authenticated: false`;
   the account wizard builds the viewer from local state. Full-reload persistence
   blocked.
5. **PG cannot load under `vinext start`** (`ERR_UNSUPPORTED_ESM_URL_SCHEME`) —
   auth E2E stays on `vinext dev`; `vinext start` remains MySQL-backed.

## Stage B-specific caveats

- **Realtime is DB+SSE**, not WebSocket; the transport interface reserves WS but
  `UnsupportedRealtimeTransport` (501) covers runtimes that can't stream.
- **Quiet hours** evaluate in server-local time.
- **Radar** is Haversine precision (km), capped at 100 km; PostGIS reserved.
- **Property geo** relies on `INTEGRATION_ALTER_SQL` adding `latitude`/`longitude`
  to `property_listings` — idempotent, no migration tool needed.
- **`sponsorSchemaReady` module singleton** in `runtime-db.ts`: if integration
  schema init rejects again, routes fall back to MySQL until server restart.

## Out of scope (Stage B)

- Office desktop client application (server surface exists).
- WebSocket transport.
- PostGIS adapter implementation.
- Full office entity management (staff, roles) — only device lifecycle.
- Billing / subscription for connected offices.
