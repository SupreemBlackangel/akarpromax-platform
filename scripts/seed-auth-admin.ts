import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

const DEFAULT_EMAIL = "admin@localhost.akarpromax";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();

  let password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    // No usable password supplied: generate a strong one-time bootstrap
    // password. It is printed exactly once and never persisted anywhere.
    password = randomBytes(12).toString("base64url");
    console.log(
      `\n[Bootstrap admin] No SEED_ADMIN_PASSWORD provided — generated a one-time password ` +
        `(shown once, never stored):\n  email:    ${email}\n  password: ${password}\n` +
        `Rotate it after first login.\n`,
    );
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
