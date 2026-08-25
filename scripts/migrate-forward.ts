/**
 * Canonical AkarProMax forward-migration entry point.
 *
 *   npm run db:migrate:forward
 *
 * This is the ONLY supported way to apply an AkarProMax migration from L1A on.
 * It never touches the legacy `drizzle-pg` chain or `drizzle.__drizzle_migrations`.
 *
 * Requires DATABASE_URL. Running it twice in a row is a no-op.
 */
import {
  FORWARD_MIGRATIONS_SCHEMA,
  FORWARD_MIGRATIONS_TABLE,
  openMigrationClient,
  readForwardLedger,
  runForwardMigrations,
  verifyMarketSchemaTruth,
} from "@/lib/db/forward-migrations";

const before = await (async () => {
  const client = openMigrationClient();
  try {
    return await readForwardLedger(client);
  } finally {
    await client.end();
  }
})();

console.log(
  `[forward-migrations] ledger ${FORWARD_MIGRATIONS_SCHEMA}.${FORWARD_MIGRATIONS_TABLE}: ${before.length} applied before run`,
);

await runForwardMigrations();

const client = openMigrationClient();
try {
  const after = await readForwardLedger(client);
  console.log(`[forward-migrations] ${after.length} applied after run`);
  const truth = await verifyMarketSchemaTruth(client);
  console.log(JSON.stringify(truth, null, 2));
  if (!truth.ready) {
    console.error("[forward-migrations] schema truth verification FAILED");
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
