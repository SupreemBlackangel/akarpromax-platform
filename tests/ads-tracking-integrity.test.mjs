import assert from "node:assert/strict";
import test from "node:test";

process.env.AD_TRACKING_SECRET ??= "test-secret-for-tracking-integrity";

import { signTrackingToken, verifyTrackingToken, verifyTrackingTokenDetailed } from "../lib/ads/events.ts";
import { claimNonce, resetNonceLedgerForTests } from "../lib/ads/nonce-ledger.ts";

/**
 * A signed token proved only that we minted it, never that it had not already
 * been spent. It stayed valid for 24 hours, so anyone who loaded a page could
 * POST /api/ads/impression with their own token in a loop -- each accepted call
 * inserting a row and accruing CPM spend against the advertiser.
 */

const INPUT = { campaignId: "c1", placement: "web_home_hero", section: "home", pageType: "home" };

// ---- nonces -----------------------------------------------------------------

test("every mint carries a distinct nonce", async () => {
  const a = await verifyTrackingToken(await signTrackingToken(INPUT));
  const b = await verifyTrackingToken(await signTrackingToken(INPUT));
  assert.ok(a.n, "a token without a nonce cannot be made single-use");
  assert.notEqual(a.n, b.n, "two viewers of the same creative must not share a nonce");
});

test("a nonce is spendable exactly once per event kind", () => {
  resetNonceLedgerForTests();
  assert.equal(claimNonce("impression", "n-1"), true);
  assert.equal(claimNonce("impression", "n-1"), false, "the replay must be refused");
  assert.equal(claimNonce("impression", "n-1"), false);
});

test("one token legitimately backs both an impression and a click", () => {
  resetNonceLedgerForTests();
  assert.equal(claimNonce("impression", "n-2"), true);
  assert.equal(claimNonce("click", "n-2"), true, "the click must not be swallowed by the impression");
  assert.equal(claimNonce("click", "n-2"), false);
});

test("a token minted before nonces existed is still honoured", () => {
  resetNonceLedgerForTests();
  assert.equal(claimNonce("impression", undefined), true, "deploying this must not blank tracking for pages already open");
  assert.equal(claimNonce("impression", undefined), true);
});

test("spent nonces are forgotten once their tokens can no longer be used", () => {
  resetNonceLedgerForTests();
  const t0 = Date.now();
  assert.equal(claimNonce("impression", "n-3", t0), true);
  const dayLater = t0 + 25 * 60 * 60 * 1000;
  assert.equal(claimNonce("impression", "n-3", dayLater), true, "the ledger must not grow without bound");
});

// ---- signature and expiry ---------------------------------------------------

test("a tampered token is rejected", async () => {
  const token = await signTrackingToken(INPUT);
  const [payload, signature] = token.split(".");
  assert.equal(await verifyTrackingToken(`${payload}x.${signature}`), null);
  assert.equal(await verifyTrackingToken(`${payload}.${signature.slice(0, -1)}0`), null);
  assert.equal(await verifyTrackingToken(payload), null, "an unsigned payload is not a token");
});

test("expiry is reported apart from forgery, so a stale click still reaches the advertiser", async () => {
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const token = await signTrackingToken(INPUT, old);

  const detailed = await verifyTrackingTokenDetailed(token);
  assert.ok(detailed, "the signature is genuine and must verify");
  assert.equal(detailed.expired, true, "but it is too old to bill");
  assert.equal(detailed.payload.cid, "c1", "the destination is still known, so the visitor is not sent to the homepage");

  assert.equal(await verifyTrackingToken(token), null, "the billing path still refuses it");
});

test("a forged token reports nothing at all", async () => {
  assert.equal(await verifyTrackingTokenDetailed("not-a-token"), null);
  assert.equal(await verifyTrackingTokenDetailed("aaaa.bbbb"), null);
});

// ---- redirect safety --------------------------------------------------------

import { safeRedirect } from "../lib/ads/click-target.ts";

const ORIGIN = "https://akarpromax.com";

test("the click tracker only ever redirects to http(s) or a path on this site", () => {
  assert.equal(safeRedirect("/properties", ORIGIN), "https://akarpromax.com/properties");
  assert.equal(safeRedirect("https://advertiser.example/landing", ORIGIN), "https://advertiser.example/landing");
  assert.equal(safeRedirect("http://advertiser.example/", ORIGIN), "http://advertiser.example/");
});

test("a dangerous or malformed target falls back to the site root", () => {
  assert.equal(safeRedirect("javascript:alert(1)", ORIGIN), ORIGIN, "target_url is admin free text and reaches a Location header");
  assert.equal(safeRedirect("data:text/html,<script>", ORIGIN), ORIGIN);
  assert.equal(safeRedirect("//evil.example", ORIGIN), ORIGIN, "protocol-relative looks like a path but leaves the site");
  assert.equal(safeRedirect("", ORIGIN), ORIGIN);
  assert.equal(safeRedirect(null, ORIGIN), ORIGIN);
  assert.equal(safeRedirect("not a url", ORIGIN), ORIGIN);
});

// ---- the origin a redirect is built on --------------------------------------

import { publicOrigin } from "../lib/ads/click-target.ts";

function req(headers, boundOrigin = "https://0.0.0.0:3010") {
  return { headers: { get: (name) => headers[name.toLowerCase()] ?? null }, nextUrl: { origin: boundOrigin } };
}

test("redirects are built on the host the visitor used, not the one the server is bound to", () => {
  // nextUrl.origin reports the bind address, so behind nginx every ad click
  // redirected to https://0.0.0.0:3010 -- a host no browser can resolve.
  assert.equal(
    publicOrigin(req({ host: "akarpromax.com", "x-forwarded-proto": "https" })),
    "https://akarpromax.com",
  );
  assert.equal(
    publicOrigin(req({ host: "localhost:3010", "x-forwarded-proto": "http" })),
    "http://localhost:3010",
  );
});

test("a missing or malformed Host falls back rather than being trusted", () => {
  assert.equal(publicOrigin(req({})), "https://0.0.0.0:3010");
  assert.equal(publicOrigin(req({ host: "evil.example/path" })), "https://0.0.0.0:3010");
  assert.equal(publicOrigin(req({ host: "0.0.0.0:3010" })), "https://0.0.0.0:3010");
});

test("an absent forwarded protocol defaults to https", () => {
  assert.equal(publicOrigin(req({ host: "akarpromax.com" })), "https://akarpromax.com");
});
