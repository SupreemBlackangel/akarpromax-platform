import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeExtractedText } from "@/lib/geo/text-extraction";
import { extractSurveyTables } from "@/lib/land/intelligence/patterns/survey-table-patterns";
import { extractGeoEvidence } from "@/lib/geo/evidence-extraction";

/**
 * Mutation corpus.
 *
 * Every case below is a transformation of the SAME parcel. The engine must
 * read all of them identically. None of these shapes were copied from a
 * document we hold; they are the axes along which real sheets vary.
 */
const BASE_ROWS = [
  ["1 2", "565150.50", "2550415.28", "30.00"],
  ["2 3", "565136.78", "2550388.60", "10.00"],
  ["3 4", "565127.88", "2550393.17", "30.00"],
  ["4 1", "565141.61", "2550419.85", "10.00"],
];

const table = (heading: string, rows: string[][], gap = "    ") =>
  [heading, ...rows.map((r) => r.join(gap))].join("\n");

const toArabicDigits = (s: string) => s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

describe("mutation corpus — one parcel, many shapes", () => {
  const variants: [string, string][] = [
    ["canonical", table("LINE   EASTING     NORTHING     DIST", BASE_ROWS)],
    ["swapped coordinate columns", table("LINE   NORTHING    EASTING      DIST",
      BASE_ROWS.map(([l, e, n, d]) => [l, n, e, d]))],
    ["X / Y headers", table("LINE   X           Y            DIST", BASE_ROWS)],
    ["abbreviated headers", table("LINE   E           N            DIST", BASE_ROWS)],
    ["Arabic headers", table("الخط   الشرقي      الشمالي      المسافة", BASE_ROWS)],
    ["From/To topology", table("FROM TO   EASTING     NORTHING     LENGTH", BASE_ROWS)],
    ["irregular whitespace", table("LINE  EASTING   NORTHING   DIST", BASE_ROWS, "\t  ")],
    ["extra unrelated numeric column", table("LINE   EASTING     NORTHING     DIST   ELEV",
      BASE_ROWS.map((r) => [...r, "412"]))],
    ["lower precision", table("LINE   EASTING     NORTHING     DIST",
      BASE_ROWS.map(([l, e, n, d]) => [l, Number(e).toFixed(1), Number(n).toFixed(1), d]))],
  ];

  for (const [name, text] of variants) {
    it(`reads four rows and a closed cycle — ${name}`, () => {
      const found = extractSurveyTables(normalizeExtractedText(text));
      assert.ok(found.length >= 1, "a table must be detected");
      const t = found[0];
      assert.equal(t.rows.length, 4, `${name}: expected 4 rows, got ${t.rows.length}`);
      assert.deepEqual(t.sequence, ["1", "2", "3", "4"], `${name}: boundary sequence`);
      assert.equal(t.closed, true, `${name}: cycle must close`);
    });
  }

  it("reads Arabic-Indic digits in the rows", () => {
    const text = table("LINE   EASTING     NORTHING     DIST",
      BASE_ROWS.map((r) => r.map(toArabicDigits)));
    const found = extractSurveyTables(normalizeExtractedText(text));
    assert.ok(found.length >= 1);
    assert.equal(found[0].rows.length, 4);
  });

  describe("vertex counts from 3 to 12", () => {
    for (const n of [3, 5, 6, 8, 12]) {
      it(`handles a ${n}-vertex parcel`, () => {
        const rows = Array.from({ length: n }, (_, i) => [
          `${i + 1} ${i + 2 > n ? 1 : i + 2}`,
          (565000 + i * 7).toFixed(2),
          (2550000 + i * 11).toFixed(2),
          "10.00",
        ]);
        const found = extractSurveyTables(normalizeExtractedText(
          table("LINE   EASTING     NORTHING     DIST", rows)));
        assert.ok(found.length >= 1, `no table for n=${n}`);
        assert.equal(found[0].rows.length, n);
        assert.equal(found[0].sequence.length, n);
        assert.equal(found[0].closed, true);
      });
    }
  });

  it("a repeated closing row does not become an extra vertex", () => {
    const withClosing = [...BASE_ROWS, ["1 2", "565150.50", "2550415.28", "30.00"]];
    const found = extractSurveyTables(normalizeExtractedText(
      table("LINE   EASTING     NORTHING     DIST", withClosing)));
    assert.ok(found.length >= 1);
    assert.equal(new Set(found[0].sequence).size, 4, "four distinct corners");
  });
});

/**
 * Negative corpus.
 *
 * Documents full of numbers and no parcel. The requirement is zero false
 * parcels — a number is not a coordinate because of its magnitude.
 */
describe("negative corpus — numbers that are not coordinates", () => {
  const documents: [string, string][] = [
    ["invoice", [
      "فاتورة ضريبية", "الرقم الضريبي 310122393500003",
      "البند        الكمية    السعر     الإجمالي",
      "أسمنت        250       23.50     5875.00",
      "حديد         1200      2.75      3300.00",
      "الإجمالي 9175.00", "التاريخ 1447/05/20",
    ].join("\n")],
    ["identity and deed numbers", [
      "هوية وطنية 1079716435", "رقم وثيقة الملكية 360002544875",
      "رقم القرار 470621752098", "رقم الفاتورة 260127002279",
    ].join("\n")],
    ["phone list", [
      "قائمة التواصل", "أحمد 0551234567", "سالم 0509876543", "المكتب 0126547890",
    ].join("\n")],
    ["engineering scope", [
      "نطاق العمل", "عرض الشارع 25.00 م", "ارتفاع المبنى 8 م", "عدد الطوابق 2",
      "الارتدادات الأمام 5 الخلف 3 الجانبان 2/3", "المساحة المبنية 600",
    ].join("\n")],
    ["dates and page numbers", [
      "صفحة 1 من 4", "2026/06/16", "2026/06/23", "2026/06/24", "PS01A-3922743",
    ].join("\n")],
    ["price table with many decimals", [
      "المنتج    السعر     الخصم    الصافي",
      "A100      1250.75   12.50    1094.41",
      "B200      3400.10   8.25     3119.34",
      "C300      980.60    5.00     931.57",
    ].join("\n")],
  ];

  for (const [name, text] of documents) {
    it(`produces no parcel from: ${name}`, () => {
      const normalized = normalizeExtractedText(text);
      const tables = extractSurveyTables(normalized);
      const coordinates = extractGeoEvidence(normalized).explicitCoordinates;
      assert.equal(tables.length, 0, `${name}: a coordinate table was invented`);
      assert.equal(coordinates.length, 0, `${name}: ${coordinates.length} phantom coordinates`);
    });
  }

  it("a lone plausible-looking pair is not a parcel", () => {
    const normalized = normalizeExtractedText("المرجع 21.885762 39.205920");
    assert.equal(extractSurveyTables(normalized).length, 0);
  });
});
