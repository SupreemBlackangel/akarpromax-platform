import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = String(process.env.GEO_RUNTIME_BASE_URL ?? "").replace(/\/$/, "");
const runtimeTest = baseUrl ? test : test.skip;

const IDS = {
  propertyJeddahA: "40000000-0000-4000-8000-000000000001",
  propertyRiyadh: "40000000-0000-4000-8000-000000000002",
  propertyDammam: "40000000-0000-4000-8000-000000000003",
  propertyJeddahB: "40000000-0000-4000-8000-000000000004",
  category: "50000000-0000-4000-8000-000000000001",
  providerJeddah: "60000000-0000-4000-8000-000000000001",
  providerRiyadh: "60000000-0000-4000-8000-000000000002",
  providerDammam: "60000000-0000-4000-8000-000000000003",
  adJeddah: "geo-launch-ad-jeddah",
  adRiyadh: "geo-launch-ad-riyadh",
  adDammam: "geo-launch-ad-dammam",
  adSaudi: "geo-launch-ad-saudi",
  adRadiusNear: "geo-launch-ad-radius-near-jeddah",
  adRadiusOutside: "geo-launch-ad-radius-outside-jeddah",
};

const PROPERTY_IDS = new Set([IDS.propertyJeddahA, IDS.propertyJeddahB, IDS.propertyRiyadh, IDS.propertyDammam]);
const PROVIDER_IDS = new Set([IDS.providerJeddah, IDS.providerRiyadh, IDS.providerDammam]);
const AD_IDS = new Set([IDS.adJeddah, IDS.adRiyadh, IDS.adDammam, IDS.adSaudi, IDS.adRadiusNear, IDS.adRadiusOutside]);

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* HTML response */ }
  return { response, body, text };
}

function fixtureIds(rows, allowed) {
  return rows.map((row) => row.id).filter((id) => allowed.has(id)).sort();
}

async function propertyIds(query) {
  const { response, body } = await request(`/api/properties?limit=50&${query}`);
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  return fixtureIds(body.data ?? [], PROPERTY_IDS);
}

async function providerIds(query) {
  const { response, body } = await request(`/api/service-providers?limit=100&categoryId=${IDS.category}&${query}`);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { ids: fixtureIds(body.profiles ?? [], PROVIDER_IDS), body };
}

async function canonicalAds(location) {
  const { response, body } = await request("/api/ads/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: "/", placement: "HERO", language: "ar", deviceType: "desktop", count: 10, ...location }),
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  return (body.ads ?? []).map((ad) => ad.campaignId).filter((id) => AD_IDS.has(id)).sort();
}

function findForbiddenKey(value, path = "$") {
  const forbidden = new Set([
    "email", "phone", "whatsapp", "user_id", "provider_user_id", "reviewer_user_id",
    "reviewee_user_id", "tax_number", "latitude", "longitude",
  ]);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key.toLowerCase())) return `${path}.${key}`;
    const found = findForbiddenKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

runtimeTest("runtime candidate and geo-dependent public pages return 200", async () => {
  for (const path of ["/", "/properties", "/services", "/providers", `/properties/${IDS.propertyJeddahA}`]) {
    const { response } = await request(path);
    assert.equal(response.status, 200, path);
  }
  const detail = await request(`/api/properties/${IDS.propertyJeddahA}`);
  assert.equal(detail.response.status, 200);
});

