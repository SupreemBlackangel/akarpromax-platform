import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

const TABLES = [
  "users", "audit_events", "verification_challenges", "organizations",
  "organization_members", "organization_branches", "verification_records",
  "reputation_profiles", "reputation_evaluations", "reputation_history",
];

async function main() {
  const { db: client, end } = getDb();
  try {
    const rows = await client.execute(sql`
      select table_name, column_name, data_type
      from information_schema.columns
      where table_schema='public'
        and data_type like 'timestamp%'
        and table_name in ('users','audit_events','verification_challenges','organizations','organization_members','organization_branches','verification_records','reputation_profiles','reputation_evaluations','reputation_history')
      order by table_name, ordinal_position
    `);
    for (const r of rows) console.log(`${r.table_name}.${r.column_name} -> ${r.data_type}`);
  } finally {
    await end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
