// AkarProMax L1C-0 — architecture regression guard for Services persistence.
//
// `lib/db/schemas/services-schema.ts` is the deprecated parallel services model.
// It declares tables whose names collide with the canonical Services Marketplace
// store but whose columns are incompatible. It stays in source for product
// archaeology (Product Constitution: capability preservation) and must remain
// unreachable from active production execution.
//
// This guard fails if an active API route or an active domain module re-imports
// it. It deliberately does NOT ban the module from documentation, tests or
// tooling configuration.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEPRECATED_MODULE = "lib/db/schemas/services-schema.ts";
const DEPRECATED_IMPORT_RE = /from\s+['"](?:@\/)?lib\/db\/schemas\/services-schema['"]/;

/** Historical, zero-importer modules that still reference the deprecated model. */
const OWNER_DEFERRED_LEGACY_MODULES = [
  "lib/land/integration/professional-integration.ts",
  "lib/services/matching/professional.matcher.ts",
];

const SCANNED_ROOTS = ["app", "lib", "src", "components", "hooks"];
const SKIPPED_DIR_NAMES = new Set(["node_modules", "backup", "dist", "build"]);

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || SKIPPED_DIR_NAMES.has(entry.name.toLowerCase())) continue;
      walk(abs, out);
    } else if (/\.(ts|tsx|mts|js|mjs|jsx)$/i.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function sourceFiles() {
  const files = [];
  for (const root of SCANNED_ROOTS) walk(path.join(ROOT, root), files);
  return files.map((abs) => ({ rel: path.relative(ROOT, abs).split(path.sep).join("/"), abs }));
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("the deprecated services model is preserved in source and marked non-canonical", () => {
  assert.ok(fs.existsSync(path.join(ROOT, DEPRECATED_MODULE)), `${DEPRECATED_MODULE} must not be deleted`);
  assert.match(read(DEPRECATED_MODULE), /NOT CANONICAL SERVICES PERSISTENCE/);
});

test("no active API route imports the deprecated services model", () => {
  const offenders = sourceFiles()
    .filter((file) => file.rel.startsWith("app/") && /\/route\.(ts|tsx|js|mjs)$/.test(file.rel))
    .filter((file) => DEPRECATED_IMPORT_RE.test(fs.readFileSync(file.abs, "utf8")))
    .map((file) => file.rel);

  assert.deepEqual(
    offenders,
    [],
    `active routes must reach Services data through the canonical marketplace domain, not ${DEPRECATED_MODULE}`,
  );
});

test("the only remaining references to the deprecated services model are owner-deferred dead modules", () => {
  const referencing = sourceFiles()
    .filter((file) => file.rel !== DEPRECATED_MODULE)
    .filter((file) => DEPRECATED_IMPORT_RE.test(fs.readFileSync(file.abs, "utf8")))
    .map((file) => file.rel)
    .sort();

  assert.deepEqual(referencing, [...OWNER_DEFERRED_LEGACY_MODULES].sort());
});

test("the owner-deferred legacy modules are marked inactive and have no importers", () => {
  const files = sourceFiles();
  for (const legacy of OWNER_DEFERRED_LEGACY_MODULES) {
    assert.ok(fs.existsSync(path.join(ROOT, legacy)), `${legacy} must not be deleted`);
    assert.match(read(legacy), /LEGACY INACTIVE/, `${legacy} must be marked LEGACY INACTIVE`);

    const specifier = legacy.replace(/\.ts$/, "");
    const bare = specifier.split("/").pop();
    const importers = files
      .filter((file) => file.rel !== legacy)
      .filter((file) => new RegExp(`from\\s+['"][^'"]*(?:${specifier}|/${bare})['"]`).test(fs.readFileSync(file.abs, "utf8")))
      .map((file) => file.rel);

    assert.deepEqual(
      importers,
      [],
      `${legacy} is owner-deferred dead code; reactivating it requires converting it to the canonical store first`,
    );
  }
});

test("exactly one /api/services compatibility adapter exists and it delegates to the canonical domain", () => {
  const compatDir = path.join(ROOT, "lib/services/compat");
  const adapters = fs.readdirSync(compatDir).filter((name) => /\.ts$/.test(name)).sort();
  assert.deepEqual(adapters, ["services-api.ts"], "there must be exactly one Services compatibility adapter");

  const adapter = read("lib/services/compat/services-api.ts");
  assert.doesNotMatch(adapter, DEPRECATED_IMPORT_RE);
  assert.match(adapter, /@services\/marketplace/);
  assert.doesNotMatch(adapter, /CREATE TABLE|INSERT INTO|UPDATE .* SET/i, "the adapter must own no SQL of its own");
});

test("the /api/services* compatibility surface reaches the canonical Services core", () => {
  const root = read("app/api/services/route.ts");
  assert.doesNotMatch(root, DEPRECATED_IMPORT_RE);
  assert.match(root, /@services\/compat\/services-api/);

  const analytics = read("app/api/service-analytics/route.ts");
  assert.doesNotMatch(analytics, DEPRECATED_IMPORT_RE);
  assert.match(analytics, /@services\/marketplace/);

  // The remaining /api/services/* compatibility routes proxy to, or call, the
  // canonical /api/service-* generation.
  const proxies = {
    "app/api/services/categories/route.ts": "/api/service-categories",
    "app/api/services/requests/route.ts": "/api/service-requests",
    "app/api/services/reviews/route.ts": "/api/service-reviews",
    "app/api/services/messages/route.ts": "/api/service-messages",
  };
  for (const [file, target] of Object.entries(proxies)) {
    assert.match(read(file), new RegExp(target.replace(/\//g, "\\/")), `${file} must proxy to ${target}`);
  }
});