runtimeTest("country → region → city → district hierarchy contains all certification locations", async () => {
  const countries = await request("/api/geo?type=countries");
  assert.equal(countries.response.status, 200);
  const sa = countries.body.data.find((row) => String(row.code).toLowerCase() === "sa");
  assert.ok(sa?.id);
  const regions = await request(`/api/geo?type=governorates&parentId=${sa.id}`);
  assert.equal(regions.response.status, 200);
  const regionByCode = new Map(regions.body.data.map((row) => [row.code, row.id]));
  for (const code of ["sa-makkah", "sa-riyadh-region", "sa-eastern"]) assert.ok(regionByCode.has(code), code);
  const expected = [
    ["sa-makkah", "sa-jeddah", "jeddah-rawdah"],
    ["sa-riyadh-region", "sa-riyadh", "riyadh-olaya"],
    ["sa-eastern", "sa-dammam", "dammam-shati"],
  ];
  for (const [regionCode, cityCode, districtCode] of expected) {
    const cities = await request(`/api/geo?type=cities&parentId=${regionByCode.get(regionCode)}`);
    const city = cities.body.data.find((row) => row.code === cityCode);
    assert.ok(city?.id, cityCode);
    const districts = await request(`/api/geo?type=districts&parentId=${city.id}`);
    assert.ok(districts.body.data.some((row) => row.code === districtCode), districtCode);
  }
});

runtimeTest("Properties enforce city, region, district and intentional Saudi-wide scopes server-side", async () => {
  assert.deepEqual(await propertyIds("scope=local&country=sa&city=sa-jeddah"), [IDS.propertyJeddahA, IDS.propertyJeddahB].sort());
  assert.deepEqual(await propertyIds("scope=local&country=sa&city=sa-riyadh"), [IDS.propertyRiyadh]);
  assert.deepEqual(await propertyIds("scope=local&country=sa&city=sa-dammam"), [IDS.propertyDammam]);
  assert.deepEqual(await propertyIds("scope=local&country=sa&governorate=sa-makkah"), [IDS.propertyJeddahA, IDS.propertyJeddahB].sort());
  assert.deepEqual(await propertyIds("scope=local&country=sa&governorate=sa-makkah&city=sa-jeddah&district=jeddah-rawdah"), [IDS.propertyJeddahA, IDS.propertyJeddahB].sort());
  assert.deepEqual(await propertyIds("scope=local&country=sa"), [IDS.propertyDammam, IDS.propertyJeddahA, IDS.propertyJeddahB, IDS.propertyRiyadh].sort());
  assert.deepEqual(await propertyIds("scope=global"), [IDS.propertyDammam, IDS.propertyJeddahA, IDS.propertyJeddahB, IDS.propertyRiyadh].sort());
});

runtimeTest("Properties reject mixed, missing and cross-hierarchy client state", async () => {
  for (const query of [
    "scope=global&country=sa",
    "scope=local",
    "scope=local&country=sa&city=sa-jeddah&district=riyadh-olaya",
    "scope=local&country=ae&city=sa-jeddah",
  ]) {
    const { response, body } = await request(`/api/properties?${query}`);
    assert.equal(response.status, 400, `${query}: ${JSON.stringify(body)}`);
    assert.equal(body.error, "GEO_INVALID_SELECTION");
  }
});

runtimeTest("profession + city and radius provider search is isolated and public DTOs stay private", async () => {
  const jeddah = await providerIds("scope=local&country=sa&cityId=sa-jeddah");
  assert.deepEqual(jeddah.ids, [IDS.providerJeddah]);
  assert.equal(findForbiddenKey(jeddah.body), null);
  assert.deepEqual((await providerIds("scope=local&country=sa&cityId=sa-riyadh")).ids, [IDS.providerRiyadh]);
  assert.deepEqual((await providerIds("scope=local&country=sa&cityId=sa-dammam")).ids, [IDS.providerDammam]);
  assert.deepEqual((await providerIds("scope=local&country=sa")).ids, [IDS.providerDammam, IDS.providerJeddah, IDS.providerRiyadh].sort());
  assert.deepEqual((await providerIds("scope=local&country=sa&cityId=sa-jeddah&latitude=21.543333&longitude=39.172778&radiusKm=10")).ids, [IDS.providerJeddah]);
  assert.deepEqual((await providerIds("scope=local&country=sa&cityId=sa-jeddah&latitude=21.750000&longitude=39.172778&radiusKm=10")).ids, []);
});

