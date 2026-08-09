import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";

const status = await ensurePgIdentitySchema();
console.log(JSON.stringify(status, null, 2));
