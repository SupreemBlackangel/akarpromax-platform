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
  assert.doesNotMatch(html, /sponsor-inline/);
  assert.doesNotMatch(html, /footer-sponsor/);
  assert.match(html, /side-rail-ad/);
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
  const [page, admin, sponsorIdentity, schema, sponsorApi, accessApi, sponsorAssetsApi, auth, runtimeDb, packageJson, hosting, ...images] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sponsors/sponsor-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/SponsorIdentity.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsors/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsor-access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsor-assets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/sponsor-auth.ts", import.meta.url), "utf8"),
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
  assert.match(page, /HeroAdSlide/);
  assert.match(page, /hero-ad-media/);
  assert.match(page, /hero-ad-controls/);
  assert.match(page, /mediaType === "video"/);
  assert.match(page, /sponsor-ribbon-visual/);
  assert.match(page, /sponsor-visual-image/);
  assert.match(page, /SponsorIdentity/);
  assert.match(sponsorIdentity, /sponsor-logo-fallback/);
  assert.match(page, /sidebar-public-nav/);
  assert.doesNotMatch(page, /sidebar-sponsor-admin/);
  assert.doesNotMatch(page, /adminNav/);
  assert.doesNotMatch(page, /sidebar-admin-head/);
  assert.doesNotMatch(page, /admin-chip/);
  assert.match(admin, /المستخدمون والصلاحيات/);
  assert.match(admin, /مواضع الظهور/);
  assert.match(schema, /sponsorAccess/);
  assert.match(schema, /sponsorEvents/);
  assert.match(sponsorApi, /sponsor\.created/);
  assert.match(accessApi, /PERMISSIONS\.USERS_CREATE/);
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
  assert.doesNotMatch(auth, /admin@localhost\.akarpromax/);
  assert.doesNotMatch(auth, /getChatGPTUser|oai-authenticated-user/);
  assert.match(auth, /getSessionIdentity/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS sponsors/);
  assert.match(packageJson, /"dev": "vinext dev"/);
  assert.match(hosting, /"r2": "SPONSOR_ASSETS"/);
  images.forEach((image) => assert.ok(image.size > 40_000));
});

test("includes the managed advertising center, media storage and targeted hero delivery", async () => {
  const [page, admin, adsApi, assetsApi, eventsApi, schema, runtimeDb, permissions, roles, migration, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/ads/ads-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ad-assets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ad-events/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/runtime-db.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/constants/permissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/constants/roles.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_stormy_anita_blake.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\/api\/ads\?country=/);
  assert.match(page, /\/api\/ad-events/);
  assert.match(page, /campaignId/);
  assert.match(page, /IntersectionObserver/);
  assert.match(admin, /إعداد حملة المحرك الذكي/);
  assert.match(admin, /image\/png,image\/jpeg,image\/webp,video\/mp4,video\/webm,video\/ogg/);
  assert.match(admin, /مكتبة الصور والفيديو/);
  assert.match(adsApi, /PERMISSIONS\.ADS_PUBLISH/);
  assert.match(adsApi, /countries/);
  assert.match(assetsApi, /MAX_VIDEO_BYTES/);
  assert.match(assetsApi, /signatureMatches/);
  assert.match(eventsApi, /video_complete/);
  assert.match(schema, /adCampaigns/);
  assert.match(schema, /adAssets/);
  assert.match(schema, /adEvents/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS ad_campaigns/);
  assert.match(roles, /ad_manager/);
  assert.match(roles, /ROLE_CATALOG/);
  assert.match(permissions, /ADS_PUBLISH/);
  assert.match(migration, /CREATE TABLE `ad_campaigns`/);
  assert.match(styles, /\.ads-admin/);
  assert.match(styles, /\.ads-live-preview/);
});

