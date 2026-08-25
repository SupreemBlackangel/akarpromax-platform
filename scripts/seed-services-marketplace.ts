/**
 * AkarProMax — MANUAL Services marketplace demo seed.
 *
 * L1C-0.5B1 SAFETY GATE. This script inserts the Services DEMO graph
 * (4 hard-coded providers, 4 hard-coded customer requests and their
 * offer/order/review/timeline children). It refuses to run unless an operator
 * explicitly opts in, and it can never run against a production runtime:
 *
 *   SEED_DEMO_DATA=true            required (exact string)
 *   NODE_ENV=production            always refused
 *
 * The gate runs BEFORE any database module is loaded, so a refusal never
 * opens a connection. `getRuntimeDb` is imported dynamically for that reason —
 * do not convert it back to a static import.
 */
import { assertServicesDemoSeedAllowed } from "@/lib/services/demo-seed-gate";

const SCRIPT = "seed-services-marketplace";

// FAIL-FAST: refuse (exit 1) before any DB connection is opened.
assertServicesDemoSeedAllowed(SCRIPT);

async function main() {
  const { getRuntimeDb } = await import("@/lib/runtime-db");
  const { seedServicesMarketplace } = await import("@/lib/services/seed-marketplace");
  const db = await getRuntimeDb();
  await seedServicesMarketplace(db);
  console.log("services marketplace seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
