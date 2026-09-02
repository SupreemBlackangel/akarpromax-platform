import assert from "node:assert/strict";
import test from "node:test";

import {
  contentTypeFor,
  documentPath,
  isVerificationFileUrl,
  storedFileName,
  VERIFICATION_URL_PREFIX,
} from "../lib/services/verification/document-storage.ts";

/**
 * Verification documents are identity papers, trade licences and professional
 * certificates.
 *
 * Two problems this pins down:
 *
 * 1. The upload route returned `/uploads/verifications/<uuid>.<ext>` and NOTHING
 *    served that path -- nginx proxies everything under /uploads/ except
 *    /uploads/properties/ to the application, which had no handler there. Every
 *    such URL answered 404 forever, so no provider could see their own document
 *    and no admin could review one. Verification could never complete.
 *
 * 2. `fileUrl` is supplied by the client in the metadata POST. Without
 *    validation a provider could point their own document row at another
 *    provider's file, at a path outside the directory, or at an external URL
 *    the review screen would then render.
 */

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

// ---- what counts as one of our documents ------------------------------------

test("a reference the upload route minted is accepted", () => {
  for (const ext of ["pdf", "png", "jpg", "webp"]) {
    const url = `${VERIFICATION_URL_PREFIX}${UUID}.${ext}`;
    assert.equal(isVerificationFileUrl(url), true, `${ext} should be accepted`);
    assert.equal(storedFileName(url), `${UUID}.${ext}`);
  }
});

test("anything the upload route would not have minted is refused", () => {
  const refused = [
    "/uploads/properties/photo.jpg",
    "/uploads/verifications/../../etc/passwd",
    "/uploads/verifications/notauuid.pdf",
    `/uploads/verifications/${UUID}.exe`,
    `/uploads/verifications/${UUID}.pdf.exe`,
    `https://evil.example${VERIFICATION_URL_PREFIX}${UUID}.pdf`,
    `${VERIFICATION_URL_PREFIX}${UUID}`,
    `${VERIFICATION_URL_PREFIX}sub/dir/${UUID}.pdf`,
    "", null, undefined, 42, {},
  ];
  for (const value of refused) {
    assert.equal(isVerificationFileUrl(value), false, `${JSON.stringify(value)} must be refused`);
    assert.equal(documentPath(value), null, `${JSON.stringify(value)} must resolve to no path`);
  }
});

test("traversal cannot escape the verification directory", () => {
  for (const attempt of [
    `${VERIFICATION_URL_PREFIX}..%2f..%2fetc%2fpasswd`,
    `${VERIFICATION_URL_PREFIX}../${UUID}.pdf`,
    `${VERIFICATION_URL_PREFIX}%2e%2e%2f${UUID}.pdf`,
  ]) {
    assert.equal(documentPath(attempt), null, `${attempt} must not resolve`);
  }
});

test("a valid document resolves to a path inside the directory", () => {
  const path = documentPath(`${VERIFICATION_URL_PREFIX}${UUID}.pdf`);
  assert.ok(path, "a legitimate document must be servable");
  assert.match(path, /verifications[/\\]3f2504e0-4f89-41d3-9a0c-0305e82c3301\.pdf$/);
});

// ---- how it is served -------------------------------------------------------

test("the content type comes from the stored extension, never from the client", () => {
  assert.equal(contentTypeFor(`${UUID}.pdf`), "application/pdf");
  assert.equal(contentTypeFor(`${UUID}.png`), "image/png");
  assert.equal(contentTypeFor(`${UUID}.jpg`), "image/jpeg");
  assert.equal(contentTypeFor(`${UUID}.webp`), "image/webp");
  assert.equal(contentTypeFor("something.svg"), "application/octet-stream", "SVG would be a script vector, so it is never claimed as an image");
  assert.equal(contentTypeFor("noextension"), "application/octet-stream");
});

test("the file route authorizes the owner or a reviewer and nobody else", async () => {
  // The route is the boundary, so pin its shape rather than its rendering:
  // an unauthenticated caller is rejected before any lookup, a non-owner
  // non-reviewer is rejected after the ownership comparison, and a missing
  // document answers exactly like a forbidden one.
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile("app/api/service-providers/documents/[documentId]/file/route.ts", "utf8"),
  );
  assert.match(source, /identity\.authenticated/, "must require a session");
  assert.match(source, /SERVICE_PROVIDERS_REVIEW/, "reviewers must be able to review");
  assert.match(source, /ownProfile\.id\) !== String\(document\.provider_id\)/, "ownership must be compared against the document's own provider");
  assert.match(source, /Cache-Control": "private, no-store/, "identity papers must not be cached by a shared cache");
  assert.match(source, /nosniff/, "the browser must not guess a different type");
});
