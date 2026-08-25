import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
const client = postgres(url, { ssl: "require", prepare: false });

const sql = readFileSync(join(process.cwd(), "drizzle-pg", "0014_limited_auction_organizers.sql"), "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .flatMap((chunk) => chunk.split(";"))
  .map((s) => s.trim())
  .filter(Boolean);

let ok = 0;
for (const statement of statements) {
  await client.unsafe(statement);
  ok += 1;
}
console.log(`Applied ${ok} statements from 0014_limited_auction_organizers.sql`);
await client.end();
