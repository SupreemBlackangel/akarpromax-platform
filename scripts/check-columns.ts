import postgres from "postgres";
async function main() {
  const url = process.env.DATABASE_URL || "";
  const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
  try {
    const r = await client.unsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties' ORDER BY ordinal_position"
    );
    console.log("properties columns:");
    for (const row of r) console.log(`  ${row.column_name} (${row.data_type})`);
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : String(e));
  }
  await client.end();
}
main();
