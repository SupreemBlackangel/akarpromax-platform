import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("command center overview API enforces RBAC", async () => {
  const route = await readFile(new URL("../app/api/admin/command-center/overview/route.ts", import.meta.url), "utf8");
  assert.match(route, /ADMIN_DASHBOARD_VIEW|REPORTS_VIEW/, "must check RBAC permissions");
  assert.match(route, /force-dynamic/, "must be dynamic");
  assert.match(route, /no-store/, "must disable caching");
});

test("command center service exports getCommandCenterOverview", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /export async function getCommandCenterOverview/, "must export the overview function");
  assert.match(service, /Promise\.all/, "must use parallel queries");
});

test("command center service has all required metric sections", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  const requiredSections = [
    "sponsors:", "ads:", "properties:", "services:", "users:",
    "integration:", "geo:", "news:", "health:", "audit:",
  ];
  for (const section of requiredSections) {
    assert.ok(service.includes(section), `must include ${section} section`);
  }
});

test("command center service has properties drill-down metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.ok(service.includes("property_listings"), "must query property_listings table");
  assert.match(service, /byListingType/, "must have listing type breakdown");
  assert.match(service, /featured/, "must have featured count");
  assert.match(service, /missingCoordinates/, "must have missing coordinates count");
  assert.match(service, /staleCount/, "must have stale listings count");
  assert.match(service, /recentCount/, "must have recent listings count");
});

test("command center service has services marketplace metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /byRequestStatus/, "must have request status breakdown");
  assert.match(service, /byOfferStatus/, "must have offer status breakdown");
  assert.match(service, /byOrderStatus/, "must have order status breakdown");
  assert.match(service, /byProviderStatus/, "must have provider status breakdown");
  assert.match(service, /byDisputeStatus/, "must have dispute status breakdown");
  assert.match(service, /oldestDisputeAge/, "must have oldest dispute aging");
  assert.match(service, /oldestPendingVerificationAge/, "must have oldest pending verification aging");
});

test("command center service has geographic aggregation", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /propertiesByCity/, "must have properties by city");
  assert.match(service, /demandByCity/, "must have demand by city");
  assert.match(service, /providersByCity/, "must have providers by city");
  assert.match(service, /coverageGaps/, "must have coverage gaps");
});

test("command center service has office integration metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /byDeviceStatus/, "must have device status breakdown");
  assert.match(service, /staleDevices/, "must have stale devices count");
  assert.match(service, /bySyncStatus/, "must have sync status breakdown");
  assert.match(service, /failedSyncs/, "must have failed syncs count");
  assert.match(service, /conflictSyncs/, "must have conflict syncs count");
  assert.match(service, /deadLetterSyncs/, "must have dead letter syncs count");
  assert.match(service, /pendingPairings/, "must have pending pairings count");
  assert.match(service, /notificationDeliveries/, "must have notification deliveries");
});

test("command center service has ads metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.ok(service.includes("campaign_type"), "must query campaign_type");
  assert.match(service, /byApprovalStatus/, "must have approval status breakdown");
  assert.match(service, /endingSoon/, "must have ending soon count");
});

test("command center service has user security metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /recentRegistrations/, "must have recent registrations count");
  assert.match(service, /suspendedCount/, "must have suspended count");
  assert.match(service, /pendingVerification/, "must have pending verification count");
});

test("command center service has system health metrics", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.ok(service.includes('"healthy"'), "must have healthy status");
  assert.ok(service.includes('"degraded"'), "must have degraded status");
  assert.ok(service.includes('"unavailable"'), "must have unavailable status");
  assert.match(service, /database:/, "must have database health");
  assert.match(service, /authentication:/, "must have auth health");
  assert.match(service, /realtime:/, "must have realtime health");
  assert.match(service, /officeIntegration:/, "must have office integration health");
  assert.match(service, /email:/, "must have email health");
});

test("command center service has computeAge helper", async () => {
  const service = await readFile(new URL("../lib/command-center/service.ts", import.meta.url), "utf8");
  assert.match(service, /function computeAge/, "must have computeAge helper");
  assert.match(service, /86400000/, "must compute days from milliseconds");
});

test("command center client has all required UI sections", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /cc-stat-grid/, "must have stat grid");
  assert.match(client, /cc-grid-2|cc-grid-3/, "must have grid layouts");
  assert.match(client, /cc-kpi-stack/, "must have KPI stacks");
  assert.match(client, /cc-bars/, "must have bar charts");
  assert.match(client, /cc-mini-bars/, "must have mini bar charts");
  assert.match(client, /StatusBars/, "must have StatusBars component");
  assert.match(client, /MiniBarChart/, "must have MiniBarChart component");
  assert.match(client, /MetricCard/, "must have MetricCard component");
  assert.match(client, /HealthRow/, "must have HealthRow component");
  assert.match(client, /CountryList/, "must have CountryList component");
  assert.match(client, /AuditLog/, "must have AuditLog component");
});

test("command center client has auto-refresh", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /autoRefresh/, "must have auto-refresh state");
  assert.match(client, /30_000|30000/, "must poll every 30 seconds");
  assert.match(client, /setInterval/, "must use setInterval");
});

test("command center client has all panel sections", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  const sections = [
    "الرعاة", "الحملات الإعلانية", "العقارات", "سوق الخدمات",
    "المستخدمون", "التكامل", "جغرافيا", "النظام", "السجل",
  ];
  for (const section of sections) {
    assert.ok(client.includes(section), `must include ${section} section`);
  }
});

