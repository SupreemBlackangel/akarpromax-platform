import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { isAccountUsable } from "@/lib/auth/access-control";

const DEFAULT_EMAIL = "admin@localhost.akarpromax";

/**
 * The account this writes must be able to log in.
 *
 * It could not. users.status defaults to "pending_verification", this script
 * never set it, and lib/auth/access-control.ts treats every status except
 * "active" as blocked -- so a freshly seeded administrator got 403
 * account_blocked on the first attempt, and re-running the script to "reset
 * the password" changed the hash and left the block in place. The update
 * branch set passwordHash, role, isActive and name, and none of those is the
 * field that was refusing the login.
 *
 * Both branches now write the full set of fields that decide whether a login
 * succeeds, and the result is read back and verified before the script claims
 * success.
 */
const ADMIN_FIELDS = {
  role: "super_admin",
  status: "active",
  isActive: true,
  name: "Platform Administrator",
} as const;

function fail(message: string): never {
  console.error(`\n[seed:auth:admin] ${message}\n`);
  process.exit(1);
}

async function main() {
  // Without DATABASE_URL, lib/db builds a client from postgres.js defaults --
  // localhost, the OS user, a database named after them. The script would
  // then either refuse to connect or, worse, seed an administrator into
  // whatever local database happened to answer. package.json passes
  // --env-file=.env for exactly this reason; this check covers the case where
  // the script is invoked directly.
  if (!process.env.DATABASE_URL?.trim()) {
    fail(
      "DATABASE_URL is not set. Run this through `npm run seed:auth:admin`, which loads .env, " +
        "and run it from the directory holding that .env.",
    );
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  if (email === DEFAULT_EMAIL) {
    // A shell variable is not an environment variable. `SEED_ADMIN_EMAIL=x &&
    // npm run ...` sets the first and passes nothing to the second, and this
    // script then silently seeded a super_admin at its localhost default
    // instead of the address that was asked for.
    console.warn(
      `\n[seed:auth:admin] WARNING: SEED_ADMIN_EMAIL is not set, using the development default ` +
        `"${DEFAULT_EMAIL}".\n  This is almost never what you want on a deployed host. The variable ` +
        `must directly precede the command:\n    SEED_ADMIN_EMAIL=you@example.com npm run seed:auth:admin\n` +
        `  Note there is no "&&" between them.\n`,
    );
  }

  let password = process.env.SEED_ADMIN_PASSWORD;
  const generated = !password || password.length < 8;
  if (generated) {
    // No usable password supplied: generate a strong one-time bootstrap
    // password. It is printed exactly once and never persisted anywhere.
    password = randomBytes(12).toString("base64url");
  }

  const { db, end } = getDb();
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordHash = await hashPassword(password!);
    const now = new Date();

    if (existing[0]) {
      await db
        .update(users)
        .set({ ...ADMIN_FIELDS, passwordHash, emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, existing[0].id));
      console.log(`admin updated: ${email}`);
    } else {
      await db.insert(users).values({
        ...ADMIN_FIELDS,
        email,
        passwordHash,
        emailVerifiedAt: now,
      });
      console.log(`admin created: ${email}`);
    }

    // Read back what the login route will read. A script that reports success
    // while leaving an account the login gate refuses is the whole reason this
    // is here.
    const [saved] = await db
      .select({
        status: users.status,
        isActive: users.isActive,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!saved) fail(`wrote ${email} but could not read it back -- nothing was seeded.`);
    if (!isAccountUsable(saved.status, saved.isActive)) {
      fail(
        `${email} was written with status="${saved.status}", isActive=${saved.isActive}, ` +
          `which the login gate refuses. The account cannot sign in.`,
      );
    }

    console.log(`  status: ${saved.status}   active: ${saved.isActive}   role: ${saved.role}`);
    if (generated) {
      console.log(
        `\n  One-time password (shown once, never stored):\n    ${password}\n` +
          `  Rotate it after first login.\n`,
      );
    }
  } finally {
    await end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
