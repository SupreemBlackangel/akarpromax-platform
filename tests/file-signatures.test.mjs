import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { matchesFileSignature, detectFileType } from "../lib/security/file-signatures.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * What a file actually is.
 *
 * A browser's File.type and a filename's extension are both written by whoever
 * sent the file. Only the content says what it really contains, so every upload
 * path checks the leading bytes against the declared type.
 *
 * That check existed FIVE times over, and the copies had already diverged: two
 * checked four bytes of the PNG signature where three checked all eight, one
 * knew the video containers and the others did not, and one fell through to the
 * JPEG test for any type it did not recognise -- answering "yes, that is a
 * valid X" for formats it had never heard of.
 *
 * Five copies of a security check is five places for it to be weakened by
 * accident.
 */

const bytes = (...values) => new Uint8Array(values);

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0);
const MP4 = bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0);
const WEBM = bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0);
const OGG = bytes(0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0);

// ---- each type is recognised ------------------------------------------------

test("every supported type is recognised by its signature", () => {
  assert.ok(matchesFileSignature(PNG, "image/png"));
  assert.ok(matchesFileSignature(JPEG, "image/jpeg"));
  assert.ok(matchesFileSignature(WEBP, "image/webp"));
  assert.ok(matchesFileSignature(GIF, "image/gif"));
  assert.ok(matchesFileSignature(MP4, "video/mp4"));
  assert.ok(matchesFileSignature(WEBM, "video/webm"));
  assert.ok(matchesFileSignature(OGG, "video/ogg"));
});

test("a file is not accepted as a type it is not", () => {
  // The whole point: a PNG renamed and declared as a JPEG is refused.
  assert.equal(matchesFileSignature(PNG, "image/jpeg"), false);
  assert.equal(matchesFileSignature(JPEG, "image/png"), false);
  assert.equal(matchesFileSignature(WEBP, "image/png"), false);
  assert.equal(matchesFileSignature(MP4, "image/png"), false);
});

test("an unknown type is refused, never fallen through", () => {
  // One of the five copies used the JPEG test as its fallback, so it answered
  // "yes" for any type it did not know -- which is how a check becomes
  // decoration.
  for (const type of ["image/svg+xml", "text/html", "application/pdf", "", "png", "anything"]) {
    assert.equal(matchesFileSignature(JPEG, type), false, `${type} must not be accepted`);
  }
});

test("HTML declared as an image is refused", () => {
  // The attack this exists to stop: a file that a browser will execute,
  // uploaded as an image and served back from this origin.
  const html = new TextEncoder().encode("<html><script>alert(1)</script>");
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');

  for (const payload of [html, svg]) {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      assert.equal(matchesFileSignature(payload, type), false);
    }
  }
});

// ---- the PNG signature is checked in full -----------------------------------

test("a PNG truncated after four signature bytes is refused", () => {
  // Two of the five copies stopped after PNG's first four bytes. The remaining
  // four (\\r\\n\\x1a\\n) exist to catch a file mangled by a text-mode transfer,
  // so dropping them throws away the part that detects corruption.
  const mangled = bytes(0x89, 0x50, 0x4e, 0x47, 0x0a, 0x0a, 0x1a, 0x0a);
  assert.equal(matchesFileSignature(mangled, "image/png"), false);
  assert.ok(matchesFileSignature(PNG, "image/png"));
});

test("a file shorter than the signature is refused rather than read past its end", () => {
  for (const short of [bytes(), bytes(0x89), bytes(0x89, 0x50, 0x4e)]) {
    assert.equal(matchesFileSignature(short, "image/png"), false);
  }
  assert.equal(matchesFileSignature(bytes(0x52, 0x49, 0x46, 0x46), "image/webp"), false);
});

test("webp and mp4 are identified by markers that are not at byte zero", () => {
  // A check that only looks at the start cannot see either.
  assert.equal(detectFileType(WEBP), "image/webp");
  assert.equal(detectFileType(MP4), "video/mp4");
});

// ---- detection --------------------------------------------------------------

test("detection can be narrowed to what a caller accepts", () => {
  // An upload path that takes images must not accept a video because the bytes
  // happen to be a valid one.
  assert.equal(detectFileType(MP4, ["image/png", "image/jpeg", "image/webp"]), null);
  assert.equal(detectFileType(PNG, ["image/png", "image/jpeg"]), "image/png");
});

test("unrecognised content detects as nothing", () => {
  assert.equal(detectFileType(new TextEncoder().encode("just text")), null);
  assert.equal(detectFileType(bytes()), null);
});

// ---- there is one implementation --------------------------------------------

test("no upload path carries its own signature table", async () => {
  // The divergence this consolidation exists to prevent. A second table is a
  // second thing to weaken.
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
      } else if (entry.name.endsWith(".ts")) {
        if (rel === "lib/security/file-signatures.ts") continue;
        const source = await read(rel);
        // The PNG magic number written out in a file that is not the one place
        // it belongs.
        if (/0x89[^)]{0,20}0x50[^)]{0,20}0x4e[^)]{0,20}0x47/.test(source)) offenders.push(rel);
      }
    }
  }
  for (const root of ["app", "lib", "src"]) await sweep(root);

  assert.deepEqual(offenders, [], "these files carry their own signature bytes");
});

test("every upload path that validates a signature uses the shared check", async () => {
  for (const file of [
    "lib/integration/office-media.ts",
    "lib/integration/desktop-property-publish.ts",
    "lib/properties/image-processing.ts",
    "app/api/ad-assets/route.ts",
  ]) {
    const source = await read(file);
    assert.match(source, /matchesFileSignature/, `${file} does not use the shared check`);
  }
});
