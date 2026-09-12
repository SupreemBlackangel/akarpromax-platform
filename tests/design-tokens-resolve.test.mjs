// Every design token a component asks for has to exist somewhere.
//
// Four did not. docs/brand-identity.md named the gold `--accent` and the error
// colour `--color-error`; src/styles/tokens.css shipped `--color-accent` and
// `--color-danger`. Components were written to the document, so
// `var(--color-error)` appeared in 48 files and `var(--accent)` in 24, and
// resolved to nothing in all of them. A declaration with an unresolvable var()
// is invalid at computed-value time and is dropped — so every error state on
// the platform rendered with no red, and every gold badge with no gold, while
// the markup and the tests both looked correct.
//
// The existing token test checked that the canonical names are DEFINED. Nothing
// checked that the names components actually USE resolve, which is the half
// that was broken.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOTS = ["app", "src", "components", "lib"];
const STYLESHEETS = ["src/styles/tokens.css", "app/globals.css", "src/styles/admin.css", "src/styles/find-my-land.css"];

/**
 * Names that are legitimately absent from the stylesheets.
 *
 * next/font generates the two font variables and attaches them to <html> at
 * runtime (app/layout.tsx passes `heading.variable` and `body.variable`), so
 * they can never appear in a checked-in stylesheet. The names changed with the
 * type system in design phase 1: Cairo is the heading face, IBM Plex Sans
 * Arabic the body face, and Inter is gone.
 */
const INJECTED_AT_RUNTIME = new Set(["--font-heading", "--font-body"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/** Block comments and line comments are documentation, not usage. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function collectUsage() {
  const usage = new Map();
  for (const root of SOURCE_ROOTS) {
    const dir = path.join(ROOT, root);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const source = stripComments(fs.readFileSync(file, "utf8"));
      // `var(--x)` is a hard requirement; `var(--x, fallback)` is not, because
      // the fallback is what renders when the name is absent.
      for (const match of source.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
        const name = match[1];
        if (!usage.has(name)) usage.set(name, new Set());
        usage.get(name).add(path.relative(ROOT, file));
      }
    }
  }
  return usage;
}

/** Any `--x:` in a stylesheet defines it — at :root, in a theme block, or on a class. */
function collectDefinitions() {
  const defined = new Set();
  for (const sheet of STYLESHEETS) {
    const full = path.join(ROOT, sheet);
    if (!fs.existsSync(full)) continue;
    for (const match of fs.readFileSync(full, "utf8").matchAll(/(--[a-z0-9-]+)\s*:/g)) {
      defined.add(match[1]);
    }
  }
  return defined;
}

test("every custom property a component uses without a fallback is defined", () => {
  const usage = collectUsage();
  const defined = collectDefinitions();
  const missing = [...usage.keys()]
    .filter((name) => !defined.has(name) && !INJECTED_AT_RUNTIME.has(name))
    .sort();

  const detail = missing
    .map((name) => `${name} (${usage.get(name).size} files, e.g. ${[...usage.get(name)][0]})`)
    .join("\n  ");
  assert.deepEqual(missing, [], `custom properties used but never defined:\n  ${detail}`);
});

test("the four names the components were actually written against resolve", () => {
  // Named one by one so a regression says which alias went missing rather than
  // handing back a list to read.
  const tokens = fs.readFileSync(path.join(ROOT, "src/styles/tokens.css"), "utf8");
  for (const alias of ["--accent", "--accent-soft", "--color-error", "--color-error-soft", "--color-accent-soft"]) {
    assert.match(tokens, new RegExp(`^\\s*${alias}\\s*:`, "m"), `${alias} is used across the app and must be defined`);
  }
});

test("the aliases follow the theme rather than pinning one theme's colour", () => {
  // `--color-error: #dc2626` would look right in light and wrong in dark. The
  // alias has to point at the token, so it picks up whichever value is in force
  // where it is used.
  const tokens = fs.readFileSync(path.join(ROOT, "src/styles/tokens.css"), "utf8");
  assert.match(tokens, /--color-error:\s*var\(--color-danger\)/);
  assert.match(tokens, /--color-error-soft:\s*var\(--color-danger-soft\)/);
  assert.match(tokens, /--accent:\s*var\(--color-accent\)/);
  assert.match(tokens, /--accent-soft:\s*color-mix\(in srgb, var\(--color-accent\)/);

  // And the tokens they point at must still be redefined for dark, or the
  // aliases would follow nothing.
  const dark = tokens.slice(tokens.indexOf('[data-theme="dark"]'));
  for (const token of ["--color-danger", "--color-danger-soft", "--color-accent", "--color-surface"]) {
    assert.match(dark, new RegExp(`^\\s*${token}\\s*:`, "m"), `${token} must have a dark value for the alias to be worth anything`);
  }
});