runtimeTest("provider API rejects mismatched hierarchy and malformed radius", async () => {
  for (const query of [
    "scope=local&country=sa&cityId=sa-jeddah&districtId=riyadh-olaya",
    "scope=local&country=sa&cityId=sa-jeddah&latitude=21.5&longitude=39.1&radiusKm=501",
    "scope=global&country=sa",
  ]) {
    const { response } = await request(`/api/service-providers?${query}`);
    assert.equal(response.status, 400, query);
  }
});

runtimeTest("canonical ads enforce country, region, city, district and 10 km radius", async () => {
  const jeddahLocation = {
    countryCode: "sa", regionId: "sa-makkah", cityId: "sa-jeddah", districtId: "jeddah-rawdah",
    latitude: 21.543333, longitude: 39.172778,
  };
  assert.deepEqual(await canonicalAds(jeddahLocation), [IDS.adJeddah, IDS.adRadiusNear, IDS.adSaudi].sort());
  assert.deepEqual(await canonicalAds({
    countryCode: "sa", regionId: "sa-riyadh-region", cityId: "sa-riyadh", districtId: "riyadh-olaya",
    latitude: 24.713552, longitude: 46.675296,
  }), [IDS.adRiyadh, IDS.adSaudi].sort());
  assert.deepEqual(await canonicalAds({
    countryCode: "sa", regionId: "sa-eastern", cityId: "sa-dammam", districtId: "dammam-shati",
    latitude: 26.420683, longitude: 50.088794,
  }), [IDS.adDammam, IDS.adSaudi].sort());
  assert.deepEqual(await canonicalAds({ countryCode: "sa" }), [IDS.adSaudi]);
  assert.deepEqual(await canonicalAds({ countryCode: "ae" }), []);
  assert.deepEqual(await canonicalAds({ ...jeddahLocation, districtId: "riyadh-olaya" }), [IDS.adRadiusNear, IDS.adSaudi].sort());
  assert.deepEqual(await canonicalAds({ ...jeddahLocation, latitude: undefined, longitude: undefined }), [IDS.adJeddah, IDS.adSaudi].sort());
  assert.ok((await canonicalAds({ ...jeddahLocation, latitude: 21.6329 })).includes(IDS.adRadiusNear));
  assert.ok(!(await canonicalAds({ ...jeddahLocation, latitude: 21.6343 })).includes(IDS.adRadiusNear));
  assert.ok(!(await canonicalAds(jeddahLocation)).includes(IDS.adRadiusOutside));
  assert.ok((await canonicalAds({ ...jeddahLocation, latitude: 21.75 })).includes(IDS.adRadiusOutside));
});

runtimeTest("legacy advertising route delegates to canonical geo behavior and never returns 500", async () => {
  const query = new URLSearchParams({
    page: "home", placement: "hero", language: "ar", country: "sa", governorate: "sa-makkah",
    city: "sa-jeddah", district: "jeddah-rawdah", latitude: "21.543333", longitude: "39.172778",
  });
  const { response, body } = await request(`/api/advertising/match?${query}`);
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  const ids = (body.data.ads ?? []).map((ad) => ad.campaign.id).filter((id) => AD_IDS.has(id)).sort();
  assert.deepEqual(ids, [IDS.adJeddah, IDS.adRadiusNear, IDS.adSaudi].sort());

  query.set("city", "sa-riyadh");
  query.set("governorate", "sa-riyadh-region");
  query.set("district", "riyadh-olaya");
  query.set("latitude", "24.713552");
  query.set("longitude", "46.675296");
  const riyadh = await request(`/api/advertising/match?${query}`);
  assert.equal(riyadh.response.status, 200);
  const riyadhIds = (riyadh.body.data.ads ?? []).map((ad) => ad.campaign.id).filter((id) => AD_IDS.has(id)).sort();
  assert.deepEqual(riyadhIds, [IDS.adRiyadh, IDS.adSaudi].sort());
});

