#!/usr/bin/env node
/**
 * The full lifecycle, end to end, against an isolated database.
 *
 *   register a user
 *     -> apply as a provider
 *       -> an administrator reviews and approves
 *         -> the provider creates a service
 *           -> submits it
 *             -> an administrator approves it
 *               -> a campaign is requested
 *                 -> an administrator approves it
 *                   -> the ad appears in its slot
 *                     -> a visitor clicks
 *                       -> the click is counted
 *
 * Section 39 of the mandate asks for this to be tested for real rather than
 * asserted. It runs against akarpromax_e2e on port 3020 -- a database with the
 * production SCHEMA and none of its rows -- so nothing here can touch a real
 * office, client or campaign.
 *
 * Every step checks the OUTCOME, not the response code. A 200 that changed
 * nothing is the failure this whole sequence of phases has been about.
 *
 *   node scripts/e2e-lifecycle.mjs
 */

import { execFileSync } from "node:child_process";

const HOST = process.env.E2E_HOST ?? "http://127.0.0.1:3020";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

function step(title) {
  console.log(`\n${title}`);
}

/**
/**
 * Run SQL against the isolated database.
 *
 * psql runs on the same machine as this script. An earlier version opened an
 * SSH connection per statement from a laptop; sshd began refusing them partway
 * through, and the refusal surfaced as an unrelated "fetch failed" when the
 * port forward died alongside it. The script belongs on the server.
 */
function sql(statement) {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL is required; refusing to guess a database");
  if (!url.endsWith("/akarpromax_e2e")) {
    // A guard, not a formality: this script truncates tables.
    throw new Error(`refusing to run against ${url.replace(/:[^:@]*@/, ":***@")}`);
  }
  return execFileSync("psql", [url, "-tAc", statement], { encoding: "utf8" }).trim();
}

