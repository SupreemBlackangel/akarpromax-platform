# Geo Radar — Connected Ecosystem (Stage B)

Status: **Implemented** (Haversine) · PostGIS adapter reserved

## Interface

`lib/integration/radar.ts` defines the provider-neutral seam:

```ts
interface GeoDistanceProvider {
  withinRadius(origin: GeoPoint, target: GeoPoint, radiusKm: number): boolean;
  distanceKm(origin: GeoPoint, target: GeoPoint): number | null;
}
```

- `HaversineGeoDistanceProvider` — self-contained Haversine implementation
  (`haversineKm`, earth radius 6371 km) so the integration module has no
  cross-module import into the services domain. Radius is capped at
  `RADAR_MAX_RADIUS_KM = 100`.
- `PostGISGeoDistanceProvider` — **reserved contract**, not implemented. Swapping it
  in later requires no change to `GeoRadarService`.

## Data access

- `GeoRadarRepository.scan(input)` — the default `DbGeoRadarRepository` queries
  `property_listings` (status `active`, country-scoped) and
  `service_provider_profiles` (status `approved`, `rating_avg DESC`), then filters
  with the distance provider in JS. Targets are sorted by distance ascending.
- `GeoRadarService.scan` wraps a repository, records every scan into
  `office_radar_queries` (device, sponsor, lat/lng, radius, kind, filters JSON,
  `matched_count`), and returns `{ targets, queryId }`.

## API

- `POST /api/office/v1/radar` — device-authenticated, scope `office.radar.read`.
  Body: `latitude`, `longitude`, `radiusKm`, `kind` (`properties|services|both`),
  optional `countryCode` / `filters`.
- `GET /api/office/v1/radar` — scan history for the calling sponsor (recent 20).

## Geo dependency notes

- `property_listings` gains `latitude REAL NULL` / `longitude REAL NULL` via
  `INTEGRATION_ALTER_SQL` (tolerant duplicate-column catch). Property sync pushes
  latitude/longitude through `pickPropertyColumns` as `latitude`/`longitude`.
- Distance is Haversine (km) — adequate for office radius matching; PostGIS would
  only change the provider, not the service or routes.
