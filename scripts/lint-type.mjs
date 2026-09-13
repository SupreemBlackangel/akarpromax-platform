#!/usr/bin/env node
/**
 * The type scale, enforced.
 *
 * A scale that lives in one file and is honoured by convention is a scale that
 * drifts: this platform had three of them at once, and nobody set out to make
 * a second. The rules below are the ones that let that happen.
 *
 * Run by `npm run lint`. Exits non-zero with the file, the line and what to
 * write instead.
 */
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const ROOTS = ["app", "src", "components"];

/** Archived copies and build output are not the product. */
const SKIP = [
  `scripts${sep}backup`,
  `${sep}node_modules${sep}`,
  `${sep}.next`,
  `${sep}.tmp`,
  `${sep}dist${sep}`,
];

/** The one place sizes may be written as numbers. */
const TOKEN_FILES = [`src${sep}styles${sep}tokens.css`];

const RULES = [
  {
    id: "tailwind-size-step",
    test: /\bt(?:ext)-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g,
    files: /\.(tsx|ts)$/,
    say: "size step — use a role: text-label / text-body-sm / text-body / text-h3 / text-h2 / text-h1 / text-price / text-stat",
  },
  {
    id: "tailwind-arbitrary-size",
    test: /text-\[\d+(?:\.\d+)?px\]/g,
    files: /\.(tsx|ts)$/,
    say: "a pixel size in a class — use a --type-* role",
  },
  {
    id: "heavy-weight",
    test: /\bfont-(?:black|extrabold)\b/g,
    files: /\.(tsx|ts)$/,
    say: "weight 800/900 — 700 is the heaviest the identity allows outside BrandMark",
    allow: [`src${sep}components${sep}ui${sep}BrandMark.tsx`],
  },
  {
    id: "css-heavy-weight",
    test: /font-weight:\s*(?:800|900)\b|font:\s*(?:800|900)\s/g,
    files: /\.css$/,
    say: "weight 800/900 in CSS — use 700",
  },
  {
    id: "css-literal-size",
    test: /font-size:\s*\d+(?:\.\d+)?px/g,
    files: /\.css$/,
    say: "a literal font-size — use font: var(--type-*) or var(--type-*-size)",
    onlyOutside: TOKEN_FILES,
  },
  {
    id: "below-floor",
    test: /text-\[(?:[1-9]|10|11)px\]|font-size:\s*(?:[1-9]|10|11)px/g,
    files: /\.(tsx|ts|css)$/,
    say: "below the 12px floor",
  },
  {
    id: "foreign-family",
    test: /\b(?:Tajawal|Noto Kufi|Segoe UI)\b|"Inter"|'Inter'/g,
    files: /\.(tsx|ts|css)$/,
    say: "a family the identity does not use — Cairo (headings) and IBM Plex Sans Arabic (everything else)",
  },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (SKIP.some((s) => full.includes(s))) continue;
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const failures = [];
for (const root of ROOTS) {
  let files;
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for await (const file of files) {
    const rel = relative(process.cwd(), file);
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const rule of RULES) {
      if (!rule.files.test(file)) continue;
      if (rule.allow?.some((a) => rel.endsWith(a))) continue;
      if (rule.onlyOutside?.some((a) => rel.endsWith(a))) continue;
      for (const match of source.matchAll(rule.test)) {
        const line = source.slice(0, match.index).split("\n").length;
        failures.push({ rule: rule.id, text: `${rel}:${line}  ${match[0].trim()}  —  ${rule.say}` });
      }
    }
  }
}

/*
 * Two kinds of rule, because one of them has two thousand existing violations.
 *
 * The BLOCKING rules are the ones the migration actually cleared — a weight of
 * 800, a size below the floor, a foreign family, a literal font-size in CSS.
 * Any of those is new work doing the wrong thing, and it fails.
 *
 * The size-step rule is a RATCHET. Around two thousand call sites still say
 * `text-sm` where they mean "secondary text"; they render at the right size
 * today (the roles and the steps resolve to the same pixels), so this is a
 * naming debt rather than a visual one — and rewriting two thousand call sites
 * blind is how a type migration becomes a regression. The count is recorded and
 * may only go DOWN: the debt is visible, new debt is refused, and the number in
 * .type-baseline.json is the size of the job that remains.
 */
const RATCHET = new Set(["tailwind-size-step"]);
const BASELINE_FILE = ".type-baseline.json";

const counts = {};
for (const failure of failures) counts[failure.rule] = (counts[failure.rule] ?? 0) + 1;

let baseline = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
} catch {
  baseline = {};
}

const blocking = failures.filter((failure) => !RATCHET.has(failure.rule));
const grown = [...RATCHET].filter((id) => (counts[id] ?? 0) > (baseline[id] ?? 0));

if (blocking.length > 0) {
  console.error(`\ntype scale: ${blocking.length} place(s) break a rule that is already clean\n`);
  for (const failure of blocking.slice(0, 40)) console.error("  " + failure.text);
  if (blocking.length > 40) console.error(`  … and ${blocking.length - 40} more`);
}

for (const id of grown) {
  console.error(
    `\ntype scale: "${id}" grew from ${baseline[id] ?? 0} to ${counts[id]}.`
    + "\nThe count may only go down — use a role (text-body-sm, text-label, text-h2 …).\n",
  );
  for (const failure of failures.filter((f) => f.rule === id).slice(0, 15)) console.error("  " + failure.text);
}

if (blocking.length > 0 || grown.length > 0) {
  console.error("\ndocs/typography.md has the scale and what each role is for.\n");
  process.exit(1);
}

const remaining = [...RATCHET].map((id) => `${id} ${counts[id] ?? 0}`).join(", ");
console.log(`type scale: clean — ratcheted debt: ${remaining}`);
