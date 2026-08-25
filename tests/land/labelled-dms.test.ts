import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeExtractedText } from "@/lib/geo/text-extraction";
import { extractGeoEvidence } from "@/lib/geo/evidence-extraction";
import { collectDmsComponents } from "@/lib/geo/coordinate-parsing";
import type { Point } from "@/lib/geo/contracts";

/** Coordinate candidates the engine is willing to stand behind. */
function candidates(text: string) {
  return extractGeoEvidence(normalizeExtractedText(text)).explicitCoordinates;
}
function firstPoint(text: string): Point | undefined {
  return (candidates(text)[0] as { point?: Point } | undefined)?.point;
}

const LAT = 21 + 32 / 60 + 35.4 / 3600;   // 21.543166…
const LON = 39 + 10 / 60 + 22.2 / 3600;   // 39.172833…
const near = (a: number, b: number) => Math.abs(a - b) < 0.00002;

describe("labelled DMS", () => {
  /**
   * The defect this covers is general, not linguistic: a hemisphere letter was
   * matched even when it was the last letter of an ordinary word, so the `e`
   * ending `Latitude` and `Longitude` was read as East. The more explicitly a
   * document labelled its coordinates, the less of it was read.
   */
  describe("a word's last letter is not a hemisphere", () => {
    it("does not read the `e` of Latitude as East", () => {
      const components = collectDmsComponents(`Latitude 21°32'35.4" N`);
      assert.equal(components.length, 1);
      assert.equal(components[0].hemisphere, "N");
    });

    it("does not read the `e` of Longitude as East", () => {
      const components = collectDmsComponents(`Longitude 39°10'22.2" W`);
      assert.equal(components.length, 1);
      assert.equal(components[0].hemisphere, "W");
      assert.ok(components[0].value < 0, "W must be negative");
    });

    it("still accepts a hemisphere letter that does stand alone", () => {
      const components = collectDmsComponents(`N 21°32'35.4" E 39°10'22.2"`);
      assert.equal(components.length, 2);
      assert.deepEqual(components.map((c) => c.hemisphere), ["N", "E"]);
    });
  });

  describe("English labels", () => {
    const forms: [string, string][] = [
      ["Latitude / Longitude, same line", `Latitude 21°32'35.4"N, Longitude 39°10'22.2"E`],
      ["with a trailing period", `Latitude 21°32'35.4" N., Longitude 39°10'22.2" E.`],
      ["colon after the label", `Lat: 21° 32' 35.4" N  Lon: 39° 10' 22.2" E`],
      ["Lng abbreviation", `Lat 21°32'35.4"N Lng 39°10'22.2"E`],
      ["lower case labels", `latitude 21°32'35.4"n longitude 39°10'22.2"e`],
      ["slash separated", `Latitude 21°32'35.4"N / Longitude 39°10'22.2"E`],
      ["generous whitespace", `Latitude    21 ° 32 ' 35.4 " N     Longitude    39 ° 10 ' 22.2 " E`],
      ["multi-line pair", `Latitude 21°32'35.4"N\nLongitude 39°10'22.2"E`],
    ];
    for (const [name, text] of forms) {
      it(name, () => {
        const point = firstPoint(text);
        assert.ok(point, `${name}: nothing extracted`);
        assert.ok(near(point.lat, LAT), `${name}: lat ${point.lat}`);
        assert.ok(near(point.lon, LON), `${name}: lon ${point.lon}`);
      });
    }

    it("reads a longitude-first document without swapping the axes", () => {
      const point = firstPoint(`Longitude 39°10'22.2"E, Latitude 21°32'35.4"N`);
      assert.ok(point);
      assert.ok(near(point.lat, LAT), `lat ${point.lat}`);
      assert.ok(near(point.lon, LON), `lon ${point.lon}`);
    });

    it("keeps southern and western signs", () => {
      const point = firstPoint(`Latitude 21°32'35.4"S, Longitude 39°10'22.2"W`);
      assert.ok(point);
      assert.ok(near(point.lat, -LAT), `lat ${point.lat}`);
      assert.ok(near(point.lon, -LON), `lon ${point.lon}`);
    });
  });

  describe("Arabic labels", () => {
    it("reads خط العرض / خط الطول with hemisphere letters", () => {
      const point = firstPoint(`خط العرض 21°32'35.4"N خط الطول 39°10'22.2"E`);
      assert.ok(point, "nothing extracted from the Arabic-labelled pair");
      assert.ok(near(point.lat, LAT), `lat ${point.lat}`);
      assert.ok(near(point.lon, LON), `lon ${point.lon}`);
    });

    it("reads the pair when the labels sit on their own lines", () => {
      const point = firstPoint(`خط العرض\n21°32'35.4"N\nخط الطول\n39°10'22.2"E`);
      assert.ok(point);
      assert.ok(near(point.lat, LAT));
    });
  });

  describe("Turkish labels", () => {
    it("reads Enlem / Boylam", () => {
      const point = firstPoint(`Enlem 41°00'50.0"N Boylam 29°00'30.0"E`);
      assert.ok(point, "nothing extracted from the Turkish-labelled pair");
      assert.ok(Math.abs(point.lat - (41 + 50 / 3600)) < 0.0001, `lat ${point.lat}`);
      assert.ok(Math.abs(point.lon - (29 + 30 / 3600)) < 0.0001, `lon ${point.lon}`);
    });

    it("reads Enlem / Boylam with colons", () => {
      assert.ok(firstPoint(`Enlem: 41°00'50.0" N   Boylam: 29°00'30.0" E`));
    });
  });

  describe("validation is not weakened", () => {
    it("rejects a latitude beyond 90", () => {
      const point = firstPoint(`Latitude 91°00'00"N, Longitude 39°10'22"E`);
      if (point) assert.ok(Math.abs(point.lat) <= 90, `accepted lat ${point.lat}`);
    });

    it("rejects a longitude beyond 180", () => {
      const point = firstPoint(`Latitude 21°32'35"N, Longitude 181°00'00"E`);
      if (point) assert.ok(Math.abs(point.lon) <= 180, `accepted lon ${point.lon}`);
    });

    it("rejects impossible minutes and seconds", () => {
      assert.equal(collectDmsComponents(`Latitude 21°75'35.4"N`).length, 0);
      assert.equal(collectDmsComponents(`Latitude 21°32'75.4"N`).length, 0);
    });
  });

  describe("bearing safety — a cadastral bearing is not a position", () => {
    it("does not turn a lone quadrant bearing into a parcel coordinate", () => {
      assert.equal(candidates(`Boundary line runs N 35°20' E for 42.10 m`).length, 0);
    });

    it("does not turn a run of bearings into a parcel", () => {
      const deed = [
        "thence N 35°20' E 42.10 m",
        "thence S 54°40' E 30.00 m",
        "thence S 35°20' W 42.10 m",
        "thence N 54°40' W 30.00 m",
      ].join("\n");
      assert.equal(candidates(deed).length, 0, "a metes-and-bounds run must not become coordinates");
    });

    it("does not read an angle in a specification as a coordinate", () => {
      assert.equal(candidates(`Roof pitch 30°00'00" and slope 15°30'00"`).length, 0);
    });
  });
});
