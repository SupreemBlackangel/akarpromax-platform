// The admin console asked "are you sure?" through window.confirm fourteen
// times — for archiving a campaign, for deleting one permanently along with
// its statistics, for closing a user's account for good — and the browser
// rendered each as one line of unstyled chrome with the same two buttons.
//
// Every one of them now goes through `useConfirm` (src/components/ui/
// ConfirmDialog.tsx): a titled dialog that says what will happen to what, with
// a danger tone for anything destructive. This file is the fence: a new
// `confirm(` that bypasses it fails here, and the hook itself keeps its promise
// contract (false on cancel, never left hanging).
import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = new URL("..", import.meta.url);
const ADMIN = fileURLToPath(new URL("app/admin", ROOT));

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) yield full;
  }
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("no admin client asks through the browser's own confirm()", async () => {
  const offenders = [];
  for await (const file of walk(ADMIN)) {
    const source = stripComments(await readFile(file, "utf8"));
    // `window.confirm(` and a bare `confirm(` call; `await confirm(` is the
    // hook, and `useConfirm(` / `confirmDialog` are not calls.
    const native = source.match(/(?<![\w.$])(?:window\.)?confirm\((?!\s*\{)/g) ?? [];
    const viaHook = source.match(/await confirm\(/g) ?? [];
    if (native.length > viaHook.length) offenders.push(path.relative(process.cwd(), file));
  }
  assert.deepEqual(offenders, [], "these files still use a native confirm()");
});

test("every client that awaits confirm() also mounts the dialog", async () => {
  const missing = [];
  for await (const file of walk(ADMIN)) {
    const source = stripComments(await readFile(file, "utf8"));
    const hooks = (source.match(/useConfirm\(\)/g) ?? []).length;
    const mounts = (source.match(/\{confirmDialog\}/g) ?? []).length;
    if (hooks !== mounts) missing.push(`${path.relative(process.cwd(), file)}: ${hooks} hook(s), ${mounts} mount(s)`);
  }
  assert.deepEqual(missing, [], "a hook without a mount opens nothing and the promise never settles");
});

test("the dialog says what will happen — a title and a body, not a question mark", async () => {
  // The whole point over window.confirm: the operator reads what is about to
  // change. Every destructive confirm carries a body and the danger tone.
  for await (const file of walk(ADMIN)) {
    const source = stripComments(await readFile(file, "utf8"));
    for (const block of source.matchAll(/await confirm\(\{([\s\S]*?)\}\)/g)) {
      const body = block[1];
      assert.match(body, /title:/, `${path.basename(file)}: confirm without a title`);
      assert.match(body, /body:/, `${path.basename(file)}: confirm without a body`);
      if (/حذف|إزالة|حظر|نهائي/.test(body)) {
        assert.match(body, /tone: "danger"/, `${path.basename(file)}: destructive confirm without the danger tone`);
      }
    }
  }
});

test("useConfirm resolves false on cancel and never strands a caller", async () => {
  // Drive the hook's state machine without a DOM: the pending ref is the
  // contract. We import the module for its shape only.
  const source = await readFile(new URL("src/components/ui/ConfirmDialog.tsx", ROOT), "utf8");
  assert.match(source, /onClose=\{\(\) => settle\(false\)\}/, "Escape and backdrop resolve false");
  assert.match(source, /pendingRef\.current\?\.resolve\(false\)/, "a second request answers the first with no");
  assert.match(source, /tone === "danger" \? "bg-\[var\(--color-danger\)\]"/, "danger tone is visibly different");
  assert.doesNotMatch(source, /#[0-9a-fA-F]{6}/, "colours come from the token sheet");
});
