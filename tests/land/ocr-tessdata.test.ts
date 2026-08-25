import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { resolveTessdata } from "@/lib/land/ocr/tessdata";

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  delete process.env.AKARPROMAX_TESSDATA_PATH;
});

describe("OCR language-model availability", () => {
  it("uses an operator-provided directory and drops what it lacks", () => {
    const dir = mkdtempSync(join(tmpdir(), "tess-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, "eng.traineddata.gz"), "x");
    writeFileSync(join(dir, "ara.traineddata.gz"), "x");
    process.env.AKARPROMAX_TESSDATA_PATH = dir;

    const resolution = resolveTessdata("ara+eng+tur");
    assert.equal(resolution.source, "ENV");
    assert.equal(resolution.langPath, dir);
    assert.equal(resolution.languages, "ara+eng");
    assert.deepEqual(resolution.dropped.map((entry) => entry.language), ["tur"]);
  });

  it("falls back to English rather than nothing when the directory is empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "tess-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    process.env.AKARPROMAX_TESSDATA_PATH = dir;

    const resolution = resolveTessdata("tur+eng");
    assert.equal(resolution.languages, "eng");
    assert.equal(resolution.dropped.length, 2);
  });

  it("never throws for any language string", () => {
    for (const languages of ["", "xx", "ara+eng+tur", "eng"]) {
      assert.doesNotThrow(() => resolveTessdata(languages));
    }
  });

  it("resolves to a concrete source", () => {
    const resolution = resolveTessdata("ara+eng");
    assert.ok(["ENV", "LOCAL_BUNDLE", "CDN"].includes(resolution.source));
    assert.ok(resolution.languages.length > 0);
  });
});
