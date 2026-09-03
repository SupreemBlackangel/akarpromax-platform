import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  verifyFacebookSignedRequest,
  newDeletionConfirmationCode,
} from "../lib/auth/facebook-signed-request.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * The Facebook data-deletion callback.
 *
 * Facebook requires every app that reads user data to offer a way to delete it,
 * and posts a signed_request to the callback when somebody removes the app from
 * their account. The endpoint must be public and unauthenticated, because the
 * request comes from Facebook rather than from a signed-in browser -- so the
 * signature is the entire security of the mechanism. Without it, the endpoint
 * would delete any account named by anyone able to send it a POST.
 */

const SECRET = "test-app-secret";

const b64url = (buffer) =>
  Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sign(payload, secret = SECRET) {
  const encoded = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest();
  return `${b64url(signature)}.${encoded}`;
}

// ---- what must be accepted ---------------------------------------------------

test("a request Facebook really signed is accepted", () => {
  const result = verifyFacebookSignedRequest(
    sign({ user_id: "1234567890", algorithm: "HMAC-SHA256", issued_at: 1767225600 }),
    SECRET,
  );
  assert.equal(result.ok, true);
  assert.equal(result.payload.user_id, "1234567890");
});

test("the signature covers the encoded segment, not the re-encoded JSON", () => {
  // Re-serialising the parsed object produces a different string -- key order,
  // spacing -- and therefore a different digest for the same request. Getting
  // this wrong rejects every genuine request.
  const payload = { user_id: "42", algorithm: "HMAC-SHA256" };
  const encoded = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", SECRET).update(encoded).digest();

  assert.equal(verifyFacebookSignedRequest(`${b64url(signature)}.${encoded}`, SECRET).ok, true);
});

// ---- what must be refused ------------------------------------------------------

test("a forged signature is refused", () => {
  const forged = sign({ user_id: "1" }, "not-the-secret");
  const result = verifyFacebookSignedRequest(forged, SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad_signature");
});

test("a tampered payload is refused", () => {
  // The attack this exists to stop: take a valid request and change whose data
  // is deleted.
  const original = sign({ user_id: "111", algorithm: "HMAC-SHA256" });
  const [signature] = original.split(".");
  const swapped = b64url(JSON.stringify({ user_id: "999", algorithm: "HMAC-SHA256" }));

  const result = verifyFacebookSignedRequest(`${signature}.${swapped}`, SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad_signature");
});

test("a missing app secret fails closed", () => {
  // A misconfigured deployment must not become an open deletion endpoint --
  // the worst possible way for this to break.
  const valid = sign({ user_id: "1" });
  for (const secret of [undefined, null, ""]) {
    const result = verifyFacebookSignedRequest(valid, secret);
    assert.equal(result.ok, false, `secret ${JSON.stringify(secret)} must not verify`);
    assert.equal(result.reason, "missing_app_secret");
  }
});

test("nothing at all is refused rather than throwing", () => {
  for (const value of [undefined, null, "", "no-dot", "a.b.c", "...", "!!!.???"]) {
    const result = verifyFacebookSignedRequest(value, SECRET);
    assert.equal(result.ok, false, String(value));
  }
});

test("a payload that is not an object is refused", () => {
  for (const payload of ["\"just a string\"", "42", "null", "[1,2,3]"]) {
    const encoded = b64url(payload);
    const signature = crypto.createHmac("sha256", SECRET).update(encoded).digest();
    const result = verifyFacebookSignedRequest(`${b64url(signature)}.${encoded}`, SECRET);
    assert.equal(result.ok, false, payload);
  }
});

test("an algorithm other than HMAC-SHA256 is refused", () => {
  // Either a format change to look at deliberately, or an attempt to talk the
  // endpoint into a weaker check.
  const result = verifyFacebookSignedRequest(sign({ user_id: "1", algorithm: "none" }), SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unexpected_algorithm");
});

test("a signature of the wrong length is refused without throwing", () => {
  // timingSafeEqual throws on a length mismatch, and a thrown exception is
  // itself a timing signal.
  const encoded = b64url(JSON.stringify({ user_id: "1" }));
  const result = verifyFacebookSignedRequest(`${b64url(Buffer.from([1, 2, 3]))}.${encoded}`, SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad_signature");
});

// ---- the confirmation code ------------------------------------------------------

test("confirmation codes are unguessable and unique", () => {
  // The code is quoted on a public status page. A guessable one would let
  // anybody learn whether a given person had an account here.
  const codes = new Set();
  for (let i = 0; i < 500; i++) codes.add(newDeletionConfirmationCode());

  assert.equal(codes.size, 500, "codes must not repeat");
  for (const code of codes) assert.match(code, /^[0-9a-f]{32}$/);
});

// ---- the route ------------------------------------------------------------------

test("the route verifies before it deletes anything", async () => {
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  const verifyAt = source.indexOf("verifyFacebookSignedRequest");
  const deleteAt = source.indexOf("db\n      .delete") >= 0
    ? source.indexOf("db\n      .delete")
    : source.indexOf(".delete(");

  assert.ok(verifyAt > 0, "the route must verify the signature");
  assert.ok(deleteAt > verifyAt, "verification must come before the delete");
});

test("the route reads the secret from the environment, never from source", async () => {
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  assert.match(source, /process\.env\.FACEBOOK_APP_SECRET/);
  // No 32-hex literal anywhere: that is the shape of the app secret.
  assert.doesNotMatch(source, /["'][0-9a-f]{32}["']/);
});

test("a failed delete answers 5xx so Facebook retries", async () => {
  // Reporting success for a deletion that did not happen is the one answer
  // that must never be given.
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  assert.match(source, /status: 503/);
});

test("the reply carries the two fields Facebook requires", async () => {
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  assert.match(source, /confirmation_code:/);
  assert.match(source, /url: `\$\{base\}\/data-deletion\?code=/);
});

test("only the facebook link is removed, not the platform account", async () => {
  // Deleting an office's clients, properties and contracts because somebody
  // detached a login would destroy records the business is required to keep.
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  assert.match(source, /userOauthAccounts/);
  assert.doesNotMatch(source, /\.delete\(users\)/);
});

test("the deletion endpoint is rate limited", async () => {
  // Public, unauthenticated, and it writes.
  const source = await read("app/api/auth/facebook/data-deletion/route.ts");
  assert.match(source, /limitOr429/);
});

// ---- the page --------------------------------------------------------------------

test("the page states what is not deleted, not only what is", async () => {
  // A page implying that contracts vanish when a login is detached would make a
  // promise the business cannot keep, and a privacy commitment that cannot be
  // honoured is worse than none.
  const page = await read("app/data-deletion/page.tsx");
  assert.match(page, /لا يُحذف/);
  assert.match(page, /لا تحذف حسابك/);
});

test("the page explains how to delete the account itself", async () => {
  const page = await read("app/data-deletion/page.tsx");
  assert.match(page, /privacy@akarpromax\.com/);
  assert.match(page, /البريد المسجَّل/, "identity has to be verified for a deletion request");
});

test("the confirmation code shown is bounded", async () => {
  // It arrives in a query string, which anybody can write.
  const page = await read("app/data-deletion/page.tsx");
  assert.match(page, /\.slice\(0, 64\)/);
});