test("command center client has properties drill-down UI", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /byListingType/, "must show listing type breakdown");
  assert.match(client, /featured/, "must show featured count");
  assert.match(client, /missingCoordinates|بدون إحداثيات/, "must show missing coordinates");
  assert.match(client, /staleCount|قديمة/, "must show stale count");
  assert.match(client, /recentCount|جديدة/, "must show recent count");
  assert.match(client, /coverageGaps|فجوات التغطية/, "must show coverage gaps");
});

test("command center client has services marketplace UI", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /byRequestStatus/, "must show request status");
  assert.match(client, /byOfferStatus/, "must show offer status");
  assert.match(client, /byOrderStatus/, "must show order status");
  assert.match(client, /byProviderStatus/, "must show provider status");
  assert.match(client, /openDisputes|النزاعات المفتوحة/, "must show open disputes");
  assert.match(client, /oldestDisputeAge|أقدم نزاع/, "must show oldest dispute");
});

test("command center client has geographic intelligence UI", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /propertiesByCity|العقارات حسب المدينة/, "must show properties by city");
  assert.match(client, /demandByCity|الطلب على الخدمات/, "must show demand by city");
  assert.match(client, /providersByCity|المزودون حسب المدينة/, "must show providers by city");
  assert.match(client, /coverageGaps|فجوات التغطية/, "must show coverage gaps");
});

test("command center client has office integration UI", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /byDeviceStatus/, "must show device status");
  assert.match(client, /failedSyncs|فشل/, "must show failed syncs");
  assert.match(client, /conflictSyncs|تعارض/, "must show conflict syncs");
  assert.match(client, /deadLetterSyncs|رسالة ميتة/, "must show dead letter syncs");
  assert.match(client, /pendingPairings|أزواج معلقة/, "must show pending pairings");
  assert.match(client, /staleDevices|أجهزة قديمة/, "must show stale devices");
});

test("command center client has system health UI", async () => {
  const client = await readFile(new URL("../app/admin/command-center-client.tsx", import.meta.url), "utf8");
  assert.match(client, /HealthRow/, "must use HealthRow component");
  assert.match(client, /database|قاعدة البيانات/, "must show database health");
  assert.match(client, /authentication|المصادقة/, "must show auth health");
  assert.match(client, /realtime|البث المباشر/, "must show realtime health");
  assert.match(client, /officeIntegration|تكامل المكتب/, "must show office integration health");
  assert.match(client, /email|البريد الإلكتروني/, "must show email health");
});

test("command center CSS has responsive breakpoints", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media.*max-width.*1100px/, "must have 1100px breakpoint");
  assert.match(css, /@media.*max-width.*780px/, "must have 780px breakpoint");
  assert.match(css, /@media.*max-width.*480px/, "must have 480px breakpoint");
  assert.match(css, /\.cc-stat-grid-6/, "must style 6-column grid");
  assert.match(css, /\.cc-stat-grid-4/, "must style 4-column grid");
  assert.match(css, /\.cc-grid-2/, "must style 2-column grid");
  assert.match(css, /\.cc-grid-3/, "must style 3-column grid");
});

test("command center CSS has dark mode support", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /html\[data-theme="dark"\]\s+\.cc-metric/, "must have dark mode metric styles");
  assert.match(css, /html\[data-theme="dark"\]\s+\.cc-bar-track/, "must have dark mode bar styles");
  assert.match(css, /html\[data-theme="dark"\]\s+\.cc-status-ok/, "must have dark mode status styles");
  assert.match(css, /html\[data-theme="dark"\]\s+\.cc-status-warn/, "must have dark mode warning styles");
});

test("command center CSS has RTL support", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /html\[dir="ltr"\]\s+\.cc-bar-label/, "must have LTR bar label styles");
  assert.match(css, /html\[dir="ltr"\]\s+\.cc-bar-value/, "must have LTR bar value styles");
  assert.match(css, /html\[dir="ltr"\]\s+\.cc-metric-label/, "must have LTR metric label styles");
});

test("command center CSS has reduced motion support", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion.*reduce/, "must have reduced motion media query");
  assert.match(css, /animation-duration.*0\.01ms/, "must disable animations");
  assert.match(css, /transition-duration.*0\.01ms/, "must disable transitions");
});

test("calculator components have Turkish translations", async () => {
  const calculators = [
    "BrickCalc.tsx", "ConcreteCalc.tsx", "BeamCalc.tsx", "RebarCalc.tsx",
    "PaintCalc.tsx", "SlopeCalc.tsx", "TileCalc.tsx", "MixRatioCalc.tsx",
    "AreaCalculator.tsx", "CoordinateConverter.tsx",
  ];
  for (const calc of calculators) {
    const content = await readFile(new URL(`../src/components/tools/${calc}`, import.meta.url), "utf8");
    assert.match(content, /locale === "tr"/, `${calc} must have Turkish locale support`);
    assert.match(content, /locale === "ar"/, `${calc} must have Arabic locale support`);
  }
});

test("command center page renders CommandCenterOverview", async () => {
  const page = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  assert.match(page, /CommandCenterOverview/, "admin page must render CommandCenterOverview");
  assert.match(page, /command-center-client/, "admin page must import command-center-client");
});
