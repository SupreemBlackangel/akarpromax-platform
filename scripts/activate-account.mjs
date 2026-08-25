/**
 * AKARPROMAX — one-shot account activation (operator maintenance).
 *
 * Marks an EXISTING account as usable for login:
 *   status = 'active', isActive = true, emailVerifiedAt = now (if not set).
 * Never touches the password, never prints hashes, never creates accounts.
 *
 * Usage (PowerShell, project root — uses the project's own DB layer + .env):
 *   node --import tsx scripts/activate-account.mjs admin@akarpromax.com
 *
 * Optional, explicit operator action only (sets the DB role):
 *   node --import tsx scripts/activate-account.mjs admin@akarpromax.com --role super_admin
 */

import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/index.ts";
import { users } from "../lib/db/schema.ts";

const email = (process.argv[2] || "").trim().toLowerCase();
const roleFlagIndex = process.argv.indexOf("--role");
const requestedRole = roleFlagIndex !== -1 ? (process.argv[roleFlagIndex + 1] || "").trim() : null;

if (!email || !email.includes("@")) {
  console.error("Usage: node --import tsx scripts/activate-account.mjs <email> [--role super_admin]");
  process.exit(2);
}
if (requestedRole !== null && requestedRole !== "super_admin" && requestedRole !== "admin") {
  console.error(`Refusing role "${requestedRole}" — only super_admin/admin may be set by this script.`);
  process.exit(2);
}

const { db, end } = getDb();
try {
  const [existing] = await db
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    console.error(`NOT FOUND: no account with email ${email}. Nothing changed.`);
    process.exit(1);
  }

  console.log(`Before: status=${existing.status} isActive=${existing.isActive} emailVerified=${existing.emailVerifiedAt ? "YES" : "NO"} role=${existing.role} passwordHash=${existing.passwordHash ? "present" : "MISSING"}`);

  const patch = {
    status: "active",
    isActive: true,
    emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
  };
  if (requestedRole) patch.role = requestedRole;

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, existing.id))
    .returning({ status: users.status, isActive: users.isActive, emailVerifiedAt: users.emailVerifiedAt, role: users.role });

  console.log(`After:  status=${updated.status} isActive=${updated.isActive} emailVerified=${updated.emailVerifiedAt ? "YES" : "NO"} role=${updated.role}`);
  console.log("DONE — the account can now pass isAccountUsable() at login.");
  if (!requestedRole && updated.role !== "super_admin") {
    console.log(`NOTE: role is "${updated.role}" — Admin Property Management requires super_admin (or admin permissions). Re-run with: --role super_admin`);
  }
} finally {
  await end();
}
