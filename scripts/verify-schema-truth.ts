/**
 * Read-only database schema verification for release checks.
 *
 *   npm run db:verify:truth
 *
 * Exits non-zero when the live schema does not match what the application
 * requires. It never mutates anything.
 */
import {
  openMigrationClient,
  verifyIdentitySchemaTruth,
  verifyMarketSchemaTruth,
} from "@/lib/db/forward-migrations";

const client = openMigrationClient();
try {
  const market = await verifyMarketSchemaTruth(client);
  const identity = await verifyIdentitySchemaTruth(client);
  console.log(JSON.stringify({ market, identity }, null, 2));
  const problems = market.problems.length + identity.problems.length;
  if (problems > 0) {
    console.error(`[schema-truth] NOT READY — ${problems} problem(s)`);
    process.exitCode = 1;
  } else {
    console.log("[schema-truth] READY");
  }
} finally {
  await client.end();
}
