import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function check() {
  const { db, end } = getDb();
  try {
    const r = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    const rows = r;
    console.log('Tables:', rows.length ? rows.map((row) => row.table_name) : 'no rows');
  } catch (e: unknown) {
    console.error("Error:", e instanceof Error ? e.message?.substring(0, 300) : String(e));
  }
  await end();
}
check();