import postgres from "postgres";
import { applyPgIdentitySchema } from "@/lib/db/pg-identity-schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const client = postgres(url, { ssl: "require", prepare: false });
  try {
    const status = await applyPgIdentitySchema(client, { schema: "public" });
    console.log(
      JSON.stringify({ ready: status.ready, version: status.version, appliedVersion: status.appliedVersion, missing: status.missingTables }),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