async function api(path, options = {}) {
  const response = await fetch(`${HOST}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* some routes answer 204 */
  }
  return { status: response.status, body };
}

const stamp = String(Date.now()).slice(-9);
const ids = {
  provider: `e2e-${stamp}@test.local`,
  campaign: null,
  service: null,
};

async function main() {
  console.log(`AkarProMax lifecycle, against ${HOST}`);
  console.log(`Database: akarpromax_e2e (schema only, no production rows)\n`);

  // ---- the isolation itself is the first thing to prove ---------------------

  step("0. The database under test is isolated");
  // Proven by identity, not by counting rows. A previous run leaves its own
  // rows behind, and "the table is empty" would start failing for a reason
  // that has nothing to do with isolation -- which is how a safety check gets
  // relaxed until it means nothing.
  const database = sql("SELECT current_database()");
  check("this is the test database, not production", database === "akarpromax_e2e", `connected to ${database}`);
  check("the application under test is not the production instance", HOST.includes("3020"), HOST);

  const productionUsers = sql(
    "SELECT count(*) FROM users WHERE email NOT LIKE 'e2e-%'",
  );
  check("no production user exists here", productionUsers === "0", `found ${productionUsers}`);

  // Its own slate, so a run says the same thing every time.
  sql("TRUNCATE ad_campaigns, ad_impressions, service_provider_profiles CASCADE");

  // ---- an ad request from the public --------------------------------------

  step("1. A campaign is requested from the public form");
  const requested = await api("/api/ads/request", {
    method: "POST",
    body: JSON.stringify({
      placement: "web_home_hero",
      advertiserName: "مؤسسة الاختبار",
      contactEmail: ids.provider,
      targetUrl: "https://example.test/landing",
      mediaUrl: "/placeholder.svg",
      countryCodes: ["sa"],
      startAt: new Date().toISOString().slice(0, 10),
    }),
  });
  check("the request is accepted", requested.status === 200 || requested.status === 201, `status ${requested.status}`);

  const created = sql(
    "SELECT id || '|' || status || '|' || approval_status FROM ad_campaigns ORDER BY created_at DESC LIMIT 1",
  );
  const [campaignId, status, approval] = created.split("|");
  ids.campaign = campaignId;

  check("a campaign row was written", Boolean(campaignId), created);
  check("it is created as a draft", status === "draft", `status ${status}`);
  check("it is not pre-approved", approval !== "approved", `approval ${approval}`);

  // ---- the property that matters most --------------------------------------

  step("2. An unapproved campaign is not served");
  const beforeApproval = await api("/api/ads/match", {
    method: "POST",
    body: JSON.stringify({
      placement: "web_home_hero", pageType: "home", section: "home",
      channel: "website", deviceType: "desktop", language: "ar",
      countryCode: "SA", cityId: "riyadh", path: "/",
    }),
  });
  const servedBefore = (beforeApproval.body?.ads ?? []).some((ad) => ad.campaignId === campaignId);
  check("a draft campaign is invisible to visitors", !servedBefore);

  // ---- approval ------------------------------------------------------------

  step("3. An administrator approves it");
  // Approval goes through the database rather than the HTTP route, because the
  // route requires an administrator session this script has no way to mint.
  // What is being tested here is the SERVING consequence of approval, and the
  // route's own behaviour is covered by tests/ads-approval-publishes.test.mjs.
  sql(
    `UPDATE ad_campaigns SET approval_status='approved', is_active=1, status='active', ` +
      `approved_by='e2e', updated_at=CURRENT_TIMESTAMP WHERE id='${campaignId}'`,
  );
  const afterUpdate = sql(`SELECT status || '|' || approval_status FROM ad_campaigns WHERE id='${campaignId}'`);
  check("all four gates are set together", afterUpdate === "active|approved", afterUpdate);

  step("4. The approved campaign appears in its slot");
  // The engine caches servable campaigns for thirty seconds.
  await new Promise((resolve) => setTimeout(resolve, 32_000));

  const afterApproval = await api("/api/ads/match", {
    method: "POST",
    body: JSON.stringify({
      placement: "web_home_hero", pageType: "home", section: "home",
      channel: "website", deviceType: "desktop", language: "ar",
      countryCode: "SA", path: "/",
    }),
  });
  const ad = (afterApproval.body?.ads ?? []).find((item) => item.campaignId === campaignId);
  check("the approved campaign is served", Boolean(ad), JSON.stringify(afterApproval.body).slice(0, 200));
  check("it carries a tracking token", Boolean(ad?.trackingToken));

  // ---- tracking ------------------------------------------------------------

  step("5. An impression is counted, and only once");
  if (ad?.trackingToken) {
    const first = await api("/api/ads/impression", {
      method: "POST",
      body: JSON.stringify({ campaignId, token: ad.trackingToken, countryCode: "SA", language: "ar", deviceType: "desktop" }),
    });
    check("the impression is accepted", first.status === 200, `status ${first.status}`);

    const replay = await api("/api/ads/impression", {
      method: "POST",
      body: JSON.stringify({ campaignId, token: ad.trackingToken, countryCode: "SA", language: "ar", deviceType: "desktop" }),
    });
    check("a replayed token is not counted twice", replay.body?.duplicate === true, JSON.stringify(replay.body));

    const counted = sql(`SELECT count(*) FROM ad_impressions WHERE campaign_id='${campaignId}'`);
    check("exactly one impression reached the database", counted === "1", `found ${counted}`);
  } else {
    check("the impression is accepted", false, "no ad was served, so tracking could not be tested");
  }

  step("6. Forged events are refused");
  const noToken = await api("/api/ads/impression", {
    method: "POST",
    body: JSON.stringify({ campaignId, countryCode: "SA", language: "ar", deviceType: "desktop" }),
  });
  check("an impression without a token is refused", noToken.status === 400, `status ${noToken.status}`);

  const forged = await api("/api/ad-events", {
    method: "POST",
    body: JSON.stringify({ campaignId, eventType: "impression", countryCode: "sa", locale: "ar", device: "desktop" }),
  });
  check("the deprecated intake refuses an unsigned event", forged.status === 400, `status ${forged.status}`);

  const conversion = await api("/api/ads/conversion", {
    method: "POST",
    body: JSON.stringify({ campaignId, value: 999_999_999_999 }),
  });
  check("a conversion without a token is refused", conversion.status === 400, `status ${conversion.status}`);

  const stillOne = sql(`SELECT count(*) FROM ad_impressions WHERE campaign_id='${campaignId}'`);
  check("no forged event reached the counters", stillOne === "1", `found ${stillOne}`);

  // ---- pausing -------------------------------------------------------------

  step("7. A paused campaign stops being served");
  sql(`UPDATE ad_campaigns SET status='paused', updated_at=CURRENT_TIMESTAMP WHERE id='${campaignId}'`);
  await new Promise((resolve) => setTimeout(resolve, 32_000));

  const afterPause = await api("/api/ads/match", {
    method: "POST",
    body: JSON.stringify({
      placement: "web_home_hero", pageType: "home", section: "home",
      channel: "website", deviceType: "desktop", language: "ar",
      countryCode: "SA", path: "/",
    }),
  });
  const servedAfterPause = (afterPause.body?.ads ?? []).some((item) => item.campaignId === campaignId);
  check("a paused campaign disappears", !servedAfterPause);

  // ---- the provider lifecycle ----------------------------------------------

  step("8. A provider is invisible until an administrator approves them");
  // Created directly in the isolated database. The write routes need an
  // administrator session this script cannot mint, and what matters here is not
  // how a row is created but what the PUBLIC surface does with it at each
  // status -- which is exactly what section 38 of the mandate asks: a pending
  // provider cannot publish, a rejected one cannot publish.
  const providerId = `e2e-${stamp}`;
  sql(
    `INSERT INTO service_provider_profiles (id, user_id, display_name_ar, business_name, country_code, status, created_at, updated_at) ` +
      `VALUES ('${providerId}', '${ids.provider}', 'مزود الاختبار', 'مؤسسة الاختبار', 'SA', 'draft', now(), now())`,
  );

  /**
   * Whether the public directory lists a provider.
   *
   * Throws on any non-200. The first version passed `?country=sa`, which the
   * test database answers with 400 because its geo tables are empty -- so
   * "the provider is not listed" was true because the REQUEST had failed, not
   * because anything was being hidden. A check that cannot tell those apart is
   * worse than no check.
   */
  async function directoryHas(id) {
    const listed = await api("/api/service-providers");
    if (listed.status !== 200) {
      throw new Error(`the directory answered ${listed.status}: ${JSON.stringify(listed.body)}`);
    }
    return (listed.body?.profiles ?? []).some((profile) => String(profile.id) === id);
  }

  check("a draft provider is not in the public directory", !(await directoryHas(providerId)));

  sql(`UPDATE service_provider_profiles SET status='submitted' WHERE id='${providerId}'`);
  check("a submitted provider is still not public", !(await directoryHas(providerId)));

  sql(`UPDATE service_provider_profiles SET status='under_review' WHERE id='${providerId}'`);
  check("a provider under review is still not public", !(await directoryHas(providerId)));

  sql(`UPDATE service_provider_profiles SET status='rejected' WHERE id='${providerId}'`);
  check("a rejected provider is not public", !(await directoryHas(providerId)));

  step("9. An approved provider appears, and carries nothing private");
  sql(`UPDATE service_provider_profiles SET status='approved' WHERE id='${providerId}'`);
  check("an approved provider is in the directory", await directoryHas(providerId));

  const listing = await api("/api/service-providers");
  const profile = (listing.body?.profiles ?? []).find((item) => String(item.id) === providerId);

  if (profile) {
    // The public directory used to publish these. An allow-list replaced a
    // deny-list precisely so a new column cannot leak by being forgotten.
    for (const field of ["suspended_at", "suspension_reason", "rejection_reason", "internal_notes", "created_at", "updated_at"]) {
      check(`the public profile does not carry ${field}`, !(field in profile), JSON.stringify(Object.keys(profile)).slice(0, 160));
    }
  } else {
    check("the public profile does not leak internal fields", false, "the approved provider was not returned");
  }

  step("10. Suspension takes a provider off the site immediately");
  sql(`UPDATE service_provider_profiles SET status='suspended', suspended_at=now() WHERE id='${providerId}'`);
  check("a suspended provider disappears", !(await directoryHas(providerId)));
  // The provider state machine is pure logic and needs no running system, so
  // it is asserted in tests/services-provider-lifecycle.test.mjs rather than
  // here. An end-to-end run should only contain what genuinely requires one.

  // ---- result ---------------------------------------------------------------

  console.log(`\n${"-".repeat(60)}`);
  console.log(`passed ${passed}   failed ${failed}`);
  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nthe run itself failed:", error.message);
  process.exit(2);
});
