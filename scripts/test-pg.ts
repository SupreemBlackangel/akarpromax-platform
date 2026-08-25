import postgres from "postgres";
async function main() {
  const url = process.env.DATABASE_URL || "";
  console.log("URL prefix:", url.substring(0, 60) + "...");
  console.log("URL length:", url.length);
  try {
    const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
    const r = await client.unsafe("SELECT 1 as ok");
    console.log("OK:", r);
    await client.end();
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Error name:", err.name);
    console.error("Error message:", err.message?.substring(0, 300));
    console.error("Cause:", err.cause);
  }
}
main();
