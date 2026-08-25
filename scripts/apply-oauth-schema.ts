import postgres from "postgres";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlFile = process.argv[2] || "drizzle-pg/0015_add_user_oauth_accounts.sql";
const ddl = readFileSync(sqlFile, "utf-8");

const statements = ddl
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter((s) => s.length > 0);

const client = postgres(url, { ssl: "require", prepare: false });
try {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.unsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(message)) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (exists)`);
      } else {
        console.error(`  [${i + 1}/${statements.length}] FAIL:`, message);
        process.exit(1);
      }
    }
  }
  console.log("Migration applied successfully");
} finally {
  await client.end();
}
