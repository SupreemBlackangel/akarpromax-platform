import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";

const client = postgres(url, { ssl: "require", prepare: false });

export const db = drizzle(client);

export function getDb() {
  const freshClient = postgres(url, { ssl: "require", prepare: false });
  return { db: drizzle(freshClient), end: () => freshClient.end() };
}
