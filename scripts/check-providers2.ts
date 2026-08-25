import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  const { db, end } = getDb();
  try {
    const r1 = await db.execute(sql`SELECT COUNT(*) as total FROM service_providers`);
    console.log('Total providers:', r1[0]?.total);

    const r2 = await db.execute(sql`SELECT status, COUNT(*) as cnt FROM service_providers GROUP BY status`);
    console.log('Status distribution:', r2);

    const r3 = await db.execute(sql`SELECT * FROM service_providers LIMIT 3`);
    console.log('Sample rows:', r3);
  } catch (e: unknown) {
    console.error("Error:", e instanceof Error ? e.message?.substring(0, 300) : String(e));
  }
  await end();
}
check();