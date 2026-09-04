import { eq } from "drizzle-orm";

import { users } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { accountBlockReason, isAccountUsable } from "@/lib/auth/access-control";

/**
 * Why can this account not log in?
 *
 * Three rounds of "reset the password and try again" went by without anyone
 * being able to see the row the login route reads. The route answers
 * `invalid_credentials` for both an address it cannot find and a password that
 * does not match, and `account_blocked` for a status it will not accept -- and
 * the page showed the first message for every one of them.
 *
 * This prints the fields that decide a login, and nothing else. No password,
 * no hash: only the cost prefix, which is enough to tell a real bcrypt hash
 * from the "disabled" and "oauth_no_password" placeholders the codebase also
 * writes into that column.
 *
 *   SEED_ADMIN_EMAIL=you@example.com npm run diagnose:admin
 */
async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("\n[diagnose:admin] DATABASE_URL is not set. Run from the directory holding .env.\n");
    process.exit(1);
  }

  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.error("\n[diagnose:admin] Usage: npm run diagnose:admin -- you@example.com\n");
    process.exit(1);
  }

  const { db, end } = getDb();
  try {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        status: users.status,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
        passwordHash: users.passwordHash,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!row) {
      console.log(`\n  ${email}\n  NOT FOUND.\n`);
      console.log("  The login answers invalid_credentials for this, indistinguishably from a");
      console.log("  wrong password. Check the address for a typo, then seed it:");
      console.log(`    SEED_ADMIN_EMAIL=${email} npm run seed:auth:admin\n`);
      return;
    }

    const hashKind = /^\$2[aby]\$(\d\d)\$/.exec(row.passwordHash);
    console.log(`\n  ${row.email}`);
    console.log(`    role              ${row.role}`);
    console.log(`    status            ${row.status}`);
    console.log(`    is_active         ${row.isActive}`);
    console.log(`    email_verified_at ${row.emailVerifiedAt?.toISOString() ?? "null"}`);
    console.log(`    password_hash     ${hashKind ? `bcrypt, cost ${hashKind[1]}` : `NOT A BCRYPT HASH ("${row.passwordHash.slice(0, 20)}")`}`);
    console.log(`    last_login_at     ${row.lastLoginAt?.toISOString() ?? "never"}`);
    console.log(`    updated_at        ${row.updatedAt?.toISOString() ?? "null"}`);

    const problems: string[] = [];
    if (!hashKind) {
      problems.push(
        'password_hash is a placeholder, not a hash. No password can ever match it. ' +
          "(\"oauth_no_password\" is written for social sign-ups; \"disabled\" by a manual lockout.)",
      );
    }
    if (!isAccountUsable(row.status, row.isActive)) {
      problems.push(
        `the login gate refuses status="${row.status}", is_active=${row.isActive} ` +
          `(reason: ${accountBlockReason(row.status, row.isActive)}). Even a correct password ` +
          "answers 403 account_blocked, which the login page long displayed as a wrong password.",
      );
    }

    if (problems.length === 0) {
      console.log("\n  This account can log in. If it is being refused, the password does not match.");
      console.log(`  Reset it:  SEED_ADMIN_EMAIL=${email} npm run seed:auth:admin\n`);
    } else {
      console.log("\n  BLOCKED:");
      for (const problem of problems) console.log(`    - ${problem}`);
      console.log(`\n  Fix both at once:  SEED_ADMIN_EMAIL=${email} npm run seed:auth:admin\n`);
    }
  } finally {
    await end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
