import postgres from "postgres";
async function main() {
  const url = process.env.DATABASE_URL || "";
  const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
  try {
    const r = await client.unsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('properties', 'property_media', 'property_favorites', 'saved_searches', 'users') ORDER BY table_name"
    );
    console.log("Tables found:", r.map((t) => t.table_name as string));
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : String(e));
  }
  await client.end();
}
main();
