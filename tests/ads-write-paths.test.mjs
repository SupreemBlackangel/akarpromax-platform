import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { normaliseCampaignPayload, validateCampaignPayload } from "../lib/ads/admin.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * What the ad write paths accept.
 *
 * PHASE 7 was scoped from an audit line that read "no schema validation
 * anywhere". That was wrong twice over: zod is used across the auth routes, and
 * the hand-rolled normalisation on the ads payload turns out to bound every
 * numeric field it takes. The finding did not survive being looked at.
 *
 * What was missing is not schemas. It is anything asserting that these
 * properties stay true -- above all on /api/ads/request, which is public,
 * unauthenticated, and writes a row into ad_campaigns.
 */

// ---- the public request cannot create something servable --------------------

test("a public ad request is created as a draft", async () => {
  // This is the property that makes an unauthenticated write into ad_campaigns
  // acceptable at all. The serving query requires status = 'active'; a draft
  // can never be served, no matter what the requester sent.
  const route = await read("app/api/ads/request/route.ts");

  const insert = route.slice(route.indexOf("INSERT INTO ad_campaigns"));
  const bound = insert.slice(insert.indexOf(".bind("), insert.indexOf(".run()"));

  assert.match(bound, /"request",\s*\n\s*"draft",/, "a public request must be inserted as a draft");
});

test("the public request path does not set itself active or approved", async () => {
  const route = await read("app/api/ads/request/route.ts");
  const insert = route.slice(route.indexOf("INSERT INTO ad_campaigns"));

  assert.doesNotMatch(insert, /"active"/, "a public request must never write status active");
  assert.doesNotMatch(insert, /'approved'|"approved"/, "a public request must never approve itself");
});

test("the public request path is rate limited and bounded", async () => {
  const route = await read("app/api/ads/request/route.ts");
  assert.match(route, /status: 429/, "an unauthenticated write must be rate limited");
  assert.match(route, /REQUESTABLE_PLACEMENTS/, "it must not accept any placement it likes");
  assert.match(route, /approval_status = 'pending'/, "duplicate pending requests are refused");
});

// ---- the admin payload bounds every number it takes -------------------------

test("priority cannot be raised without limit", async () => {
  // scoreAd adds `ad.priority * 10`. An unbounded priority would make one
  // campaign outrank every other, everywhere, permanently -- the same shape of
  // defect as an unbounded service radius.
  const high = normaliseCampaignPayload({ priority: 1e9 });
  const low = normaliseCampaignPayload({ priority: -50 });

  assert.ok(high.priority <= 999, `priority ${high.priority} is unbounded`);
  assert.ok(low.priority >= 1, `priority ${low.priority} is below the floor`);
});

test("weight, budget and radius are bounded too", async () => {
  const payload = normaliseCampaignPayload({
    weight: 1e6,
    budget: 1e15,
    radiusKm: 1e9,
  });

  assert.ok(payload.weight <= 100);
  assert.ok(payload.budget <= 10_000_000_000);
  assert.ok(payload.radiusKm === null || payload.radiusKm <= 20_000);
});

test("coordinates outside the world are refused", async () => {
  const payload = normaliseCampaignPayload({ latitude: 500, longitude: -900 });
  for (const value of [payload.latitude, payload.longitude]) {
    assert.ok(value === null || (value >= -180 && value <= 180), `${value} is not a coordinate`);
  }
});

test("nonsense in a numeric field does not become NaN in the row", async () => {
  // A NaN reaching the column is a value no comparison matches, so the campaign
  // silently stops being eligible with nothing to explain it.
  const payload = normaliseCampaignPayload({
    priority: "abc",
    weight: null,
    budget: undefined,
    radiusKm: "x",
  });

  for (const [field, value] of Object.entries(payload)) {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value), `${field} is ${value}`);
    }
  }
});

// ---- validation refuses an incomplete campaign ------------------------------

test("a campaign missing its required content is refused", async () => {
  assert.equal(validateCampaignPayload(normaliseCampaignPayload({})), false);
});

test("validation requires all three languages, not just one", async () => {
  // A campaign with only Arabic renders empty for an English or Turkish
  // visitor, which looks like a broken slot rather than a missing translation.
  const base = {
    internalName: "x", advertiserName: "y", mediaUrl: "/a.png", targetUrl: "https://example.com",
    channels: ["website"], languages: ["ar"], devices: ["desktop"],
    eyebrowAr: "a", titleAr: "a", accentAr: "a", descriptionAr: "a", ctaAr: "a",
  };
  assert.equal(validateCampaignPayload(normaliseCampaignPayload(base)), false);
});

test("a campaign with no channel, language or device is refused", async () => {
  const full = {
    internalName: "x", advertiserName: "y", mediaUrl: "/a.png", targetUrl: "https://example.com",
    eyebrowAr: "a", eyebrowEn: "a", eyebrowTr: "a",
    titleAr: "a", titleEn: "a", titleTr: "a",
    accentAr: "a", accentEn: "a", accentTr: "a",
    descriptionAr: "a", descriptionEn: "a", descriptionTr: "a",
    ctaAr: "a", ctaEn: "a", ctaTr: "a",
  };

  // An empty targeting dimension matches nobody, so the campaign would be
  // approved and never seen -- the failure this whole sequence of phases began
  // with. Languages and devices are refused outright.
  assert.equal(validateCampaignPayload(normaliseCampaignPayload({ ...full, channels: ["website"], languages: [], devices: ["desktop"] })), false);
  assert.equal(validateCampaignPayload(normaliseCampaignPayload({ ...full, channels: ["website"], languages: ["ar"], devices: [] })), false);
});

test("an empty channel list defaults to website, and that is on the record", () => {
  // Channels behave differently from the other two: an empty list becomes
  // ["website"] rather than being refused.
  //
  // Left as it is. This is a website advertising platform and "website" is the
  // only channel most campaigns will ever use, so the default is defensible and
  // changing it risks refusing submissions the admin form makes today. What was
  // missing is that the behaviour was an accident of implementation rather than
  // a decision anyone had written down. It is written down here: if this ever
  // becomes wrong, this test is where the argument lives.
  const payload = normaliseCampaignPayload({ channels: [], languages: ["ar"], devices: ["desktop"] });
  assert.deepEqual(payload.channels, ["website"]);
});
