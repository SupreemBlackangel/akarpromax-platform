import { applyPgIdentitySchema } from "@/lib/db/pg-identity-schema";
import {
  openMigrationClient,
  readForwardLedger,
  runForwardMigrations,
  verifyIdentitySchemaTruth,
  verifyMarketSchemaTruth,
} from "@/lib/db/forward-migrations";
import { closePgRuntimeDb, PgRuntimeDb } from "@/lib/pg-runtime";
import { ensureContentSchema } from "@/lib/content-schema";

const url = String(process.env.DATABASE_URL ?? "").trim();
async function bootstrap(): Promise<void> {
if (!url) throw new Error("DATABASE_URL is required");

const identityClient = openMigrationClient(url);
try {
  const identity = await applyPgIdentitySchema(identityClient, { schema: "public" });
  if (!identity.ready || identity.appliedVersion !== 5) {
    throw new Error(`Identity V5 bootstrap failed: ${JSON.stringify(identity)}`);
  }
} finally {
  await identityClient.end();
}

await runForwardMigrations({ url });
await ensureContentSchema(new PgRuntimeDb());

const verificationClient = openMigrationClient(url);
try {
  const requiredRuntimeTables = [
    "sponsor_access", "audit_logs", "ad_campaigns", "ad_impressions", "ad_clicks",
    "property_listings", "properties", "property_media", "property_offer_types", "property_offers",
    "auction_bids", "auction_terms", "auction_terms_acceptance", "auction_awards",
    "auction_contracts", "auction_contract_signatures", "auction_events",
    "governorates", "cities", "districts", "streets",
  ];
  const runtimeRows = await verificationClient<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${requiredRuntimeTables})
  `;
  const presentRuntimeTables = new Set(runtimeRows.map((row) => row.table_name));
  const missingRuntimeTables = requiredRuntimeTables.filter((table) => !presentRuntimeTables.has(table));
  const [market, identity, ledger] = await Promise.all([
    verifyMarketSchemaTruth(verificationClient),
    verifyIdentitySchemaTruth(verificationClient),
    readForwardLedger(verificationClient),
  ]);
  const result = {
    ready: market.ready && identity.ready && missingRuntimeTables.length === 0,
    identityVersion: 5,
    forwardMigrations: ledger.length,
    missingRuntimeTables,
    market,
    identity,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
} finally {
  await verificationClient.end();
}
}

try {
  await bootstrap();
} finally {
  await closePgRuntimeDb();
}
