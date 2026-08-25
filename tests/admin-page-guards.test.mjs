// Admin page and API guards — focused on the pages that rendered with no check.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const ADMIN_DIR = new URL("../app/admin/", import.meta.url);

const strip = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");

async function src(path) {
  return strip(await readFile(new URL(path, import.meta.url), "utf8"));
}

const GUARD = /PermissionGuard|requireSessionUser|getSessionIdentity|hasPermission|requirePermission/;

test("every admin page checks the caller before it renders", async () => {
  const entries = await readdir(ADMIN_DIR, { withFileTypes: true });
  const unguarded = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let page;
    try {
      page = await readFile(new URL(`${entry.name}/page.tsx`, ADMIN_DIR), "utf8");
    } catch {
      continue;
    }
    if (!GUARD.test(strip(page))) unguarded.push(entry.name);
  }

  assert.deepEqual(unguarded, [], `these admin pages render with no permission check: ${unguarded.join(", ")}`);
});

test("the roles screen requires the roles permission", async () => {
  const page = await src("../app/admin/roles/page.tsx");

  assert.match(page, /requireSessionUser\("\/admin\/roles"\)/);
  assert.match(page, /PermissionGuard/);
  assert.match(page, /PERMISSIONS\.ROLES_VIEW/);
});

test("the advertising screen requires the ads permission", async () => {
  const page = await src("../app/admin/advertising/page.tsx");

  assert.match(page, /PermissionGuard/);
  assert.match(page, /PERMISSIONS\.ADS_VIEW/);
});

test("the offer types screen requires the property management permission", async () => {
  const page = await src("../app/admin/offer-types/page.tsx");

  assert.match(page, /PermissionGuard/);
  assert.match(page, /PERMISSIONS\.PROPERTIES_MANAGE/);
});

test("the permission array is module level so the guard does not re-check in a loop", async () => {
  for (const path of [
    "../app/admin/roles/page.tsx",
    "../app/admin/advertising/page.tsx",
    "../app/admin/offer-types/page.tsx",
  ]) {
    const page = await src(path);
    assert.match(page, /^const REQUIRED = \[PERMISSIONS\./m, `${path} must hoist the permission array`);
    assert.match(page, /requiredPermissions=\{REQUIRED\}/, `${path} must pass the hoisted array`);
  }
});

test("writing an offer type needs a permission, not merely a session", async () => {
  const route = await src("../app/api/admin/offer-types/route.ts");

  assert.match(route, /PERMISSIONS\.PROPERTIES_MANAGE/);
  assert.match(route, /status: 403/);
  // Both write verbs are covered.
  const guards = route.match(/await blockUnlessPropertyManager\(\)/g) ?? [];
  assert.equal(guards.length, 2, "POST and PATCH must both be guarded");
});

test("the roles API still refuses a caller without the roles permission", async () => {
  const route = await src("../app/api/admin/roles/route.ts");

  assert.match(route, /hasPermission\(identity, PERMISSIONS\.ROLES_VIEW\)/);
  assert.match(route, /hasPermission\(identity, PERMISSIONS\.ROLES_MANAGE\)/);
  assert.match(route, /status: 403/);
});
