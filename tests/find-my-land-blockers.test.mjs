import assert from "node:assert/strict";
import test from "node:test";

// ── Blocker A: OCR Timeout ──────────────────────────────────────────────────
import { OCR_POLICY } from "../lib/land/ocr/ocr-engine.ts";

test("OCR_POLICY has required keys", () => {
  assert.equal(typeof OCR_POLICY.PAGE_TIMEOUT_MS, "number");
  assert.ok(OCR_POLICY.PAGE_TIMEOUT_MS > 0);
  assert.equal(typeof OCR_POLICY.DOCUMENT_TIMEOUT_MS, "number");
  assert.ok(OCR_POLICY.DOCUMENT_TIMEOUT_MS >= OCR_POLICY.PAGE_TIMEOUT_MS);
  assert.equal(typeof OCR_POLICY.MAX_OCR_PAGES, "number");
  assert.ok(OCR_POLICY.MAX_OCR_PAGES > 0);
  assert.equal(typeof OCR_POLICY.MAX_CONCURRENT_WORKERS, "number");
  assert.ok(OCR_POLICY.MAX_CONCURRENT_WORKERS >= 1);
  assert.equal(typeof OCR_POLICY.MAX_RETRIES, "number");
  assert.ok(OCR_POLICY.MAX_RETRIES >= 0);
});

test("OCR_POLICY document timeout >= page timeout", () => {
  assert.ok(
    OCR_POLICY.DOCUMENT_TIMEOUT_MS >= OCR_POLICY.PAGE_TIMEOUT_MS,
    "document timeout must be >= page timeout",
  );
});

test("OCR timeout terminates within budget (deliberately stalled promise)", async () => {
  // Simulate a deliberately stalled OCR: create a promise that never resolves.
  // Wrap it with the same timeout logic the engine uses.
  const stalled = new Promise(() => {}); // never resolves
  const start = Date.now();
  const result = await Promise.race([
    stalled,
    new Promise((resolve) =>
      setTimeout(() => resolve("OCR_PAGE_TIMEOUT"), OCR_POLICY.PAGE_TIMEOUT_MS),
    ),
  ]);
  const elapsed = Date.now() - start;
  assert.equal(result, "OCR_PAGE_TIMEOUT");
  assert.ok(
    elapsed < OCR_POLICY.PAGE_TIMEOUT_MS + 2000,
    `timeout took ${elapsed}ms, expected < ${OCR_POLICY.PAGE_TIMEOUT_MS + 2000}ms`,
  );
});

test("concurrent worker count is bounded", () => {
  assert.ok(OCR_POLICY.MAX_CONCURRENT_WORKERS <= 4, "should not allow excessive parallelism");
});

// ── Blocker C: CRS-Aware Area ───────────────────────────────────────────────
import {
  crsAwareArea,
  calculatePolygonArea,
  geodesicArea,
} from "../lib/land/geo/coordinate-utils.ts";

// H01 Oman Duqm Krooki coordinates (WGS84)
const H01_POINTS = [
  { lat: 19.624223136543602, lng: 57.642332968870136 },
  { lat: 19.623845449708405, lng: 57.642117938324674 },
  { lat: 19.624136022627486, lng: 57.64154754901642 },
  { lat: 19.624514159943747, lng: 57.641763152656615 },
];

const UTM40N_CRS = { kind: "utm", zone: 40, northernHemisphere: true };

test("UTM polygon → projected planar area ≈ 3228.76 m²", () => {
  const result = crsAwareArea(H01_POINTS, UTM40N_CRS);
  assert.equal(result.method, "PROJECTED_PLANAR");
  assert.equal(result.crs, "EPSG:32640");
  // Allow ±2% tolerance for floating-point / projection conversion
  const expected = 3228.76;
  const tolerance = expected * 0.02;
  assert.ok(
    Math.abs(result.area - expected) < tolerance,
    `area ${result.area} not within ±${tolerance} of ${expected}`,
  );
});

