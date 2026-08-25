import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const { db: client, end } = getDb();
  try {
    const rows = await client.execute(
      sql`select column_name, data_type, udt_name from information_schema.columns where table_name='verification_challenges' order by ordinal_position`
    );
    for (const r of rows) console.log(JSON.stringify(r));
  } finally {
    await end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
