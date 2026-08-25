#!/usr/bin/env node
/**
 * L1C-0.5A — migration-authoring guard.
 *
 * `npm run db:generate` used to run `drizzle-kit generate` against the default
 * `drizzle.config.ts`, whose schema list still includes the DEPRECATED parallel
 * Services model `lib/db/schemas/services-schema.ts`. That model declares tables
 * whose names collide with the canonical Services Marketplace store but whose
 * columns are incompatible, and it has no migration of its own. Generating from
 * it would author DDL that recreates the very duplicate Services truth L1C-0
 * removed.
 *
 * Automatic generation from `drizzle.forward.config.ts` is ALSO intentionally
 * disabled (see that file): `drizzle-pg-forward/meta/` deliberately holds no
 * snapshot, so drizzle-kit would diff against an empty database and emit
 * CREATE TABLE for everything in scope — silently wrong for any existing DB.
 *
 * So this command fails fast instead of generating anything.
 */
const RED = "[31m";
const YELLOW = "[33m";
const RESET = "[0m";

console.error(`${RED}db:generate is disabled in this repository.${RESET}

Automatic Drizzle migration generation is NOT the migration authority here:

  * the default drizzle.config.ts still lists the DEPRECATED Services model
    lib/db/schemas/services-schema.ts, which collides with the canonical
    service_* store and must never be re-materialised (L1C-0);
  * drizzle-pg-forward/meta/ intentionally contains no snapshot, so generating
    from drizzle.forward.config.ts would diff against an EMPTY database and
    emit CREATE TABLE for every table in scope.

${YELLOW}The supported process is hand-reviewed forward SQL:${RESET}

  1. write the forward SQL by hand under drizzle-pg-forward/
  2. add its journal entry
  3. have it reviewed by the architecture lead
  4. apply it with:  npm run db:migrate:forward
  5. verify with:    npm run db:verify:truth

Never fabricate a Drizzle snapshot to make generation "work".
`);

process.exit(1);
