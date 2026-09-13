// A super_admin was told they had no permission, and the cure was to log out.
//
// The role was stamped into the session cookie at sign-in and never read again.
// Promote somebody in the database and nothing happened: they were an
// administrator in `users.role`, carrying a token that said `user`, and the
// console refused them. Nothing anywhere said that signing out and back in was
// the fix — so the platform's own owner met "لا تملك صلاحيات" on his own
// console.
//
// These are the pure pieces of that path. The resolver itself needs a database
// and is covered by the deployed check; what is pinned here is the rule that
// makes a stale role harmless: the role decides the permissions, and a
// super_admin's permissions contain the wildcard.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { mapSessionRole, permissionsForSessionRole } from "../../lib/auth/identity-map.ts";
import { hasPermission } from "../../lib/identity-auth.ts";
import { PERMISSIONS } from "../../src/constants/permissions.ts";

const identity = (role) => ({
  authenticated: true,
  email: "owner@example.com",
  displayName: "Owner",
  role: mapSessionRole(role),
  countryCode: null,
  permissions: permissionsForSessionRole(role),
});

test("a super_admin can reach every guarded admin page", () => {
  // The services console asks for any one of three; the wildcard answers all.
  const owner = identity("super_admin");
  for (const permission of [
    PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
    PERMISSIONS.SERVICE_REPORTS_MANAGE,
    PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
  ]) {
    assert.equal(hasPermission(owner, permission), true, permission);
  }
});

test("a plain user cannot, which is the other half of the rule", () => {
  const visitor = identity("user");
  assert.equal(hasPermission(visitor, PERMISSIONS.SERVICE_CATEGORIES_MANAGE), false);
});

test("an unknown role is a viewer rather than an administrator", () => {
  // Fail closed: a role nobody recognises gets the least, not the most.
  const odd = identity("chief_wizard");
  assert.equal(odd.role, "viewer");
  assert.equal(hasPermission(odd, PERMISSIONS.SERVICE_CATEGORIES_MANAGE), false);
});

test("the session resolver reads the role from the row, not from the cookie", () => {
  // The regression that caused this: `mapSessionRole(session.role)`. The row is
  // already being read for the email and the name on the line above, so taking
  // the role from it costs nothing and makes a promotion take effect on the
  // next request instead of the next sign-in.
  const source = readFileSync(new URL("../../lib/identity-auth.ts", import.meta.url), "utf8");

  assert.match(source, /role: pgUsers\.role/, "the query must select the stored role");
  assert.match(source, /const storedRole = \(user\.role \?\? ""\)\.trim\(\)/);
  assert.ok(
    !/mapSessionRole\(session\.role\)/.test(source),
    "the role must not come from the session cookie alone",
  );
});
