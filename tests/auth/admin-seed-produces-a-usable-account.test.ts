import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isAccountUsable } from "../../lib/auth/access-control";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEED = path.join(ROOT, "scripts/seed-auth-admin.ts");

/**
 * The seed script wrote an administrator the login gate refuses.
 *
 * users.status defaults to "pending_verification"; the script set role,
 * isActive, name and passwordHash, and never status. So the created account
 * answered 403 account_blocked, and re-running to "reset the password" rewrote
 * the hash and left the block untouched -- which is what three rounds of
 * "reset it and try again" were spent on.
 */

test("the default status is one the login gate refuses", () => {
  // The premise. If this ever changes, the seed script's omission stops
  // mattering and this whole file can go.
  assert.equal(isAccountUsable("pending_verification", true), false);
  assert.equal(isAccountUsable("active", true), true);
  assert.equal(isAccountUsable("active", false), false);
});

test("both the insert and the update write every field the login gate reads", async () => {
  const seed = await readFile(SEED, "utf8");

  // One shared constant, so the two branches cannot drift apart again -- the
  // update branch is the one that was missing a field.
  assert.match(seed, /const ADMIN_FIELDS = \{[\s\S]*?status: "active"[\s\S]*?isActive: true[\s\S]*?\} as const;/);

  const update = seed.slice(seed.indexOf("await db\n        .update(users)"), seed.indexOf("admin updated"));
  const insert = seed.slice(seed.indexOf("await db.insert(users)"), seed.indexOf("admin created"));
  for (const [name, branch] of [["update", update], ["insert", insert]] as const) {
    assert.ok(branch.length > 0, `${name} branch not found`);
    assert.match(branch, /\.\.\.ADMIN_FIELDS/, `${name} must write the full field set`);
    assert.match(branch, /passwordHash/, `${name} must write the hash`);
    assert.match(branch, /emailVerifiedAt/, `${name} must not leave the account unverified`);
  }
});

test("the script verifies the account it wrote can actually sign in", async () => {
  const seed = await readFile(SEED, "utf8");
  // Reporting "admin updated" while leaving a blocked account is the failure
  // this whole change is about.
  assert.match(seed, /isAccountUsable\(saved\.status, saved\.isActive\)/);
  assert.ok(seed.indexOf("isAccountUsable(saved") > seed.indexOf("admin updated"));
});

test("it refuses to run without DATABASE_URL and warns on the default address", async () => {
  const seed = await readFile(SEED, "utf8");
  // Without it, lib/db falls back to postgres.js defaults and would seed an
  // administrator into whatever local database answered.
  assert.match(seed, /process\.env\.DATABASE_URL\?\.trim\(\)/);
  // `VAR=x && npm run ...` sets a shell variable and passes nothing along;
  // that is how a super_admin was created at the localhost default address.
  assert.match(seed, /SEED_ADMIN_EMAIL is not set/);
  assert.match(seed, /no "&&" between them/);
});

test("both admin scripts load .env, since neither reads it on its own", async () => {
  const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  for (const script of ["seed:auth:admin", "diagnose:admin"]) {
    assert.match(pkg.scripts[script], /--env-file=\.env/, `${script} must load .env`);
  }
});

test("the diagnostic prints what decides a login, and never the hash", async () => {
  const diagnose = await readFile(path.join(ROOT, "scripts/diagnose-admin-login.ts"), "utf8");
  for (const field of ["status", "isActive", "emailVerifiedAt", "role"]) {
    assert.match(diagnose, new RegExp(`users\.${field}`), `must read ${field}`);
  }
  // The cost prefix identifies a real hash without disclosing one.
  assert.match(diagnose, /bcrypt, cost/);
  const printed = diagnose.slice(diagnose.indexOf("console.log(`    password_hash"));
  assert.doesNotMatch(printed.split("\n")[0], /row\.passwordHash\}/, "must not print the hash itself");
});