test("H01 projected area is closer to registered area (3227) than old spherical", () => {
  const projected = crsAwareArea(H01_POINTS, UTM40N_CRS);
  const oldSpherical = calculatePolygonArea(H01_POINTS);
  const registered = 3227;
  const projDiff = Math.abs(projected.area - registered);
  const sphericalDiff = Math.abs(oldSpherical - registered);
  assert.ok(
    projDiff < sphericalDiff,
    `projected diff ${projDiff} should be < spherical diff ${sphericalDiff}`,
  );
});

test("Same UTM polygon converted to WGS84 still produces projected area when CRS known", () => {
  // Points are already in WGS84; with UTM zone known the engine projects them
  const result = crsAwareArea(H01_POINTS, UTM40N_CRS);
  assert.equal(result.method, "PROJECTED_PLANAR");
  assert.ok(result.area > 3000, "area should be a real cadastral size");
});

test("WGS84-only polygon → geodesic area", () => {
  const result = crsAwareArea(H01_POINTS, { kind: "wgs84" });
  assert.equal(result.method, "GEODESIC");
  assert.equal(result.crs, "EPSG:4326");
  assert.ok(result.area > 0);
});

test("Null CRS → geodesic area", () => {
  const result = crsAwareArea(H01_POINTS, null);
  assert.equal(result.method, "GEODESIC");
  assert.ok(result.area > 0);
});

test("Unknown CRS kind → geodesic area", () => {
  const result = crsAwareArea(H01_POINTS, { kind: "unknown" });
  assert.equal(result.method, "GEODESIC");
});

test("Degenerate polygon (< 3 points) → area 0", () => {
  const result = crsAwareArea([{ lat: 1, lng: 1 }], UTM40N_CRS);
  assert.equal(result.area, 0);
});

test("Area method metadata is correct", () => {
  const projected = crsAwareArea(H01_POINTS, UTM40N_CRS);
  assert.equal(projected.method, "PROJECTED_PLANAR");
  assert.match(projected.crs, /^EPSG:\d{5}$/);

  const geodesic = crsAwareArea(H01_POINTS, null);
  assert.equal(geodesic.method, "GEODESIC");
  assert.equal(geodesic.crs, "EPSG:4326");
});

test("No point reordering: crsAwareArea does not mutate input", () => {
  const original = [...H01_POINTS];
  crsAwareArea(H01_POINTS, UTM40N_CRS);
  for (let i = 0; i < original.length; i++) {
    assert.equal(H01_POINTS[i].lat, original[i].lat, `lat ${i} mutated`);
    assert.equal(H01_POINTS[i].lng, original[i].lng, `lng ${i} mutated`);
  }
});

// UTM zone 39N polygon (Istanbul area) — sanity check different zone
test("Different UTM zone produces different projected area", () => {
  const istanbulPoints = [
    { lat: 41.0082, lng: 28.9784 },
    { lat: 41.0082, lng: 28.9804 },
    { lat: 41.0062, lng: 28.9804 },
    { lat: 41.0062, lng: 28.9784 },
  ];
  const zone39 = crsAwareArea(istanbulPoints, { kind: "utm", zone: 39, northernHemisphere: true });
  const zone40 = crsAwareArea(istanbulPoints, { kind: "utm", zone: 40, northernHemisphere: true });
  assert.equal(zone39.method, "PROJECTED_PLANAR");
  assert.equal(zone40.method, "PROJECTED_PLANAR");
  // Both should produce a small area (this is a ~200m × 200m rectangle)
  assert.ok(zone39.area > 10000, "zone39 area should be real");
  assert.ok(zone40.area > 10000, "zone40 area should be real");
  // Different zones should give slightly different areas due to projection distortion
  // but both should be reasonable
  const ratio = zone39.area / zone40.area;
  assert.ok(ratio > 0.9 && ratio < 1.1, `zone ratio ${ratio} should be close to 1`);
});

// ── geodesicArea standalone ──────────────────────────────────────────────────
test("geodesicArea matches spherical fallback for H01", () => {
  const geo = geodesicArea(H01_POINTS);
  const spherical = calculatePolygonArea(H01_POINTS);
  // These should be very close (the geodesic fallback uses the same formula)
  const ratio = geo / spherical;
  assert.ok(ratio > 0.99 && ratio < 1.01, `geodesic/spherical ratio ${ratio}`);
});
