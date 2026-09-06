// Two faults the services hub showed a visitor, and the shape of their fixes.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("the hub scopes the taxonomy to a country, and folds duplicates by trade", async () => {
  // Each country carries its own copy of the same ten trades, keyed
  // (country_code, code). The hub fetched them unscoped, so the moment Saudi
  // Arabia's tree was seeded beside Oman's it listed every group twice.
  const source = await read("app/services/page.tsx");
  assert.match(source, /const categorySuffix = !isGlobal && country \? `\?country=\$\{encodeURIComponent\(country\)\}` : ""/);
  assert.match(source, /api\/service-categories\$\{categorySuffix\}/);
  assert.doesNotMatch(source, /apiFetch<\{ categories: CategoryRow\[\] \}>\(`\/api\/service-categories`\)/);
  // Browsing globally has no country to scope by, so the fold is what keeps it honest.
  assert.match(source, /const byCode = new Map<string, CategoryRow>\(\)/);
});

test("a category icon resolves from the name the database actually stores", async () => {
  // The map is keyed by Lucide's PascalCase component names; the taxonomy
  // stores kebab-case, so every lookup missed and every category drew the same
  // fallback wrench.
  const source = await read("src/components/services/ServiceCards.tsx");
  assert.match(source, /function iconFor\(name\?: string \| null\)/);
  assert.match(source, /ICON_ALIASES/);
  for (const alias of ['"paint-roller": "Paintbrush"', 'building: "Building2"', 'briefcase: "BriefcaseBusiness"']) {
    assert.ok(source.includes(alias), `${alias} must be mapped`);
  }
  // The ten names the taxonomy holds today must all reach a real icon.
  const map = /const CATEGORY_ICONS: Record<string, LucideIcon> = \{([\s\S]*?)\};/.exec(source)[1];
  const known = new Set([...map.matchAll(/([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]));
  const pascal = (n) => n.split(/[-_\s]+/).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  const aliases = { "paint-roller": "Paintbrush", building: "Building2", briefcase: "BriefcaseBusiness" };
  for (const stored of ["wrench", "paint-roller", "hard-hat", "sparkles", "truck", "trees", "ruler", "building", "briefcase", "hammer"]) {
    const resolved = aliases[stored] ?? pascal(stored);
    assert.ok(known.has(resolved), `${stored} -> ${resolved} is not in CATEGORY_ICONS`);
  }
});

test("the request card never prints a raw category id", async () => {
  const source = await read("src/components/services/ServiceCards.tsx");
  assert.doesNotMatch(source, /String\(request\.category_id\)\.slice/);
  assert.match(source, /const unnamed = locale === "ar" \? "خدمة"/);
});
