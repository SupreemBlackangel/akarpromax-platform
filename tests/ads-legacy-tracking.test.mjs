import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * The legacy ad components must count what they show.
 *
 * They were counting almost nothing. They posted a click to
 * `/api/advertising/track`, which writes `ad_analytics` -- a table no report
 * reads -- and recorded no impression at all, on the client or the server.
 *
 * So an ad rendered on a company, office or tool page was invisible to every
 * counter that matters:
 *
 *   impressions never incremented, so a CPM campaign was never charged for
 *   them and max_impressions never reached its cap;
 *
 *   frequency_cap_per_user never fired, so one visitor could be shown the same
 *   ad without limit;
 *
 *   the admin statistics read ad_impressions, so those pages contributed
 *   nothing to any report, and CTR was computed from partial data.
 *
 * Nothing new was needed to fix it: /api/advertising/match already returned the
 * tracking token the engine minted. The components simply never used it -- and
 * could not, because the type did not declare it.
 */

/** Components that render a served ad and must therefore report it. */
const RENDERING_COMPONENTS = [
  "components/advertising/placements/AdSidebar.tsx",
  "components/advertising/placements/AdBottom.tsx",
];

test("the tracking token is part of the type the server has always sent", async () => {
  // toLegacyAdvertisingResult includes it; the type omitted it, so no component
  // could reach it.
  const types = await read("components/advertising/placements/useAdvertisingLocation.ts");
  assert.match(types, /trackingToken\?: string \| null;/);

  const route = await read("app/api/advertising/match/route.ts");
  assert.match(route, /trackingToken: ad\.trackingToken/);
});

test("every rendering component reports an impression", async () => {
  for (const file of RENDERING_COMPONENTS) {
    const source = await read(file);
    assert.match(source, /useAdImpression\(/, `${file} renders an ad and counts no impression`);
  }
});

test("every rendering component reports its click through the engine", async () => {
  for (const file of RENDERING_COMPONENTS) {
    const source = await read(file);
    assert.match(source, /reportAdClick\(/, `${file} does not report clicks to the counters reports read`);
  }
});

test("the impression hook runs before any early return", async () => {
  // A hook behind a conditional return breaks the rules of hooks, and an
  // impression reported after the guards would never fire for the ad that
  // actually rendered.
  for (const file of RENDERING_COMPONENTS) {
    const source = await read(file);
    const hookAt = source.indexOf("useAdImpression(");
    const firstGuard = source.indexOf("if (loading) return");

    assert.ok(hookAt > 0, `${file} has no impression hook`);
    assert.ok(firstGuard > 0, `${file} has no loading guard to compare against`);
    assert.ok(hookAt < firstGuard, `${file} calls the hook after an early return`);
  }
});

test("an impression is reported once per ad, not once per render", async () => {
  // Without this, every parent re-render and StrictMode's double effect would
  // each count. The server claims the nonce as well; this is the cheap half of
  // a guarantee that already exists.
  const hook = await read("components/advertising/placements/useLegacyAdTracking.ts");
  assert.match(hook, /const reported = useRef<string \| null>\(null\);/);
  assert.match(hook, /if \(reported\.current === key\) return;/);
});

test("a failed counter never breaks the page the ad sits on", async () => {
  const hook = await read("components/advertising/placements/useLegacyAdTracking.ts");
  assert.match(hook, /\.catch\(\(\) => \{\}\)/);
  assert.match(hook, /keepalive: true/, "a click navigates away; the report must survive it");
});

test("the reports go to the endpoints the statistics actually read", async () => {
  // Admin statistics read ad_impressions, which lib/ads/events.ts writes via
  // /api/ads/impression and /api/ads/click. /api/advertising/track writes
  // ad_analytics, which nothing reads.
  const hook = await read("components/advertising/placements/useLegacyAdTracking.ts");
  assert.match(hook, /'\/api\/ads\/impression'/);
  assert.match(hook, /'\/api\/ads\/click'/);

  const stats = await read("app/api/admin/ads/stats/route.ts");
  assert.match(stats, /FROM ad_impressions/);
});

test("no ad-rendering component is left counting nothing", async () => {
  // Guards the guard: a component added tomorrow that renders a served ad is
  // caught here rather than by an advertiser asking why their report is empty.
  const files = [];
  for (const entry of await readdir(path.join(ROOT, "components/advertising/placements"), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(`components/advertising/placements/${entry.name}`);
    }
  }
  assert.ok(files.length >= 3, "the sweep must find the components");

  for (const file of files) {
    const source = await read(file);
    // Only components that render a matched ad need this. The news ticker and
    // the featured-property strip are not ad campaigns.
    if (!/\/api\/advertising\/match/.test(source)) continue;
    if (!/creatives/.test(source)) continue;

    assert.match(
      source,
      /useAdImpression\(/,
      `${file} renders a matched ad and reports no impression`,
    );
  }
});
