import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkDocumentSecurity } from "@/lib/geo/security-gate";

type Upload = Parameters<typeof checkDocumentSecurity>[0];
const upload = (fileName: string, mimeType = "image/jpeg"): Upload =>
  ({ fileName, mimeType, sizeBytes: 900_000 }) as Upload;

describe("Find My Land accepted upload types", () => {
  describe(".jfif", () => {
    /**
     * JFIF is an ordinary JPEG. Windows and Edge save photographs under this
     * extension, so survey sketches photographed on a phone and downloaded
     * from a browser routinely arrive as .jfif.
     */
    it("is accepted when the browser reports image/jpeg", () => {
      const result = checkDocumentSecurity(upload("survey.jfif"));
      assert.equal(result.passed, true, result.reason);
      assert.equal(result.normalizedMime, "image/jpeg");
    });

    it("is accepted when the browser reports no MIME type at all", () => {
      // Windows frequently hands over an empty type for .jfif; the extension
      // must be enough on its own.
      const result = checkDocumentSecurity(upload("survey.jfif", ""));
      assert.equal(result.passed, true, result.reason);
      assert.equal(result.normalizedMime, "image/jpeg");
    });

    it("is accepted regardless of extension case", () => {
      assert.equal(checkDocumentSecurity(upload("SURVEY.JFIF")).passed, true);
      assert.equal(checkDocumentSecurity(upload("Survey.Jfif")).passed, true);
    });
  });

  describe("the previously supported types still pass", () => {
    for (const [name, mime] of [
      ["deed.pdf", "application/pdf"],
      ["sketch.png", "image/png"],
      ["sketch.jpg", "image/jpeg"],
      ["sketch.jpeg", "image/jpeg"],
      ["sketch.webp", "image/webp"],
    ] as const) {
      it(name, () => {
        assert.equal(checkDocumentSecurity(upload(name, mime)).passed, true);
      });
    }
  });

  describe("widening the list did not widen it too far", () => {
    it("still blocks an executable", () => {
      const result = checkDocumentSecurity(upload("payload.exe", "application/octet-stream"));
      assert.equal(result.passed, false);
    });

    it("still blocks a script", () => {
      assert.equal(checkDocumentSecurity(upload("payload.js", "text/javascript")).passed, false);
    });

    it("still blocks an archive disguised with a coordinate-ish name", () => {
      assert.equal(checkDocumentSecurity(upload("coordinates.bat", "application/octet-stream")).passed, false);
    });
  });
});
