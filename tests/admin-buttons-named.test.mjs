// A button's accessible name is what a screen reader announces and what
// voice control matches. Most admin buttons carry a visible word and need
// nothing more. Two kinds did not:
//
//   - icon-only buttons (×, ▲, ▼) announced as nothing, or as "times";
//   - the per-row "delete" / "archive" / "remove" buttons, one per campaign,
//     asset, advertiser, category, user — all announced identically, so a
//     reader hears "delete, button" twenty times with no way to tell which
//     row is which.
//
// Both now carry aria-label; the destructive ones name their subject. This
// file keeps it that way across app/admin.
import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ADMIN = fileURLToPath(new URL("../app/admin", import.meta.url));

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".tsx")) yield full;
  }
}

function rel(file) {
  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

// Every <button ...>...</button> as [attrs, inner]. Not a regex: the opening
// tag contains `=>` inside `onClick={() => …}`, so `[^>]*` cuts every one of
// them short and a naive matcher sees nothing. Braces are counted instead.
function* buttons(source) {
  let from = 0;
  for (;;) {
    const open = source.indexOf("<button", from);
    if (open === -1) return;
    let i = open + "<button".length;
    let depth = 0;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) break;
    }
    const attrs = source.slice(open + "<button".length, i);
    const close = source.indexOf("</button>", i);
    if (close === -1) return;
    yield [attrs, source.slice(i + 1, close)];
    from = close;
  }
}

test("icon-only buttons have an accessible name", async () => {
  const offenders = [];
  for await (const file of walk(ADMIN)) {
    const source = await readFile(file, "utf8");
    for (const [attrs, inner] of buttons(source)) {
      // Visible text, with child tags and JSX expressions removed. An
      // expression counts as text when it carries a string literal or reads
      // a field named like one (confirmLabel, nameAr included) — `{label}`, `{t.label}`, `{o.nameAr ?? o.nameEn}`,
      // `{language.toUpperCase()}`.
      const text = inner.replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "").trim();
      const expressions = inner.match(/\{[^}]*\}/g) ?? [];
      const hasWord =
        /[\p{L}\p{N}]{2,}/u.test(text) ||
        expressions.some((e) => /["'`]/.test(e) || /label|name|title|value|toUpperCase/i.test(e));
      if (!hasWord && !/aria-label/.test(attrs)) {
        offenders.push(`${rel(file)}: <button ${attrs.trim().slice(0, 60)}>${text}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "these buttons show only a symbol and carry no aria-label");
});

test("per-row destructive buttons name their subject", async () => {
  const offenders = [];
  for await (const file of walk(ADMIN)) {
    const source = await readFile(file, "utf8");
    for (const [attrs] of buttons(source)) {
      if (!/className=\{?"[^"]*\bdanger\b/.test(attrs)) continue;
      // A danger button whose handler is handed a row's id acts on one of
      // many identical rows.
      if (!/\.id[,)]/.test(attrs)) continue;
      if (!/aria-label=\{`[^`]*\$\{/.test(attrs)) offenders.push(`${rel(file)}: ${attrs.trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(offenders, [], "a row's destructive button must say which row in its aria-label");
});
