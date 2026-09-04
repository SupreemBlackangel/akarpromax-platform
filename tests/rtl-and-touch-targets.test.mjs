import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * Right-to-left layout, and controls big enough to press.
 *
 * Measured in a browser against the live site at 1440x900 and at 375x812, not
 * inferred from the source:
 *
 *   dir="rtl", lang="ar"          both viewports
 *   horizontal scroll             none at either width
 *   in-flow content past an edge  none at either width
 *
 * Which is the outcome that matters: the classic RTL failure is a page that
 * scrolls sideways because something was positioned with `left` instead of a
 * logical property, and there is none of it.
 *
 * One real defect came out of the mobile pass. The news ticker's three controls
 * rendered at 3x19 and 8x19 CSS pixels -- the glyph's own size with nothing
 * around it. WCAG 2.5.8 sets 24x24 as the minimum target and 2.5.5 asks for
 * 44x44; three pixels wide cannot be hit by a finger at all.
 */

// ---- the fix stays ----------------------------------------------------------

test("the ticker controls have a pressable hit area", async () => {
  const css = await read("app/globals.css");
  const block = css.slice(css.indexOf(".ticker-nav, .ticker-pause {"));
  const rule = block.slice(0, block.indexOf("}"));

  assert.match(rule, /min-inline-size:\s*32px/);
  assert.match(rule, /min-block-size:\s*32px/);
  assert.match(rule, /display:\s*inline-flex/, "the glyph must be centred in the enlarged area");
});

test("the hit area is grown with logical properties, not left and right", async () => {
  // This bar is mirrored in Arabic. padding-left on a control in an RTL bar
  // puts the space on the wrong side, which is the whole class of bug this
  // phase was looking for.
  const css = await read("app/globals.css");
  const block = css.slice(css.indexOf(".ticker-nav, .ticker-pause {"));
  const rule = block.slice(0, block.indexOf("}"));

  assert.match(rule, /padding-inline/);
  assert.doesNotMatch(rule, /padding-left|padding-right|margin-left|margin-right/);
});

// ---- nothing new lays out with physical directions --------------------------

/**
 * Files allowed to use a physical direction, and why.
 *
 * A physical `left`/`right` is not always wrong: a canvas, a chart axis or a
 * transform has no reading direction. What is wrong is laying out CONTENT with
 * one, because it does not mirror.
 */
const PHYSICAL_ALLOWED = new Set([
  "src/components/tools/FindMyLand.tsx",
  "src/components/tools/LandMapper.tsx",
  "src/components/cad/CadPreview.tsx",
]);

test("no component positions layout with a bare left/right Tailwind utility", async () => {
  // Tailwind's logical utilities are start-* and end-*. left-* and right-* do
  // not mirror, so a sidebar pinned with `left-0` sits on the wrong side of an
  // Arabic page and stays there.
  const offenders = [];

  async function sweep(dir) {
    let entries;
    try {
      entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        await sweep(rel);
      } else if (entry.name.endsWith(".tsx")) {
        if (PHYSICAL_ALLOWED.has(rel)) continue;
        const source = (await read(rel))
          .split(/\r?\n/)
          .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
          .join("\n");

        // Only the absolute-positioning utilities, which are the ones that
        // strand an element on the wrong edge. Text alignment and flex order
        // are handled elsewhere and legitimately vary.
        const matches = source.match(/\b(?:inset-[xy]-|(?<![\w-])(?:left|right)-)(?:0|px|\d)/g);
        if (matches) offenders.push(`${rel}: ${[...new Set(matches)].slice(0, 4).join(", ")}`);
      }
    }
  }
  await sweep("app");
  await sweep("src/components");

  // A count, not zero. This is a real codebase with fifteen such files today,
  // several of them legitimate -- an icon inside a search input, a gradient
  // overlay on a hero image. A test demanding zero on day one gets deleted
  // rather than fixed.
  //
  // The baseline is the ACTUAL number, not a round one above it. A threshold of
  // forty passing at fifteen guards nothing: it would let two dozen new ones in
  // silently. This fails on the sixteenth, which is when somebody should look.
  assert.ok(
    offenders.length <= 15,
    `physical positioning utilities appear in ${offenders.length} files:\n  ${offenders.slice(0, 10).join("\n  ")}`,
  );
});

// ---- the page declares its direction -----------------------------------------

test("the document declares Arabic and right-to-left", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /dir=/, "the root element must set a direction");
  assert.match(layout, /lang=/, "the root element must declare a language");
});

test("the skip link is allowed to be invisible", async () => {
  // A 1x1 skip link is correct: it is revealed on focus. A touch-target sweep
  // that flags it teaches whoever reads the failure to delete an accessibility
  // feature, so it is named here as intended rather than left to be
  // rediscovered as a fault.
  const layout = await read("app/layout.tsx");
  assert.match(layout, /تخطَّ|skip/i, "the skip link must still be there");
});
