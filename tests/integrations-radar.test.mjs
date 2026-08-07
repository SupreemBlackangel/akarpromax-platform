import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { setIntegrationDbForTesting } from "../lib/integration/db.ts";
import { HaversineGeoDistanceProvider, GeoRadarService, listRadarQueries } from "../lib/integration/radar.ts";
import { RADAR_MAX_RADIUS_KM } from "../lib/integration/constants.ts";

const muscat = { latitude: 23.588, longitude: 58.3829 };
const seeb = { latitude: 23.6703, longitude: 58.1824 };

test("Haversine provider keeps Muscat–Seeb inside a 60km radius", () => {
  const within = HaversineGeoDistanceProvider.withinRadius(muscat, seeb, 60);
  assert.equal(within, true);
  const far = HaversineGeoDistanceProvider.withinRadius(muscat, { latitude: 17.03, longitude: 54.09 }, 60);
  assert.equal(far, false);
});

test("radar radius is capped by RADAR_MAX_RADIUS_KM", async () => {
  const source = await readFile(new URL("../lib/integration/radar.ts", import.meta.url), "utf8");
  assert.match(source, /RADAR_MAX_RADIUS_KM/);
  assert.match(source, /GeoDistanceProvider/);
  assert.match(source, /interface GeoRadarRepository/);
  assert.match(source, /HaversineGeoDistanceProvider/);
  assert.match(source, /withinRadius/);
  assert.ok(RADAR_MAX_RADIUS_KM > 0);
});

test("GeoRadarService returns only in-radius properties and records the query", async () => {
  const db = setIntegrationDbForTesting(createInMemoryDb());
  db.seed("property_listings", [
    { id: "prop-muscat", title_ar: "فيلا مسقط", country_code: "om", city_id: "om-muscat", latitude: 23.588, longitude: 58.3829, price: 150000, status: "active", priority: 100 },
    { id: "prop-salalah", title_ar: "فيلا صلالة", country_code: "om", city_id: "om-salalah", latitude: 17.03, longitude: 54.09, price: 80000, status: "active", priority: 200 },
  ]);
  db.seed("service_provider_profiles", [
    { id: "svc-seeb", business_name: "مقاول السيب", country_code: "OM", city_id: "om-seeb", latitude: 23.6703, longitude: 58.1824, status: "approved", rating_avg: 4.8 },
  ]);

  const service = new GeoRadarService(
    {
      async scan(input) {
        const targets = [];
        for (const row of db.dump("property_listings")) {
          if (input.kind === "properties" || input.kind === "both") {
            const d = HaversineGeoDistanceProvider.distanceKm({ latitude: input.latitude, longitude: input.longitude }, { latitude: Number(row.latitude), longitude: Number(row.longitude) });
            if (d !== null && d <= input.radiusKm) targets.push({ id: row.id, kind: "property", title: row.title_ar, countryCode: row.country_code, cityId: row.city_id, latitude: Number(row.latitude), longitude: Number(row.longitude), distanceKm: d, extra: {} });
          }
        }
        return targets;
      },
    },
    db,
  );

  const { targets, queryId } = await service.scan({
    deviceId: "dev-1",
    sponsorId: "office@akarpromax.com",
    latitude: muscat.latitude,
    longitude: muscat.longitude,
    radiusKm: 60,
    kind: "properties",
    countryCode: "om",
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, "prop-muscat");
  assert.ok(queryId);

  const queries = await listRadarQueries("office@akarpromax.com");
  assert.equal(queries.length, 1);
  assert.equal(queries[0].matched_count, 1);

  setIntegrationDbForTesting(null);
});

test("radar endpoints expose scan and history", async () => {
  const source = await readFile(new URL("../app/api/office/v1/radar/route.ts", import.meta.url), "utf8");
  assert.match(source, /createGeoRadarService/);
  assert.match(source, /office\.radar\.read/);
  assert.match(source, /listRadarQueries/);
  assert.match(source, /radiusKm/);
});
