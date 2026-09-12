// A data table wider than a phone has two honest options: scroll inside its
// own box, or reflow. It has one dishonest one: a wrapper with
// `overflow-hidden`, which keeps the rounded corners and quietly cuts off
// the last columns — the action buttons, usually — with no scrollbar and no
// hint that anything is missing. Six admin tables did that and three more
// had no container at all, so the whole page scrolled sideways.
//
// Every <table> under app/admin now sits directly inside an element that
// scrolls horizontally. This keeps it so.
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

// The ways this codebase spells "scrolls sideways".
const SCROLLS = /overflow-x-auto|overflow-auto|overflowX: "auto"|roles-matrix-wrap/;

test("every admin table sits in a container that scrolls, not one that clips", async () => {
  const offenders = [];
  let tables = 0;
  for await (const file of walk(ADMIN)) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!/<table\b/.test(line)) return;
      tables += 1;
      // The container is the nearest preceding element: the same line up to
      // the tag (one-line JSX), plus two lines above — enough for `<div ...>`
      // on its own line with a `) : (` between.
      const above = [...lines.slice(Math.max(0, index - 2), index), line.slice(0, line.indexOf("<table"))].join("\n");
      const where = `${path.relative(process.cwd(), file).replace(/\\/g, "/")}:${index + 1}`;
      if (/overflow-hidden/.test(above)) offenders.push(`${where}: wrapped in overflow-hidden (clips columns)`);
      else if (!SCROLLS.test(above)) offenders.push(`${where}: no scrolling container`);
    });
  }
  assert.ok(tables >= 20, `expected the admin's tables to be found, saw ${tables}`);
  assert.deepEqual(offenders, []);
});
