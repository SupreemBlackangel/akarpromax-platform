# Database Target Decision — Connected Ecosystem (Stage B)

Status: **Accepted** · Date: 2026-08-07 · Owner: Platform Engineering

## Context

The Connected Ecosystem (office devices, pairing, sync, geo radar, notifications,
realtime) must persist data across the same runtime matrix as the rest of the platform.
The content backend is now selected **deterministically** via `DB_PROVIDER`
(`lib/config/runtime-env.ts` → `lib/runtime-db.ts`), so the matrix is:

| Runtime | Available schema backend |
| --- | --- |
| `vinext dev` (Vite/Workers) | D1 (SQLite via `cloudflare:workers` `env.DB`) when `DB_PROVIDER` unset or `d1`; Postgres when `DB_PROVIDER=postgres`; MySQL when `DB_PROVIDER=mysql` |
| `vinext start` (production build) | MySQL via `lib/mysql-runtime.ts` `translateSql` shim (`DB_PROVIDER=mysql`); Postgres cannot load under `vinext start` (see AGENTS.md) |
| Postgres (`lib/db` / `lib/pg-runtime.ts`) | Auth + content runtime primary; `lib/pg-runtime.ts` implements the `D1Database` interface over the `postgres` driver with `translateSql`/placeholder expansion |

`d1` without the binding fails fast (`SchemaModeError`) — there is no silent
fallback to MySQL. PostGIS is **not available** in any of these runtimes today.

## Options considered

### Option A — Postgres (Neon) for integrations
- Pros: rich geo (PostGIS possible later), single store with auth.
- Cons: PG cannot load under `vinext start` (`ERR_UNSUPPORTED_ESM_URL_SCHEME` on
  `cloudflare:`); would force a new Node-targeted build. Contradicts the verified
  runtime matrix (see AGENTS.md). Rejected.

### Option B — MySQL-only for integrations
- Pros: works under `vinext start`.
- Cons: no D1 path under `vinext dev` where E2E testing lives; would make dev/test
  diverge from production. Rejected.

### Option C — Provider-neutral repositories over D1/PG/MySQL (ACCEPTED)
- Integrations use the **existing** runtime DB seam (`lib/runtime-db.ts` →
  `getRuntimeDb()`), which resolves to the `DB_PROVIDER`-selected backend
  (`postgres` | `mysql` | `d1`) — see `lib/pg-runtime.ts` and `lib/mysql-runtime.ts`.
- Data access goes through **repositories** (`lib/integration/db.ts`) that never
  depend on SQLite- or MySQL-specific SQL.
- Geo is behind a `GeoDistanceProvider` interface with a
  `HaversineGeoDistanceProvider` implementation now, and a reserved
  `PostGISGeoDistanceProvider` contract for the future.
- DDL stays dual-compatible: `TEXT` primary keys, `IF NOT EXISTS`, tolerant index
  creation (same pattern as `lib/services-schema.ts`).

## Consequences

- Integration tables are additive `CREATE TABLE IF NOT EXISTS` — no migration risk.
- Radar precision is Haversine (km) — sufficient for office radius matching; a
  PostGIS adapter can swap in later without changing `GeoRadarService`.
- Auth identity for office stays **device credentials** (scoped tokens), never
  Postgres sessions.

## Reserved follow-ups

- PostGIS adapter contract (see `docs/integrations/GEO_RADAR.md`).
- Node-targeted build for PG under `vinext start` (would unlock Option A later).
