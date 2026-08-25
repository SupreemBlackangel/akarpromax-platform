import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  const { db, end } = getDb();
  try {
    const r = await db.execute(sql`SELECT COUNT(*) as count FROM service_providers WHERE status = 'approved'`);
    console.log("Approved providers:", r[0]?.count);
  } catch (e: unknown) {
    console.error("Error:", e instanceof Error ? e.message?.substring(0, 200) : String(e));
  }
  await end();
}
check();
