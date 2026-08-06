import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const DEFAULT_EMAIL = "admin@akarpromax.om";
const DEFAULT_PASSWORD = "ChangeMe123!";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  }

  const { db, end } = getDb();
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordHash = await hashPassword(password);

    if (existing[0]) {
      await db
        .update(users)
        .set({ passwordHash, role: "super_admin", isActive: true, name: "Platform Administrator" })
        .where(eq(users.id, existing[0].id));
      console.log(`admin updated: ${email}`);
    } else {
      await db.insert(users).values({
        email,
        passwordHash,
        role: "super_admin",
        isActive: true,
        name: "Platform Administrator",
      });
      console.log(`admin created: ${email}`);
    }
  } finally {
    await end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
