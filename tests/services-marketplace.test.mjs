import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the services marketplace ships public hub, catalog and provider profile pages", async () => {
  const [hub, category, providers, requests, requestDetail, newRequest, offerForm, apply] = await Promise.all([
    readFile(new URL("../app/services/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/services/catalog/[code]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/providers/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/new/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/service-requests/[id]/offer/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/providers/apply/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(hub, /CategoryCard/);
  assert.match(hub, /ProviderCard/);
  assert.match(hub, /RequestCard/);
  assert.match(hub, /apiFetch<\{ categories: CategoryRow\[\] \}>\("\/api\/service-categories\?country=OM"\)/);
  assert.match(hub, /AdSlot/);
  assert.match(hub, /services_hub_mid/);
  assert.match(category, /service-providers\?categoryId=\$\{encodeURIComponent\(found\.id\)\}/);
  assert.match(category, /\.find\(\(c\) => c\.code === code\)/);
  assert.match(providers, /service-reviews\?revieweeUserId=/);
  assert.match(providers, /RatingStars/);
  assert.match(requests, /service-requests\?status=published/);
  assert.match(requestDetail, /makeOffer/);
  assert.match(requestDetail, /OfferStatusPill|RequestStatusPill/);
  assert.match(newRequest, /dynamic_fields/);
  assert.match(newRequest, /needsVisit/);
  assert.match(newRequest, /publishNow/);
  assert.match(offerForm, /\/api\/service-offers/);
  assert.match(apply, /becomeProvider/);
});

test("services admin exists behind a permission gate and manages providers, reports and categories", async () => {
  const [page, client, adminApi, reportsApi, resolveApi, categoriesApi, marketplace] = await Promise.all([
    readFile(new URL("../app/admin/services/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/services/admin-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-admin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-reports/[id]/resolve/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/marketplace.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getSessionIdentity/);
  assert.doesNotMatch(page, /requireChatGPTUser/);
  assert.match(page, /SERVICE_CATEGORIES_MANAGE/);
  assert.match(page, /SERVICE_PROVIDERS_REVIEW/);
  assert.match(page, /PermissionGuard/);
  assert.match(client, /AdminPageShell/);
  assert.match(client, /activeSection="services"/);
  assert.match(client, /api\/service-admin/);
  assert.match(client, /api\/service-providers\?status=under_review/);
  assert.match(client, /api\/service-reports/);
  assert.match(client, /api\/service-categories/);
  assert.match(client, /إدارة سوق الخدمات/);
  assert.match(client, /مقدمو الخدمات/);
  assert.match(adminApi, /getAdminOverview/);
  assert.match(adminApi, /SERVICE_CATEGORIES_MANAGE/);
  assert.match(marketplace, /service_provider_profiles/);
  assert.match(reportsApi, /SERVICE_REPORTS_MANAGE/);
  assert.match(resolveApi, /SERVICE_REPORTS_MANAGE/);
  assert.match(categoriesApi, /requiresLicense/);
  assert.match(categoriesApi, /CATEGORY_CONFLICT/);
});

test("marketplace domain functions cover the full lifecycle", async () => {
  const [marketplace, client, badges, cards] = await Promise.all([
    readFile(new URL("../lib/services/marketplace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/services-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/services/ServiceStatusBadges.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/services/ServiceCards.tsx", import.meta.url), "utf8"),
  ]);

  for (const fn of [
    "createServiceCategory",
    "createRequestFull",
    "publishRequest",
    "listRequestsFull",
    "createOfferFull",
    "listOffersForParticipant",
    "acceptOfferFlow",
    "updateJobStatus",
    "listJobs",
    "addReviewFull",
    "createReport",
    "resolveReport",
    "sendMessageFull",
    "listInbox",
    "listNotifications",
    "unreadNotificationsCount",
    "getAdminOverview",
    "deleteServiceCategory",
  ]) {
    assert.match(marketplace, new RegExp(`export async function ${fn}`), `missing ${fn}`);
  }

  assert.match(marketplace, /export async function listMatchedRequestsForProvider/);
  assert.match(marketplace, /service_request_matches/);
  assert.match(marketplace, /provider_ignored = 1/);
  assert.match(marketplace, /ON CONFLICT|ON DUPLICATE|INSERT/);
  assert.match(marketplace, /ORDER BY m.score DESC/);

  assert.match(client, /export async function apiFetch/);
  assert.match(client, /export function formatMoney/);
  assert.match(client, /export function formatTime/);
  assert.match(client, /export function parseJsonArray/);
  assert.match(client, /export function nameFor/);

  assert.match(badges, /export function RequestStatusPill/);
  assert.match(badges, /export function OfferStatusPill/);
  assert.match(badges, /export function OrderStatusPill/);
  assert.match(badges, /export function ProviderStatusPill/);
  assert.match(cards, /export function CategoryCard/);
  assert.match(cards, /export function ProviderCard/);
  assert.match(cards, /export function JobCard/);
  assert.match(cards, /export function RatingStars/);
});

test("dashboard shell shows a live notifications bell", async () => {
  const shell = await readFile(new URL("../src/components/services/ServiceDashboardShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /function NotificationsBell/);
  assert.match(shell, /api\/service-notifications\?limit=10/);
  assert.match(shell, /read-all/);
  assert.match(shell, /apiFetch<\{ notifications: NotificationRow\[\]; unread: number \}>/);
  assert.match(shell, /determine-all-as-read|تحديد الكل كمقروء/);
});

test("the services module uses session-only identity and never ChatGPT identity", async () => {
  const { glob } = await import("node:fs/promises");
  const files = [];
  for await (const entry of glob("app/api/service-*/**/*.ts")) files.push(entry);
  for await (const entry of glob("lib/services/*.ts")) files.push(entry);
  for (const file of [...new Set(files)]) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /getSponsorIdentity|requireChatGPTUser|getChatGPTUser/, `ChatGPT identity in ${file}`);
  }
  const adminPage = await readFile(new URL("../app/admin/services/page.tsx", import.meta.url), "utf8");
  assert.match(adminPage, /getSessionIdentity/);
  assert.doesNotMatch(adminPage, /getSponsorIdentity|requireChatGPTUser|getChatGPTUser/);
});

test("services API routes enforce identity and permission guards", async () => {
  const [requestsApi, offersApi, providersApi, matchedApi, notificationsApi, messagesApi, jobsApi] = await Promise.all([
    readFile(new URL("../app/api/service-requests/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-offers/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-providers/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-providers/me/matched-requests/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-notifications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/service-jobs/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(requestsApi, /SERVICE_ERROR_CODES.UNAUTHORIZED/);
  assert.match(requestsApi, /mine/);
  assert.match(requestsApi, /listRequestsFull/);
  assert.match(offersApi, /listOffersForParticipant/);
  assert.match(offersApi, /SERVICE_OFFERS_MANAGE_OWN/);
  assert.match(providersApi, /SERVICE_PROVIDERS_REVIEW/);
  assert.match(providersApi, /status/);
  assert.match(matchedApi, /listMatchedRequestsForProvider/);
  assert.match(notificationsApi, /unreadNotificationsCount/);
  assert.match(notificationsApi, /Cache-Control.*no-store/);
  assert.match(messagesApi, /sendMessageFull/);
  assert.match(jobsApi, /listJobs/);
});

test("the marketplace seed registers the initial categories", async () => {
  const [script, seed] = await Promise.all([
    readFile(new URL("../scripts/seed-services-marketplace.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/seed-marketplace.ts", import.meta.url), "utf8"),
  ]);
  assert.match(script, /seedServicesMarketplace/);
  assert.match(seed, /export async function seedServicesMarketplace/);
  assert.match(seed, /ac-repair/);
  assert.match(seed, /plumbing/);
  assert.match(seed, /electrical/);
  assert.match(seed, /dynamicFields/);
});

test("provider dashboard ships all ten pages behind auth and boundary-clean aliases", async () => {
  const files = [
    "../app/dashboard/services/page.tsx",
    "../app/dashboard/services/inbox/page.tsx",
    "../app/dashboard/services/jobs/page.tsx",
    "../app/dashboard/services/jobs/[id]/page.tsx",
    "../app/dashboard/services/matched-requests/page.tsx",
    "../app/dashboard/services/my-requests/page.tsx",
    "../app/dashboard/services/offers/page.tsx",
    "../app/dashboard/services/offers/[id]/page.tsx",
    "../app/dashboard/services/provider-profile/page.tsx",
    "../app/dashboard/services/reviews/page.tsx",
  ];
  for (const file of files) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /"use client"/, `${file} must be a client page`);
    assert.match(content, /useServicesPage/, `${file} must use useServicesPage`);
    assert.match(content, /ServiceDashboardShell/, `${file} must render the dashboard shell`);
    assert.match(content, /viewer\.authenticated/, `${file} must gate on authentication`);
    assert.match(content, /@services-ui\//, `${file} must import via @services-ui`);
    assert.match(content, /@services-client/, `${file} must import via @services-client`);
    assert.doesNotMatch(content, /@\/lib\/services|@\/src\/components\/services|@\/src\/lib\/services-client/, `${file} leaks legacy services paths`);
    assert.doesNotMatch(content, /getSponsorIdentity|requireChatGPTUser|getChatGPTUser/, `${file} must stay session-only`);
  }
  const shell = await readFile(new URL("../src/components/services/ServiceDashboardShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /if \(!viewer\.authenticated\)/, "shell must gate anonymous viewers");
});

test("provider lifecycle statuses are fully labeled and drive the profile apply gate", async () => {
  const [client, profile] = await Promise.all([
    readFile(new URL("../src/lib/services-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/services/provider-profile/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const status of ["draft", "submitted", "under_review", "approved", "rejected", "suspended"]) {
    assert.match(client, new RegExp(`${status}: \\{ ar:`), `providerStatusLabel must cover ${status}`);
    assert.match(client, new RegExp(`${status}: "(default|warning|success|error)"`), `providerStatusColor must cover ${status}`);
  }
  assert.match(profile, /ProviderStatusPill status=\{profile\.status\}/);
  assert.match(profile, /profile\.status === "draft" \|\| profile\.status === "rejected"/);
  assert.match(profile, /\/api\/service-providers\/\$\{encodeURIComponent\(profile\.id\)\}\/apply/);
  assert.match(profile, /service_radius_km/);
});

test("offer and job detail pages enforce participant authz separation", async () => {
  const [offer, job, matched] = await Promise.all([
    readFile(new URL("../app/dashboard/services/offers/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/services/jobs/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/services/matched-requests/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(offer, /isCustomer && status === "sent"/);
  assert.match(offer, /isProvider && status === "sent"/);
  assert.match(offer, /isProvider && status === "withdrawn"/);
  assert.match(offer, /\/api\/service-offers\/\$\{encodeURIComponent\(id\)\}\/\$\{path\}/);
  assert.match(offer, /window\.location\.href = "\/dashboard\/services\/jobs"/);
  assert.match(job, /disputed: \["completed"\]/);
  assert.match(job, /const canReview = job\?\.status === "completed" && !reviewed;/);
  assert.match(job, /ThreadMessages threadType="order"/);
  assert.match(matched, /hasProfile === false/);
  assert.match(matched, /\/dashboard\/services\/provider-profile/);
});
