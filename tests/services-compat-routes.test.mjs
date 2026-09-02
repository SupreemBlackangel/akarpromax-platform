import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The /api/services/* compatibility family.
 *
 * These exist so older clients keep working while the canonical routes live
 * under /api/service-*. Each one used to re-issue the request over HTTP to this
 * same server, which cost a second full request -- another TLS-terminated
 * connection through nginx, the body buffered and streamed twice, the session
 * cookie re-parsed -- to reach a function already loaded in the same process.
 *
 * Worse, it made a wrong target silently expensive instead of obviously broken.
 * Three of them forwarded somewhere that does not exist and answered 500 in
 * production, and nothing said so:
 *
 *   PATCH /api/services/orders/[id]         -> /api/service-orders/[id]  (no such route)
 *   POST  /api/services/orders/[id]/review  -> /api/service-orders/...   (no such route)
 *   PATCH /api/services/disputes            -> a canonical with no PATCH
 *   GET   /api/services/messages            -> a canonical with no GET
 *
 * Calling the handler directly turns every one of those into a build error,
 * because you cannot import a function that is not there.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

async function compatRoutes(dir = "app/api/services") {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await compatRoutes(rel)));
    else if (entry.name === "route.ts") out.push(rel);
  }
  return out;
}

test("the compatibility routes are found", async () => {
  // Guards the guard: an empty sweep would make everything below pass by
  // testing nothing.
  const routes = await compatRoutes();
  assert.ok(routes.length >= 8, `expected the compat routes, found ${routes.length}`);
});

test("no compatibility route calls this server over HTTP", async () => {
  const offenders = [];
  for (const file of await compatRoutes()) {
    const source = await read(file);
    // A fetch built from the incoming request's own URL is the self-call.
    if (/new URL\(request\.url\)/.test(source) && /fetch\(/.test(source)) {
      offenders.push(file);
    }
    if (/proxyToCanonical/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], "these routes re-issue the request instead of calling the handler");
});

test("every forwarded handler is imported, so a missing target cannot compile", async () => {
  for (const file of await compatRoutes()) {
    const source = await read(file);
    if (!source.includes("forwardToCanonical")) continue;
    assert.match(
      source,
      /import \{[^}]*\bas canonical/,
      `${file} forwards without importing the handler it forwards to`,
    );
  }
});

test("the orders aliases point at jobs, which is where they actually live", async () => {
  // /api/service-orders has never existed. Both of these answered 500.
  const importsOf = (source) =>
    source.split(/\r?\n/).filter((line) => line.trim().startsWith("import ")).join("\n");

  const order = await read("app/api/services/orders/[id]/route.ts");
  assert.match(order, /app\/api\/service-jobs\/\[id\]\/status\/route/);
  // Only the imports must be free of the dead path. The comment above them
  // names it on purpose, so whoever reads the file learns why it changed.
  assert.doesNotMatch(importsOf(order), /service-orders/);

  const review = await read("app/api/services/orders/[id]/review/route.ts");
  assert.match(review, /app\/api\/service-jobs\/\[id\]\/review\/route/);
});

test("no alias advertises a method its canonical does not implement", async () => {
  // /api/services/disputes offered PATCH and /api/services/messages offered
  // GET; neither canonical has them, so both answered 500.
  const methodsOf = (source) =>
    [...source.matchAll(/export async function ([A-Z]+)\(/g)].map((m) => m[1]).filter((m) => m !== "OPTIONS");

  const pairs = [
    ["app/api/services/disputes/route.ts", "app/api/service-disputes/route.ts"],
    ["app/api/services/messages/route.ts", "app/api/service-messages/route.ts"],
    ["app/api/services/categories/route.ts", "app/api/service-categories/route.ts"],
    ["app/api/services/requests/route.ts", "app/api/service-requests/route.ts"],
    ["app/api/services/reviews/route.ts", "app/api/service-reviews/route.ts"],
  ];

  for (const [alias, canonical] of pairs) {
    const offered = methodsOf(await read(alias));
    const available = methodsOf(await read(canonical));
    for (const method of offered) {
      assert.ok(
        available.includes(method),
        `${alias} offers ${method} but ${canonical} does not implement it`,
      );
    }
  }
});

test("the Allow header matches what the route actually offers", async () => {
  // A wrong Allow sends a client to a method that will fail.
  for (const file of await compatRoutes()) {
    const source = await read(file);
    const allow = /Allow: "([^"]+)"/.exec(source);
    if (!allow) continue;
    const advertised = allow[1].split(",").map((m) => m.trim()).filter((m) => m !== "OPTIONS");
    const implemented = [...source.matchAll(/export async function ([A-Z]+)\(/g)]
      .map((m) => m[1])
      .filter((m) => m !== "OPTIONS");
    assert.deepEqual(
      [...advertised].sort(),
      [...implemented].sort(),
      `${file} advertises ${allow[1]} but implements ${implemented.join(", ")}`,
    );
  }
});