test("includes the region-filtered news ticker, management API and admin panel", async () => {
  const [page, ticker, newsApi, runtimeDb, permissions, adminPage, adminClient, mysqlSchema, migration, styles, translations] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/NewsTicker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/runtime-db.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/constants/permissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/news/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/news/news-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/mysql/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle-mysql/0001_news_table.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../src/data/translations.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<NewsTicker copy=\{copy\} locale=\{locale\} country=\{country\} city=\{city\} \/>/);
  assert.match(page, /sidebar-public-nav/);
  assert.doesNotMatch(page, /adminNav/);
  assert.doesNotMatch(page, /sidebar-admin-head/);
  assert.doesNotMatch(page, /admin-chip/);
  assert.doesNotMatch(page, /مركز الشريط الإخباري/);
  assert.doesNotMatch(page, /مركز الإعلانات/);
  assert.match(ticker, /api\/news\?/);
  assert.match(ticker, /ticker-marquee/);
  assert.match(ticker, /animationDuration/);
  assert.match(ticker, /tickerPause/);
  assert.match(ticker, /tickerPlay/);
  assert.match(ticker, /className="ticker-item"/);
  assert.doesNotMatch(ticker, /ticker-link/);
  assert.doesNotMatch(ticker, /_blank/);
  assert.doesNotMatch(ticker, /isExternalLink/);
  assert.doesNotMatch(ticker, /href=\{item\.linkUrl\}/);
  assert.match(newsApi, /scope = 'global' OR \(scope = 'country' AND lower\(country_code\) = \?1\)/);
  assert.match(newsApi, /scope = 'city'/);
  assert.match(newsApi, /NEWS_PUBLISH/);
  assert.match(runtimeDb, /CREATE TABLE IF NOT EXISTS news/);
  assert.match(permissions, /NEWS_VIEW/);
  assert.match(permissions, /NEWS_DELETE/);
  assert.match(adminPage, /requireSessionUser\("\/admin\/news"\)/);
  assert.match(adminClient, /scope === "global"/);
  assert.match(adminClient, /PERMISSIONS.NEWS_PUBLISH/);
  assert.match(mysqlSchema, /export const news = mysqlTable/);
  assert.match(migration, /CREATE TABLE `news`/);
  assert.match(styles, /ticker-scroll/);
  assert.match(translations, /tickerPlay/);
});

test("includes the expanded admin dashboard, users, roles, reports and settings suite", async () => {
  const [dashboardPage, dashboard, usersPage, users, rolesPage, roles, reportsPage, reports, settingsPage, settings, statsApi, analyticsApi, accessApi, rolesConstants, permissions, styles] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/dashboard-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/users/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/users-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/roles/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/roles-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/reports/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/reports-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/settings-admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/stats/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/analytics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sponsor-access/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/constants/roles.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/constants/permissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(dashboardPage, /DashboardAdminClient/);
  assert.match(dashboard, /\/api\/admin\/stats/);
  assert.match(dashboard, /admin-stat-grid/);
  assert.match(dashboard, /admin-dashboard-grid/);
  assert.match(dashboard, /الرعاة النشطون/);
  assert.match(dashboard, /لوحة الإحصاءات/);

  assert.match(usersPage, /UsersAdminClient/);
  assert.match(users, /\/api\/sponsor-access/);
  assert.match(users, /إدارة المستخدمين/);
  assert.match(users, /USERS_DELETE/);

  assert.match(rolesPage, /RolesAdminClient/);
  assert.match(roles, /ROLE_CATALOG/);
  assert.match(roles, /roles-matrix/);
  assert.match(roles, /الأدوار والصلاحيات/);

  assert.match(reportsPage, /ReportsAdminClient/);
  assert.match(reports, /\/api\/admin\/analytics/);
  assert.match(reports, /reports-chart/);
  assert.match(reports, /التقارير والإحصاءات/);

  assert.match(settingsPage, /SettingsAdminClient/);
  assert.match(settings, /\/api\/sponsor-plans/);
  assert.match(settings, /خطط اشتراك الرعاة/);
  assert.match(settings, /maxAds/);

  assert.match(statsApi, /ADMIN_DASHBOARD_VIEW/);
  assert.match(statsApi, /GROUP BY/);
  assert.match(statsApi, /audit_logs/);
  assert.match(statsApi, /sponsor_users/);
  assert.match(analyticsApi, /REPORTS_VIEW/);
  assert.match(analyticsApi, /sponsor_events/);
  assert.match(analyticsApi, /ad_events/);

  assert.match(accessApi, /PERMISSIONS\.USERS_VIEW/);
  assert.match(accessApi, /PERMISSIONS\.USERS_DELETE/);
  assert.match(accessApi, /sponsor.access.deleted/);
  assert.match(rolesConstants, /super_admin/);
  assert.match(rolesConstants, /ROLE_CATALOG/);
  assert.match(permissions, /ADMIN_DASHBOARD_VIEW/);

  assert.match(styles, /\.admin-dashboard-grid/);
  assert.match(styles, /\.roles-matrix/);
  assert.match(styles, /\.reports-chart/);
  assert.match(styles, /\.admin-plans-list/);
});
