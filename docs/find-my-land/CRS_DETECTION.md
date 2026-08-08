# Find My Land — CRS Detection & Conversion

`lib/land/intelligence/crs-detector.ts`

## Detection

`CrsDetector.detect(text, evidence)` returns:

```ts
{
  kind: "wgs84" | "utm" | "gcs" | "unknown";
  zone?: number;              // UTM zone, valid 1..60
  northernHemisphere: boolean;
  confidence: "DETECTED" | "PROBABLE" | "AMBIGUOUS" | "UNKNOWN";
  epsgHints: number[];
  datumHints: string[];
  zoneHints: string[];
  reason: string;
}
```

Sources, in order:

1. **EPSG codes** — `EPSG:4326` → WGS84. `EPSG:326NN` (north) /
   `EPSG:327NN` (south) → UTM zone NN. Detected with
   `EPSG\s*[:#]?\s*(\d{4,6})` (case-insensitive, unescaped `E` fixed so it
   matches `EPSG:4326`).
2. **Datums** — `WGS84`, `Ain el Abd`/`Ain el Abd 1970`, `GCS`, `NAD83`,
   `NAD27`, etc.
3. **Zones** — `UTM Zone NN`, `Zone NN`, Arabic `النطاق NN`, or a bare
   `NN`+hemisphere letter. Zones are validated to `1..60`; invalid zones are
   dropped (never guessed).
4. **Evidence shapes** — coordinate evidence whose `crsHint` is `utm` or whose
   raw text looks like `12N 5xxxxxx 3xxxxxx` forces UTM detection.

## Conversion

`toWgs84Point(raw, format, kind, zone, northernHemisphere)`:

- **decimal** — parsed directly as lat/lon.
- **dms** — degrees/minutes/seconds → decimal.
- **utm** — `convertUtmToWgs84(easting, northing, zone, hemisphere)`; requires
  a valid zone; `convertWithProj4` handles the projection.
- **grid** — treated as UTM-like when a zone is present.

`convertWithProj4` uses `proj4` (already a dependency, used by
`src/lib/tools/land-analysis.ts`). UTM zone central meridians: zone `N` central
meridian is `-177 + 6N` degrees; zone 39 → 51°. `inferZoneFromLon(lon)` maps a
longitude back to its UTM zone.

## WGS84 checks

The `WGS\s*84` and `EPSG:4326` patterns drive the WGS84 path. Any explicit
coordinate with a non-`UNKNOWN` CRS raises location confidence to `HIGH`
(see `CONFIDENCE.md`).

## Reference Values

- `toWgs84Point("39N 450000 2600000", ...)` →
  `{ lat: 23.50942472545746, lon: 50.51025414854827 }`.
- Zone 39 central meridian = 51°. Tests assert `lon > 49 && lon < 52`.

## Non-Assumption Rule

A zone/crs is never guessed from coordinates alone. `collectZones` only pushes
zones in the valid 1..60 range. If the CRS cannot be determined,
`kind === "unknown"`, `confidence === "UNKNOWN"`, and coordinates are marked
`PARTIALLY_RESOLVED` rather than converted on a guess.
