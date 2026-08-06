# Phase 4A — Runtime Wiring Audit

**Date:** 2026-08-06
**Files:** `lib/runtime-db.ts`, `lib/mysql-runtime.ts`

## Question

What is the minimal wiring needed so the services marketplace schema and seed
are guaranteed at runtime, without dragging Phase 3 (properties, ads `domains`)
into this commit?

## Findings

### 1. Repository abstraction already exists

`lib/services/db.ts` already IS the persistence abstraction for the services
module: it exports `getServicesDb()` / `insertRow()` used by `core.ts` /
`marketplace.ts` / `matching.ts`. No new repository layer is needed — the
marketplace data functions (list/create/update across categories, providers,
requests, offers, jobs, messages, reviews, reports, notifications) are plain
D1/MySQL SQL over the runtime DB handle obtained by the route handlers.

### 2. Both bridges must call the schema ensure + seed

- `lib/runtime-db.ts` (`ensureSponsorSchema`, used by `getRuntimeDb()`) — D1
  path under `vinext dev`.
- `lib/mysql-runtime.ts` (`ensureMysqlSchema`, used by `getMysqlDb()`) — MySQL
  path under `vinext start`.

Both add exactly four lines:

```ts
import { ensureServicesMarketplaceSchema } from "@/lib/services-marketplace-schema";
import { seedServicesMarketplace } from "@services/seed-marketplace";
// inside the ensure function:
await ensureServicesMarketplaceSchema(db);
await seedServicesMarketplace(db);
```

`ensureServicesMarketplaceSchema` uses `CREATE TABLE IF NOT EXISTS` +
`ADD COLUMN` with a widened duplicate-key regex (see AGENTS.md), so it is safe
on both SQLite (D1) and MySQL. `seedServicesMarketplace` is idempotent
(count-checked `INSERT OR IGNORE`).

### 3. Excluded from this commit (verified diff)

The earlier draft also wired `ensurePropertiesSchema` (Phase 3) and added a
`domains` DDL line to the ads table (Phase 3). Both were reverted out of the
4A diff:

- `ensurePropertiesSchema` import + call — Phase 3 feature
  (`lib/properties-schema.ts` is untracked; committing the call would make the
  4A commit reference a missing module).
- `domains` `ADD COLUMN` line — the ads `domains` targeting feature is already
  handled by `lib/ad-schema.ts` (`ADD COLUMN domains`), and the Phase 3 ads
  batch owns that DDL.

Final `git diff lib/runtime-db.ts lib/mysql-runtime.ts` contains **only** the
services marketplace wiring (imports + ensure call + seed call).

## Conclusion

Commit the minimal bridge wiring now; properties/ads `domains` wiring goes in
their respective Phase 3 batches. This unblocks real services data under both
`vinext dev` (D1) and `vinext start` (MySQL) once the Phase 3 batches land,
without making this commit depend on untracked modules.
