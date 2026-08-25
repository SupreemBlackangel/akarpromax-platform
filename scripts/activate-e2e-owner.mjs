import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/index.ts";
import { users } from "../lib/db/schema.ts";

const email = process.argv[2];
if (!email) { console.error("Usage: node --env-file=.env --import tsx scripts/activate-e2e-owner.mjs <email>"); process.exit(2); }

const { db, end } = getDb();
try {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) { console.error("NOT FOUND:", email); process.exit(1); }
  console.log(`Before: status=${u.status} active=${u.isActive} verified=${u.emailVerifiedAt ? "YES" : "NO"}`);
  await db.update(users).set({ status: "active", isActive: true, emailVerifiedAt: u.emailVerifiedAt ?? new Date() }).where(eq(users.id, u.id));
  const [u2] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  console.log(`After:  status=${u2.status} active=${u2.isActive} verified=${u2.emailVerifiedAt ? "YES" : "NO"}`);
  console.log("DONE");
} finally {
  await end();
}
