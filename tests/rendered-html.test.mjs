import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AkarPromax public landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>عقار بروماكس \| منصة العقار الذكية في عُمان<\/title>/);
  assert.match(html, /قرارك العقاري/);
  assert.match(html, /AkarPromax Office/);
  assert.match(html, /الشريط الإخباري/);
  assert.match(html, /أدوات المنصة/);
  assert.match(html, /اختيار اللغة/);
  assert.match(html, /العربية/);
  assert.match(html, /English/);
  assert.match(html, /Türkçe/);
  assert.match(html, /country-trigger/);
  assert.match(html, /country-dropdown/);
  assert.match(html, /country-flag/);
  assert.match(html, /city-trigger/);
  assert.match(html, /city-dropdown/);
  assert.match(html, /currency-chip/);
  assert.match(html, /OMR/);
  assert.match(html, /theme-switcher/);
  assert.match(html, /theme-dropdown/);
  assert.match(html, /tool-cluster location-cluster/);
  assert.match(html, /tool-cluster preference-cluster/);
  assert.match(html, /country-sponsor/);
  assert.match(html, /sponsor-inline/);
  assert.match(html, /footer-sponsor/);
  assert.match(html, /data-sponsor-country="om"/);
  assert.match(html, /partners@akarpromax\.om/);
});

test("does not retain the starter preview or starter metadata", async () => {
  const [page, layout, packageJson, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(layout, /عقار بروماكس/);
  assert.match(layout, /openGraph/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(styles, /html\[data-theme="dark"\]/);
  assert.match(styles, /color-scheme:\s*dark/);
  assert.match(layout, /akarpromax-theme/);
});

test("includes the country sponsor administration and generated campaign art", async () => {
  const [page, admin, schema, sponsorApi, accessApi, sponsorAssetsApi, auth, runtimeDb, packageJson, hosting, ...images] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sponsors/sponsor-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsors/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsor-access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsor-assets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/runtime-db.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    stat(new URL("../public/sponsors/oman-gold.webp", import.meta.url)),
    stat(new URL("../public/sponsors/saudi-emerald.webp", import.meta.url)),
    stat(new URL("../public/sponsors/turkiye-crimson.webp", import.meta.url)),
    stat(new URL("../public/sponsors/arab-blue.webp", import.meta.url)),
  ]);

  assert.match(page, /\/api\/user-context/);
  assert.match(page, /\/api\/sponsors\?country=/);
  assert.match(page, /sponsor-ribbon-visual/);
  assert.match(page, /sponsor-visual-image/);
  assert.match(page, /SponsorIdentity/);
  assert.match(page, /sponsor-logo-fallback/);
  assert.match(page, /sidebar-sponsor-admin/);
  assert.match(admin, /المستخدمون والصلاحيات/);
  assert.match(admin, /مواضع الظهور/);
  assert.match(schema, /sponsorAccess/);
  assert.match(schema, /sponsorEvents/);
  assert.match(sponsorApi, /sponsor\.created/);
  assert.match(accessApi, /access:write/);
  assert.match(sponsorAssetsApi, /MAX_LOGO_BYTES/);
  assert.match(sponsorAssetsApi, /fileSignatureMatches/);
  assert.match(sponsorAssetsApi, /sponsor\.logo_uploaded/);
  assert.match(sponsorAssetsApi, /UPDATE sponsors SET logo_url/);
  assert.match(admin, /admin-campaign-art/);
  assert.match(admin, /admin-campaign-preview-logo/);
  assert.match(admin, /صورة خلفية شريط الراعي/);
  assert.match(admin, /payload\.append\("sponsorId", form\.id\)/);
  assert.match(admin, /admin-dialog-message/);
  assert.match(admin, /disabled=\{busy \|\| logoUploading\}/);
  assert.match(auth, /admin@localhost\.akarpromax/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS sponsors/);
  assert.match(packageJson, /"dev": "vinext dev"/);
  assert.match(hosting, /"r2": "SPONSOR_ASSETS"/);
  images.forEach((image) => assert.ok(image.size > 40_000));
});
