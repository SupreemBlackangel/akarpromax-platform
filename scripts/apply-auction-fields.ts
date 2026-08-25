import postgres from "postgres";
import { readFileSync } from "fs";
async function main() {
  const url = process.env.DATABASE_URL || "";
  const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
  try {
    const r = await client.unsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'properties' AND column_name LIKE 'auction%' ORDER BY column_name"
    );
    console.log("auction columns:", r.map((t) => t.column_name as string));
    if (r.length === 0) {
      console.log("Applying 0008 migration...");
      const sql = readFileSync("drizzle-pg/0008_add_auction_fields.sql", "utf8");
      const stmts = sql.split("--> statement-breakpoint").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      for (const stmt of stmts) {
        try {
          await client.unsafe(stmt);
          console.log("  applied:", stmt.substring(0, 80));
        } catch (e: unknown) {
          console.log("  skip:", e instanceof Error ? e.message?.substring(0, 120) : String(e));
        }
      }
      console.log("Done");
    }
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : String(e));
  }
  await client.end();
}
main();
