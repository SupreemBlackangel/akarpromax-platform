// Country scoping on ad campaigns sits on top of the ads permissions. It was
// switching the reviewer role off instead.
//
// `identity.countryCode` is hard-coded to null (lib/identity-auth.ts): the users
// table has no country column and the session token carries none. canManageTargets
// refused anyone without one, so `ads_reviewer` — a role whose entire purpose is
// ADS_APPROVE — could approve no campaign on the platform. The control was not
// protecting anything; it was failing closed on a fact nobody records.
//
// And the country test asked `countries.length === 1`, which refuses a campaign
// naming the reviewer's own country twice as readily as one naming somebody
// else's.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { canManageTargets } from "../lib/ads/admin.ts";
import { ROLE_CATALOG } from "../src/constants/roles.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";

const identity = (role, countryCode = null) => ({
  authenticated: true,
  email: `${role}@example.com`,
  displayName: role,
  role,
  countryCode,
  permissions: ROLE_CATALOG[role]?.permissions ?? [],
});

test("the premise: the platform records no country for anyone", async () => {
  // If this stops being true, the fail-open below becomes reachable-but-unused
  // rather than the only behaviour, and this file needs revisiting.
  const source = await readFile(new URL("../lib/identity-auth.ts", import.meta.url), "utf8");
  assert.match(source, /countryCode: null,/, "identity.countryCode is still hard-coded");
});

test("a reviewer with no recorded country can review — the permission is the gate", () => {
  const reviewer = identity("ads_reviewer");
  assert.ok(reviewer.permissions.includes(PERMISSIONS.ADS_APPROVE), "the role exists to approve");
  assert.equal(canManageTargets(reviewer, ["sa"]), true);
  assert.equal(canManageTargets(reviewer, []), true, "and every live campaign has no country list");
});

test("a recorded country still scopes, in both directions", () => {
  const saudi = identity("ads_reviewer", "SA");
  assert.equal(canManageTargets(saudi, ["sa"]), true);
  assert.equal(canManageTargets(saudi, ["om"]), false);
  assert.equal(canManageTargets(saudi, ["sa", "om"]), false, "one foreign country is enough to refuse");
  assert.equal(canManageTargets(saudi, ["sa", "SA"]), true, "the question is whose, not how many");
});

test("a campaign targeting everywhere is no single country's to manage", () => {
  assert.equal(canManageTargets(identity("ads_reviewer", "SA"), []), false);
  // The two roles that are platform-wide by definition keep it.
  assert.equal(canManageTargets(identity("super_admin", "SA"), []), true);
  assert.equal(canManageTargets(identity("ad_manager", "SA"), []), true);
});

test("scoping does not hand anyone a permission they lack", () => {
  // The widening above must not be read as "anyone may approve". Every caller
  // checks an ADS_* permission before reaching canManageTargets, and
  // ads_reviewer deliberately does not hold ADS_PUBLISH.
  const reviewer = ROLE_CATALOG.ads_reviewer.permissions;
  assert.ok(reviewer.includes(PERMISSIONS.ADS_APPROVE));
  assert.ok(!reviewer.includes(PERMISSIONS.ADS_PUBLISH));

  const approve = readFile(new URL("../app/api/admin/ads/approve/route.ts", import.meta.url), "utf8");
  return approve.then((source) => {
    assert.match(source, /hasSponsorPermission\(identity, PERMISSIONS\.ADS_APPROVE\)/);
    assert.match(source, /canManageTargets\(identity, parseList\(existing\.countries\)\)/, "scoping still runs after the permission");
  });
});
