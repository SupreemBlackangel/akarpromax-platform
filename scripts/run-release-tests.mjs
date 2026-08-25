#!/usr/bin/env node
/**
 * AkarProMax release test discovery + runner (L0).
 *
 * Replaces the previous hard-coded 19-file `npm test` list with automatic,
 * deterministic, cross-platform discovery of every real test entry file.
 *
 * Usage:
 *   node scripts/run-release-tests.mjs            # discover + run
 *   node scripts/run-release-tests.mjs --list     # discover + print only
 *   node scripts/run-release-tests.mjs --list --json
 *
 * Discovery rules:
 *   - recursive walk of tests/
 *   - include *.test.{mjs,js,cjs,jsx,ts,tsx} and *.spec.{mjs,js,cjs,jsx,ts,tsx}
 *   - include the legacy named entry tests/services-e2e.mjs
 *   - exclude tests/helpers/**, fixtures, __fixtures__, __mocks__, snapshots,
 *     generated output, node_modules, dot-directories
 *   - stable deterministic sort (POSIX-style relative paths, byte order)
 *
 * No shell glob expansion is used, so it behaves identically on Windows.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TESTS_DIR = path.join(ROOT, "tests");

const TEST_FILE_RE = /\.(test|spec)\.(mjs|cjs|js|jsx|ts|tsx)$/i;

/** Legacy entry points that do not match the *.test.* naming convention. */
const LEGACY_ENTRIES = ["tests/services-e2e.mjs"];

/** Directory names that never contain runnable test entries. */
const EXCLUDED_DIR_NAMES = new Set([
  "helpers",
  "helper",
  "fixtures",
  "__fixtures__",
  "__mocks__",
  "__snapshots__",
  "mocks",
  "snapshots",
  "support",
  "utils",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  "generated",
  "__generated__",
]);

/** Type-declaration / non-executable files. */
const EXCLUDED_FILE_RE = /\.d\.ts$/i;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function walk(dir, out, excluded) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || EXCLUDED_DIR_NAMES.has(entry.name.toLowerCase())) {
        excluded.push(toPosix(path.relative(ROOT, abs)) + "/**");
        continue;
      }
      walk(abs, out, excluded);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = toPosix(path.relative(ROOT, abs));
    if (EXCLUDED_FILE_RE.test(entry.name)) {
      excluded.push(rel);
      continue;
    }
    if (TEST_FILE_RE.test(entry.name)) {
      out.push(rel);
      continue;
    }
    if (!LEGACY_ENTRIES.includes(rel)) excluded.push(rel);
  }
}

export function discoverTestEntries() {
  const found = [];
  const excluded = [];
  walk(TESTS_DIR, found, excluded);

  for (const legacy of LEGACY_ENTRIES) {
    const abs = path.join(ROOT, legacy);
    if (fs.existsSync(abs) && !found.includes(legacy)) found.push(legacy);
  }

  // Stable deterministic sort: plain byte-order on POSIX-style relative paths.
  found.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  excluded.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { entries: found, excluded };
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const listOnly = argv.includes("--list");
  const asJson = argv.includes("--json");
  const passthrough = argv.filter((a) => a !== "--list" && a !== "--json");

  const { entries, excluded } = discoverTestEntries();

  if (asJson) {
    process.stdout.write(JSON.stringify({ count: entries.length, entries, excluded }, null, 2) + "\n");
  } else {
    console.log(`[release-tests] discovered ${entries.length} test entry file(s) under tests/`);
    for (const entry of entries) console.log(`  ${entry}`);
    if (excluded.length) {
      console.log(`[release-tests] excluded ${excluded.length} support/non-test path(s):`);
      for (const entry of excluded) console.log(`  - ${entry}`);
    }
  }

  if (listOnly) process.exit(0);

  if (entries.length === 0) {
    console.error("[release-tests] no test entry files discovered — refusing to report success.");
    process.exit(1);
  }

  const nodeArgs = ["--import", "tsx", "--test", ...passthrough, ...entries];
  console.log(`[release-tests] node ${nodeArgs.slice(0, 3).join(" ")} <${entries.length} files>`);

  const child = spawn(process.execPath, nodeArgs, { cwd: ROOT, stdio: "inherit" });
  child.on("error", (err) => {
    console.error(`[release-tests] failed to start node test runner: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[release-tests] test runner terminated by signal ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}
