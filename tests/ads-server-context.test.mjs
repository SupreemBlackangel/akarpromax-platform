import assert from "node:assert/strict";
import test from "node:test";

import {
  AD_SESSION_COOKIE,
  deviceFromUserAgent,
  isBotUserAgent,
  mintSessionId,
  resolveServerAdContext,
  sessionCookieHeader,
  verifySessionId,
} from "../lib/ads/server-context.ts";
import { buildContext } from "../lib/ads/context.ts";

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  bot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

function makeRequest({ ua = UA.desktop, host = "akarpromax.com", cookie = null } = {}) {
  const headers = new Headers({ "user-agent": ua, host });
  if (cookie) headers.set("cookie", cookie);
  return new Request("https://akarpromax.com/api/ads/match-batch", { method: "POST", headers });
}

test("device is derived from the User-Agent, not from what the page claims", () => {
  assert.equal(deviceFromUserAgent(UA.iphone), "mobile");
  assert.equal(deviceFromUserAgent(UA.androidPhone), "mobile");
  assert.equal(deviceFromUserAgent(UA.ipad), "tablet");
  assert.equal(deviceFromUserAgent(UA.androidTablet), "tablet", "Android without 'Mobile' is a tablet");
  assert.equal(deviceFromUserAgent(UA.desktop), "desktop");
  assert.equal(deviceFromUserAgent(null), "desktop", "missing UA falls back rather than throwing");
});

test("bots are identifiable so they cannot be billed as real users", () => {
  assert.ok(isBotUserAgent(UA.bot));
  assert.ok(!isBotUserAgent(UA.iphone));
});

test("a claimed device cannot override the real one", () => {
  const server = resolveServerAdContext(makeRequest({ ua: UA.desktop }));
  const ctx = buildContext(
    { placement: "web_home_hero", deviceType: "mobile", domain: "evil.example", countryCode: "sa" },
    server,
  );
  assert.equal(ctx.deviceType, "desktop", "the User-Agent wins over the claimed device");
  assert.equal(ctx.domain, "akarpromax.com", "the Host header wins over window.location");
});

test("dayparting can no longer be bypassed by claiming an hour", () => {
  const server = resolveServerAdContext(makeRequest());
  const ctx = buildContext({ placement: "web_home_hero", hour: 3, dayOfWeek: 5 }, server);
  assert.equal(ctx.hour, undefined, "the server clock decides the hour");
  assert.equal(ctx.dayOfWeek, undefined, "the server clock decides the day");
});

test("without server authority the client values still apply (back-compat)", () => {
  const ctx = buildContext({ placement: "web_home_hero", deviceType: "mobile", hour: 3 });
  assert.equal(ctx.deviceType, "mobile");
  assert.equal(ctx.hour, 3);
});

test("session ids are signed, so a made-up id is rejected", () => {
  const minted = mintSessionId();
  assert.equal(verifySessionId(minted), minted, "a minted id verifies");
  assert.equal(verifySessionId("just-made-this-up"), null);
  assert.equal(verifySessionId(`${minted.split(".")[0]}.deadbeef`), null, "a tampered signature is rejected");
  assert.equal(verifySessionId(null), null);
});

test("a forged session cookie is replaced rather than trusted", () => {
  const server = resolveServerAdContext(makeRequest({ cookie: `${AD_SESSION_COOKIE}=attacker-chosen-id` }));
  assert.notEqual(server.sessionId, "attacker-chosen-id");
  assert.ok(server.issuedSessionCookie, "a fresh signed id is issued instead");
});

test("a valid session cookie is reused, so the frequency bucket persists", () => {
  const minted = mintSessionId();
  const server = resolveServerAdContext(makeRequest({ cookie: `${AD_SESSION_COOKIE}=${encodeURIComponent(minted)}` }));
  assert.equal(server.sessionId, minted);
  assert.equal(server.issuedSessionCookie, null, "no need to re-issue an already-valid session");
});

test("the session cookie is HttpOnly so page scripts cannot rewrite it", () => {
  const header = sessionCookieHeader(mintSessionId());
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
});

test("a malformed country is dropped instead of making a campaign unservable", () => {
  assert.equal(resolveServerAdContext(makeRequest(), "SA").countryCode, "sa", "normalized to lowercase");
  assert.equal(resolveServerAdContext(makeRequest(), "Saudi Arabia").countryCode, undefined);
  assert.equal(resolveServerAdContext(makeRequest(), 42).countryCode, undefined);
});

test("country is labelled client-asserted until a geo source exists", () => {
  assert.equal(resolveServerAdContext(makeRequest(), "om").countrySource, "client");
});
