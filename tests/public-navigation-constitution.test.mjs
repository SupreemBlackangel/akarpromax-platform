import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import { PUBLIC_NAV, PUBLIC_NAV_CONSTITUTION_IDS } from "../src/config/public-navigation.ts";

const EXPECTED_ROUTES = [
  "/",
  "/properties",
  "/tools",
  "/services",
  "/offices",
  "/companies",
  "/community",
  "/knowledge",
  "/advertise",
  "/about",
  "/contact",
];

test("public navigation constitution keeps the exact 11-item menu in the Product Owner order", () => {
  assert.equal(PUBLIC_NAV.length, 11);
  assert.deepEqual(PUBLIC_NAV.map((item) => item.key), PUBLIC_NAV_CONSTITUTION_IDS);
  assert.deepEqual(PUBLIC_NAV.map((item) => item.href), EXPECTED_ROUTES);
});

test("public navigation constitution has unique ids, routes, icons, and page families", () => {
  assert.equal(new Set(PUBLIC_NAV.map((item) => item.key)).size, PUBLIC_NAV.length, "duplicate menu ids are forbidden");
  assert.equal(new Set(PUBLIC_NAV.map((item) => item.href)).size, PUBLIC_NAV.length, "duplicate primary routes are forbidden");
  assert.equal(new Set(PUBLIC_NAV.map((item) => item.pageFamily)).size, PUBLIC_NAV.length, "each primary item must map to its own page family");
  for (const item of PUBLIC_NAV) {
    assert.ok(item.icon, `missing icon for ${item.key}`);
  }
});

test("every primary navigation item resolves to a registered page component", async () => {
  for (const item of PUBLIC_NAV) {
    const target = new URL(`../${item.componentPath}`, import.meta.url);
    const file = await stat(target);
    assert.ok(file.isFile(), `missing component file for ${item.key}: ${item.componentPath}`);
  }
});
