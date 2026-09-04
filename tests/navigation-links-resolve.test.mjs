import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  adminSidebarConfig,
  customerSidebarConfig,
  providerSidebarConfig,
  serviceSupervisorSidebarConfig,
  officeSidebarConfig,
} from "../src/config/sidebar.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every navigation link must lead somewhere.
 *
 * The admin services menu offered eight children, seven of which named pages
 * that were never built. Only /admin/services exists. An administrator opening
 * that menu met seven 404s, and nothing in the repository said so -- the hrefs
 * were plain strings in a config file, checked by nobody.
 *
 * The menu now points at tabs on the page that does exist, and this is what
 * keeps it honest.
 */

/**
 * Whether the app router can serve a path.
 *
 * Handles the two shapes this repository uses: a literal segment directory with
 * a page.tsx, and a dynamic [param] segment. A query string is stripped first --
 * "?tab=categories" is state on a page, not a route.
 */
async function routeExists(href) {
  const [pathname] = href.split("?");
  if (!pathname.startsWith("/")) return true; // external or anchor

  const segments = pathname.split("/").filter(Boolean);

  async function walk(dir, rest) {
    if (rest.length === 0) {
      for (const candidate of ["page.tsx", "page.ts", "page.jsx", "route.ts"]) {
        try {
          await access(path.join(ROOT, dir, candidate));
          return true;
        } catch {
          /* keep looking */
        }
      }
      return false;
    }

    const [head, ...tail] = rest;

    // A literal segment.
    try {
      await access(path.join(ROOT, dir, head));
      if (await walk(path.join(dir, head), tail)) return true;
    } catch {
      /* fall through to dynamic */
    }

    // A dynamic segment: [id], [...slug], [[...slug]].
    const { readdir } = await import("node:fs/promises");
    let entries = [];
    try {
      entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("[")) continue;
      if (await walk(path.join(dir, entry.name), tail)) return true;
    }

    // A route group, (marketing), does not consume a segment.
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("(")) continue;
      if (await walk(path.join(dir, entry.name), rest)) return true;
    }

    return false;
  }

  return walk("app", segments);
}

function allLinks(config) {
  const links = [];
  for (const item of config.items ?? []) {
    if (item.href) links.push({ key: item.key, href: item.href });
    for (const child of item.children ?? []) {
      links.push({ key: child.key, href: child.href });
    }
  }
  return links;
}

const CONFIGS = [
  ["admin", adminSidebarConfig],
  ["customer", customerSidebarConfig],
  ["provider", providerSidebarConfig],
  ["supervisor", serviceSupervisorSidebarConfig],
  ["office", officeSidebarConfig],
];

test("the sweep finds real links", async () => {
  // Guards the guard: an empty list would make every assertion below pass by
  // checking nothing.
  const total = CONFIGS.reduce((sum, [, config]) => sum + allLinks(config).length, 0);
  assert.ok(total > 20, `expected the navigation links, found ${total}`);
});

for (const [name, config] of CONFIGS) {
  test(`every ${name} sidebar link leads to a page that exists`, async () => {
    const broken = [];
    for (const link of allLinks(config)) {
      if (!(await routeExists(link.href))) broken.push(`${link.key} -> ${link.href}`);
    }
    assert.deepEqual(broken, [], `these ${name} menu entries lead to 404`);
  });
}

test("the admin services menu points at tabs the page actually has", async () => {
  // A link to ?tab=whatever renders the overview silently, which is a quieter
  // version of the same problem.
  const client = await readFile(path.join(ROOT, "app/admin/services/admin-client.tsx"), "utf8");
  const declared = client.match(/type Tab =([^;]+);/)?.[1] ?? "";

  const children = adminSidebarConfig.items
    .flatMap((item) => item.children ?? [])
    .filter((child) => child.href.startsWith("/admin/services"));

  assert.ok(children.length > 0, "the services menu must have entries");

  for (const child of children) {
    const tab = new URL(child.href, "https://x").searchParams.get("tab");
    if (!tab) continue;
    assert.ok(declared.includes(`"${tab}"`), `${child.key} points at tab "${tab}", which is not declared`);
  }
});

test("an unknown tab falls back rather than rendering nothing", async () => {
  // The query string is written by anyone.
  const client = await readFile(path.join(ROOT, "app/admin/services/admin-client.tsx"), "utf8");
  assert.match(client, /function isTab\(value: string \| null\): value is Tab/);
  assert.match(client, /isTab\(requestedTab\) \? requestedTab : "overview"/);
});
