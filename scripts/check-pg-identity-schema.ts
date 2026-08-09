import { probePublicPgIdentitySchema } from "@/lib/db/pg-identity-schema";

const status = await probePublicPgIdentitySchema();
console.log(JSON.stringify(status, null, 2));
if (!status.ready) {
  process.exitCode = 1;
}
