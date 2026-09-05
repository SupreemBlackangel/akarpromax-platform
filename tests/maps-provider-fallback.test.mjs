// Swapping the platform's maps to Google must not make a map a single point of
// failure. The key is a runtime setting: it can be absent, revoked, or over
// quota, and an office pinning a property must still get a map. These assert
// the two halves of that contract on the executable code.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");
/** Assert on executable code, not on the prose that explains it. */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");
const SURFACES = [
  "components/properties/PropertyLocationMap.tsx",
  "components/properties/PropertyDetailMap.tsx",
  "src/components/services/ServiceLocationPicker.tsx",
];

test("every map surface falls back to its OpenStreetMap implementation", async () => {
  for (const surface of SURFACES) {
    const source = await read(surface);
    assert.match(source, /useGoogleMaps\(\)/, surface);
    assert.match(source, /Leaflet/, `${surface} must keep an OSM fallback`);
    assert.match(source, /status === ["']ready["']/, surface);
  }
});

test("the key is read at request time, never inlined into the bundle", async () => {
  const route = await read("app/api/maps/config/route.ts");
  assert.match(route, /process\.env\.GOOGLE_MAPS_API_KEY/);
  assert.match(route, /dynamic = "force-dynamic"/);
  // NEXT_PUBLIC_* is inlined by `next build`; rotating the key would then mean
  // a rebuild, and the key would live in the deployed artefact.
  assert.doesNotMatch(strip(route), /NEXT_PUBLIC/);
  for (const surface of [...SURFACES, "src/components/maps/useGoogleMaps.ts", "src/components/maps/GoogleLocationMap.tsx"]) {
    assert.doesNotMatch(strip(await read(surface)), /NEXT_PUBLIC_GOOGLE/, surface);
  }
});

test("no API key is committed to the repository", async () => {
  for (const file of [...SURFACES, "app/api/maps/config/route.ts", "src/components/maps/useGoogleMaps.ts"]) {
    // Google API keys are "AIza" followed by 35 url-safe characters.
    assert.doesNotMatch(await read(file), /AIza[0-9A-Za-z_-]{35}/, `${file} must not carry a literal key`);
  }
});

test("with no key configured the endpoint reports the OSM provider", async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  try {
    const { GET } = await import("../app/api/maps/config/route.ts");
    const body = await (await GET()).json();
    assert.equal(body.provider, "osm");
    assert.equal(body.googleMapsApiKey, null);
  } finally {
    if (previous !== undefined) process.env.GOOGLE_MAPS_API_KEY = previous;
  }
});
