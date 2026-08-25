import assert from "node:assert/strict";
import { describe, it } from "node:test";
import proj4 from "proj4";
import { normalizeExtractedText } from "@/lib/geo/text-extraction";
import { extractGeoEvidence } from "@/lib/geo/evidence-extraction";
import { extractSurveyTables } from "@/lib/land/intelligence/patterns/survey-table-patterns";
import { registeredArea } from "@/lib/land/intelligence/patterns/area-patterns";
import { crossValidateSurvey } from "@/lib/land/intelligence/survey-validation";
import type { Point } from "@/lib/geo/contracts";

const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";
const ZONE_40N = "+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs";

/** Wraps a run the way a right-to-left PDF layout does: RLE LRE … PDF PDF. */
const rtl = (s: string) => `‫‪${s}‬‬`;
const BIDI = /[​‎‏‪-‮⁦-⁩﻿]/;

describe("real survey templates", () => {
  /**
   * Saudi municipal (Balady) report. The coordinate table prints
   * `N <lat> E <lon> <reference id>`, and a PDF produced from the
   * right-to-left page wraps every one of those runs in bidirectional
   * embedding controls. They are invisible, they survive NFKC, and they sit
   * between the hemisphere letter and its number.
   *
   * The layout is reproduced exactly; the coordinate values are synthetic,
   * because the real reports carry an owner name and national ID.
   */
  describe("Saudi N / E table wrapped in bidirectional controls", () => {
    const ROWS: readonly (readonly [string, string, string])[] = [
      ["21.885762907392643", "39.20592066741188", "22470581"],
      ["21.885788091432580", "39.20550801127744", "22470582"],
      ["21.885892632901115", "39.20587866342865", "22470583"],
      ["21.885658366014570", "39.20555001556669", "22470584"],
      ["21.885788091432580", "39.20550801127744", "22470585"],
    ];
    const page = [
      "      " + rtl("أمانة محافظة جدة") + "        " + rtl("470621752098"),
      "",
      ...ROWS.map(([lat, lon, ref]) =>
        "      " + rtl("N") + "        " + rtl(lat) +
        "        " + rtl("E") + "        " + rtl(lon) +
        "        " + rtl(ref)),
      "",
      "      " + rtl("1447/07/14") + "        " + rtl("320"),
    ].join("\n");

    it("strips the invisible bidirectional controls", () => {
      const text = normalizeExtractedText(page);
      assert.ok(!BIDI.test(text), "no bidirectional control may survive normalization");
      assert.ok(text.includes("أمانة محافظة جدة"), "Arabic content must survive");
    });

    it("reads every N/E row", () => {
      const evidence = extractGeoEvidence(normalizeExtractedText(page));
      assert.equal(evidence.explicitCoordinates.length, ROWS.length);
    });

    it("keeps latitude, longitude and the reference id apart", () => {
      const evidence = extractGeoEvidence(normalizeExtractedText(page));
      evidence.explicitCoordinates.forEach((coordinate, index) => {
        const point = (coordinate as { point?: Point }).point;
        assert.ok(point, "row must resolve to a point");
        assert.equal(point.lat.toFixed(9), Number(ROWS[index][0]).toFixed(9));
        assert.equal(point.lon.toFixed(9), Number(ROWS[index][1]).toFixed(9));
      });
    });

    it("finds nothing at all when the controls are left in", () => {
      // Guards the fix itself: this is the failure the normalization removes.
      assert.equal(extractGeoEvidence(page).explicitCoordinates.length, 0);
    });
  });

  /**
   * Saudi approved survey report issued for a merge (تقرير مساحي معتمد بغرض
   * الدمج): the same right-to-left producer, six corners instead of five, and
   * the corner reference printed after each pair. The layout is reproduced
   * exactly; the values are synthetic, because the real report carries an
   * owner name and a national ID.
   */
  describe("Saudi merge report — six corners in the same bidirectional layout", () => {
    const ROWS: readonly (readonly [string, string, string])[] = [
      ["24.774265811520100", "46.738901254112300", "10240611"],
      ["24.774318902144500", "46.738955610883700", "10240612"],
      ["24.774372114998200", "46.739010884211500", "10240613"],
      ["24.774318445327700", "46.739066248830100", "10240614"],
      ["24.774265004411800", "46.739011002557300", "10240615"],
      ["24.774211884770600", "46.738956514330900", "10240616"],
    ];
    const page = [
      "      " + rtl("تقرير مساحي معتمد بغرض الدمج") + "        " + rtl("470621999001"),
      "      " + rtl("أمانة منطقة الرياض") + "        " + rtl("الاحداثيات"),
      "",
      ...ROWS.map(([lat, lon, ref]) =>
        "      " + rtl("N") + "        " + rtl(lat) +
        "        " + rtl("E") + "        " + rtl(lon) +
        "        " + rtl(ref)),
      "",
      "      " + rtl("المساحة") + "        " + rtl("1,240") + "        " + rtl("م2"),
    ].join("\n");

    it("reads all six corners", () => {
      const evidence = extractGeoEvidence(normalizeExtractedText(page));
      assert.equal(evidence.explicitCoordinates.length, 6);
    });

    it("keeps every corner's latitude and longitude exact", () => {
      const evidence = extractGeoEvidence(normalizeExtractedText(page));
      evidence.explicitCoordinates.forEach((coordinate, index) => {
        const point = (coordinate as { point?: Point }).point;
        assert.ok(point, "row must resolve to a point");
        assert.equal(point.lat.toFixed(9), Number(ROWS[index][0]).toFixed(9));
        assert.equal(point.lon.toFixed(9), Number(ROWS[index][1]).toFixed(9));
      });
    });

    it("does not turn the corner reference numbers into a seventh corner", () => {
      const evidence = extractGeoEvidence(normalizeExtractedText(page));
      assert.ok(evidence.explicitCoordinates.every((coordinate) => {
        const point = (coordinate as { point?: Point }).point;
        return point !== undefined && point.lat > 24 && point.lat < 25;
      }));
    });

    it("finds nothing at all when the controls are left in", () => {
      assert.equal(extractGeoEvidence(page).explicitCoordinates.length, 0);
    });
  });

  /** Oman, Ministry of Housing cadastral sketch — plot geometry only. */
  function readOmanSheet(text: string) {
    const normalized = normalizeExtractedText(text);
    const table = extractSurveyTables(normalized)[0];
    assert.ok(table, "a coordinate table must be found");
    const points = new Map<string, Point>();
    for (const row of table.rows) {
      if (row.easting === undefined || row.northing === undefined) continue;
      const [lon, lat] = proj4(ZONE_40N, WGS84, [row.easting, row.northing]);
      points.set(row.fromPoint, { lat, lon });
    }
    const area = registeredArea(normalized);
    return {
      table,
      points,
      statedArea: area?.squareMeters,
      result: crossValidateSurvey({
        points,
        sequence: [...table.sequence, table.sequence[0]],
        distances: table.distances,
        statedAreaSqm: area?.squareMeters,
      }),
    };
  }

  describe("Oman template A — LINE / NORTHING / EASTING / DIST, five corners", () => {
    const SHEET = [
      "Sultanate of Oman",
      "Ministry of Housing",
      "DAKHELYA Region",
      "Planning & Survey Department",
      "رسم مساحي لقطعة أرض",
      "SUMAIL   TAWI NUSF-E PA",
      "",
      "LINE   NORTHING      EASTING      DIST (m)",
      "1 2    2570944.95    596810.74    30.00",
      "2 3    2570958.48    596837.52    22.00",
      "3 4    2570938.84    596847.44    25.00",
      "4 5    2570927.57    596825.13    7.07",
      "5 1    2570929.78    596818.41    17.00",
      "AREA = 647 SQ. M.",
    ].join("\n");

    it("reads five corners, not four", () => {
      const { table, points } = readOmanSheet(SHEET);
      assert.equal(table.rows.length, 5);
      assert.equal(points.size, 5);
    });

    it("reads NORTHING before EASTING from the heading", () => {
      const { table } = readOmanSheet(SHEET);
      const northing = table.columns.indexOf("NORTHING");
      const easting = table.columns.indexOf("EASTING");
      assert.ok(northing >= 0 && easting >= 0);
      assert.ok(northing < easting, "the heading states NORTHING first");
    });

    it("derives the closed cycle 1-2-3-4-5-1", () => {
      const { table } = readOmanSheet(SHEET);
      assert.equal(table.topology, "LINE");
      assert.deepEqual(table.sequence, ["1", "2", "3", "4", "5"]);
      assert.equal(table.closed, true);
    });

    it("agrees with all five printed edge lengths", () => {
      const { result } = readOmanSheet(SHEET);
      assert.equal(result.edgesChecked, 5);
      assert.equal(result.edgesMismatched, 0);
      for (const edge of result.edges) {
        assert.ok(edge.deltaMeters < 0.05, `${edge.from}->${edge.to} off by ${edge.deltaMeters} m`);
      }
    });

    it("agrees with the registered area of 647 square metres", () => {
      const { statedArea, result } = readOmanSheet(SHEET);
      assert.equal(statedArea, 647);
      assert.equal(result.area.status, "MATCH");
      assert.ok((result.area.deltaPercent ?? 100) < 0.5);
      assert.equal(result.agreement, "AGREE");
    });

    it("places the parcel in Ad Dakhiliyah, Oman", () => {
      const first = readOmanSheet(SHEET).points.get("1") as Point;
      assert.ok(first.lat > 23.2 && first.lat < 23.3, `lat ${first.lat}`);
      assert.ok(first.lon > 57.9 && first.lon < 58.0, `lon ${first.lon}`);
    });
  });

  describe("Oman template B — WGS84 40N, LINE / EASTING / NORTHING / DIST, four corners", () => {
    const SHEET = [
      "Sultanate of Oman",
      "Ministry of Housing and Urban Planning",
      "رسم مساحي لقطعة أرض",
      "ALJABAL ALAKHDAR    SIQ",
      "PLOT NO : 978",
      "BLOCK : RAWABI SAIQ",
      "USE: Residential Only",
      "WGS84 40N",
      "",
      "LINE   EASTING     NORTHING      DIST",
      "1 2    565150.50   2550415.28    30.00",
      "2 3    565136.78   2550388.60    10.00",
      "3 4    565127.88   2550393.17    30.00",
      "4 1    565141.61   2550419.85    10.00",
      "AREA = 300 SQ.m",
      "CENTEROID: 565139.19,2550404.23",
    ].join("\n");

    it("reads four corners with no repeated closing row", () => {
      const { table } = readOmanSheet(SHEET);
      assert.equal(table.rows.length, 4);
      assert.deepEqual(table.sequence, ["1", "2", "3", "4"]);
      assert.equal(table.closed, true);
    });

    it("reads EASTING before NORTHING from the heading", () => {
      const { table } = readOmanSheet(SHEET);
      assert.ok(table.columns.indexOf("EASTING") < table.columns.indexOf("NORTHING"));
    });

    it("agrees with all four edge lengths and the 300 square metre area", () => {
      const { statedArea, result } = readOmanSheet(SHEET);
      assert.equal(statedArea, 300);
      assert.equal(result.edgesChecked, 4);
      assert.equal(result.edgesMatched, 4);
      assert.equal(result.area.status, "MATCH");
      assert.equal(result.agreement, "AGREE");
    });

    it("places the parcel on the Saiq plateau, Al Jabal Al Akhdar", () => {
      const first = readOmanSheet(SHEET).points.get("1") as Point;
      assert.ok(first.lat > 23.0 && first.lat < 23.15, `lat ${first.lat}`);
      assert.ok(first.lon > 57.6 && first.lon < 57.7, `lon ${first.lon}`);
    });

    it("does not mistake the centroid line for a fifth corner", () => {
      assert.equal(readOmanSheet(SHEET).table.rows.length, 4);
    });
  });
});
