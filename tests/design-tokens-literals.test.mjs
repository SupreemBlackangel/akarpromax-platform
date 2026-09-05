import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * Where a colour is allowed to be written out by hand.
 *
 * Separate from design-tokens.test.mjs, which owns the palette itself: its
 * semantic set, the spacing, radius, shadow, typography, motion and layer
 * scales, WCAG AA contrast in both themes, the reduced-motion block and z-index
 * layering. That file is not duplicated here.
 *
 * This one is only about literals appearing beside those tokens. The design
 * system already existed and was thorough; what was missing was anything
 * stopping a hex value being written next to it. A literal that happens to
 * match a token today drifts the moment the token changes, and the two then
 * disagree with nothing to say which is right.
 *
 * Some literals must stay, and every exemption below carries its reason. A file
 * is not exempt because it is inconvenient to fix.
 */

const ALLOWED = new Map([
  [
    "app/login/page.tsx",
    "Facebook and Google brand colours on the OAuth buttons. Both companies " +
      "specify exact values in their brand guidelines; tokenising them would " +
      "make the buttons wrong, not consistent.",
  ],
  [
    "app/register/page.tsx",
    "The same Facebook and Google brand colours as the sign-in page.",
  ],
  [
    "app/global-error.tsx",
    "The global error boundary. It renders when the application has failed, " +
      "possibly before the stylesheet loaded, so it cannot depend on a CSS " +
      "variable defined in a file that may not be there. The values are copied " +
      "from the tokens on purpose.",
  ],
  [
    "src/components/cad/CadLayersPanel.tsx",
    "The AutoCAD layer colour palette. These are fixed indices in the DXF " +
      "format, not design choices.",
  ],
  [
    "src/components/cad/CadPreview.tsx",
    "Canvas drawing colours. A canvas takes a colour string, not a variable.",
  ],
  [
    "src/components/tools/FindMyLand.tsx",
    "Map overlay colours passed to the drawing layer, which takes strings.",
  ],
  [
    "src/components/tools/LandMapper.tsx",
    "Map overlay colours passed to the drawing layer, which takes strings.",
  ],
  [
    "app/tools/find-my-land/land-map.tsx",
    "Map overlay colours passed to the drawing layer, which takes strings.",
  ],
  [
    "components/properties/PropertyDetailMapLeaflet.tsx",
    "Marker and polygon colours handed to the map layer, which takes a colour " +
      "string and cannot resolve a CSS variable.",
  ],
  [
    "components/properties/PropertyLocationMapLeaflet.tsx",
    "Marker colours handed to the map layer, which takes a colour string.",
  ],
  [
    "src/components/services/ServiceLocationPickerLeaflet.tsx",
    "Marker colours handed to the map layer, which takes a colour string.",
  ],
  [
    "src/components/tools/PdfToWord.tsx",
    "A page background written into the generated document, not onto the site.",
  ],
]);

async function tsxFiles() {
  const found = [];
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
        found.push(rel);
      }
    }
  }
  for (const root of ["app", "src", "components"]) await sweep(root);
  return found;
}

test("no component writes a hex colour without a recorded reason", async () => {
  const offenders = [];

  for (const file of await tsxFiles()) {
    if (ALLOWED.has(file)) continue;

    // Comments are stripped first. Several files explain, on purpose, which
    // literal they replaced -- a sweep that reads its own explanation as the
    // offence teaches whoever hits it to delete the explanation.
    const source = (await read(file))
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");

    const matches = source.match(/#[0-9a-fA-F]{6}\b/g);
    if (matches) offenders.push(`${file}: ${[...new Set(matches)].join(", ")}`);
  }

  assert.deepEqual(
    offenders,
    [],
    "these files write colour by hand; use a token from src/styles/tokens.css, " +
      "or add the file to ALLOWED with the reason it must be literal",
  );
});

test("every exemption is still needed", async () => {
  // An exemption that no longer applies is a hole somebody can walk through
  // without noticing. If a file stops containing literals, it stops being
  // exempt.
  const stale = [];
  for (const file of ALLOWED.keys()) {
    let source;
    try {
      source = await read(file);
    } catch {
      stale.push(`${file} (deleted)`);
      continue;
    }
    if (!/#[0-9a-fA-F]{6}\b/.test(source)) stale.push(`${file} (no literals left)`);
  }
  assert.deepEqual(stale, [], "remove these from ALLOWED");
});

test("every exemption states a reason", async () => {
  for (const [file, reason] of ALLOWED) {
    assert.ok(reason.length > 40, `${file} is exempt without a real explanation`);
  }
});

// ---- the specific fixes stay fixed ------------------------------------------

test("the toast uses feedback colours, not a heading colour", async () => {
  // Success was #0b214c -- the dark navy used for body text -- and failure was
  // a red the palette does not contain. A toast reporting success looked like a
  // heading, and one reporting failure matched no other error on the site.
  const source = await read("src/components/FloatingAdSlotActions.tsx");
  assert.match(source, /var\(--color-success\)/);
  assert.match(source, /var\(--color-danger\)/);
});

test("the brand gradient comes from the brand tokens", async () => {
  const source = await read("app/service-bookings/new/page.tsx");
  assert.match(source, /var\(--brand-navy\)/);
  assert.match(source, /var\(--color-primary\)/);
});

test("a variable fallback agrees with the token it falls back from", async () => {
  // app/download had bg-[var(--color-accent,#eab308)]. The token is #d8af55, so
  // if it were ever missing the page would render a different yellow -- a
  // fallback that disagrees with what it replaces is worse than no fallback,
  // because it hides the failure.
  const source = await read("app/download/page.tsx");
  assert.doesNotMatch(source, /var\(--color-accent,\s*#/);
});
