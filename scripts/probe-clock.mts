import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const localNow = new Date();
  console.log("LOCAL new Date().toISOString() =", localNow.toISOString());
  console.log("LOCAL Date.now()              =", Date.now());
  const { db: client, end } = getDb();
  try {
    const [row] = await client.execute(sql`select now() as db_now, extract(epoch from now()) as db_epoch`);
    console.log("PG now() raw =", JSON.stringify(row));
  } finally {
    await end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
