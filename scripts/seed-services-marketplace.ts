import { getRuntimeDb } from "@/lib/runtime-db";
import { seedServicesMarketplace } from "@/lib/services/seed-marketplace";

async function main() {
  const db = await getRuntimeDb();
  await seedServicesMarketplace(db);
  console.log("services marketplace seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
