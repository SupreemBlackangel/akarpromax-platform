# Testing — Connected Ecosystem (Stage B)

Status: **Implemented** · 42 integration tests added (160 total suite)

## How to run

```bash
node --import tsx --test tests/integrations-constants.test.mjs \
  tests/integrations-pairing.test.mjs \
  tests/integrations-sync.test.mjs \
  tests/integrations-radar.test.mjs \
  tests/integrations-notifications.test.mjs \
  tests/integrations-realtime.test.mjs \
  tests/integrations-news-ads.test.mjs
```

Full gate: `npm test` (build + all suites), `npm run lint`, `npx tsc --noEmit`.

## Seam

- `setIntegrationDbForTesting(db)` / `setRealtimeTransportForTesting(t)` override
  the runtime DB seam without touching the D1/MySQL resolution path.
- `tests/helpers/in-memory-db.mjs` is a deterministic D1-compatible adapter that
  implements the exact SQL shapes used by the integration modules: INSERT with
  `ON CONFLICT ... DO UPDATE SET`, UPDATE/DELETE, SELECT with `= / IN / NOT IN /
  LIKE / IS NULL / IS NOT NULL / < > <= >=`, `ORDER BY ... ASC|DESC`, `LIMIT`,
  `COUNT(*)`, plus the union sub-query guard. It **rejects** unsupported SQL so
  tests fail loudly rather than silently passing.
- `db.dump("<table>")` returns copies of rows for state assertions (e.g. proving
  pairing codes are stored only as hashes, single-use consumption, revocation).

## What the tests prove

- **constants**: protocol version gating (SUPPORTED/BLOCKED/UPDATE_REQUIRED/
  UPDATE_RECOMMENDED), scope catalog validation, sync statuses incl.
  conflict/dead-letter, notification channels, ad placements, schema source.
- **pairing**: sha256 determinism, code stored hashed, device + scoped credential
  issuance, single-use codes, token auth + heartbeat `last_seen_at`, rotation
  kills the old token, revoke kills all credentials, route-layer protocol gate.
- **sync**: idempotent dedup, server-newer conflict (no silent last-write-wins),
  attempts bound, pull, route-layer op-type rejection.
- **radar**: Haversine radius math, radius cap, in-radius target filtering with
  query recording, endpoint contracts.
- **notifications**: dedup, quiet-hours defer (not drop), midnight wrap, per-sponsor
  listing, channel catalog.
- **realtime**: publish/replay scoping, cursor replay after `Last-Event-ID`,
  office-scoped filtering, unsupported-transport fallback, SSE framing.
- **news/ads**: read-receipt dedup, impression dedup + click insert, geo-scoping
  contracts, placement catalog.

## Caveats

- SQL with `date('now')` / `CASE WHEN` ORDER BY (news list, ads list) is asserted
  at the source level rather than executed against the in-memory adapter.
- Realtime cursor tests seed rows with explicit `created_at` (second precision) to
  keep ordering deterministic.
