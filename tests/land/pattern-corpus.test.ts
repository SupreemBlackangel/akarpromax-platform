import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLandDocument } from "@/lib/land/intelligence/resolver";
import { extractParcelCandidates } from "@/lib/land/intelligence/patterns";
import { extractSurveyTables } from "@/lib/land/intelligence/patterns/survey-table-patterns";
import { findCrsDeclarations } from "@/lib/land/intelligence/patterns/crs-patterns";
import { registeredArea } from "@/lib/land/intelligence/patterns/area-patterns";

function metadata(nativeText: string) {
  return { fileName: "corpus.pdf", mimeType: "application/pdf", sizeBytes: 4096, nativeText };
}

/**
 * A false positive is as damaging as a miss: a fabricated parcel on a map is
 * worse than no parcel at all. Every document here must yield nothing.
 */
describe("Negative corpus: documents that contain no parcel", () => {
  const negatives: readonly [string, string][] = [
    [
      "a tax invoice",
      [
        "TAX INVOICE 2026-001100",
        "Date: 15/03/2026",
        "Consulting services 12,500.00",
        "VAT 15% 1,875.00",
        "Total due 14,375.00",
      ].join("\n"),
    ],
    [
      "an Arabic invoice",
      [
        "فاتورة ضريبية رقم 2026/1100",
        "التاريخ 15/03/2026",
        "قيمة الخدمات 12,500.00",
        "ضريبة القيمة المضافة 1,875.00",
        "الإجمالي 14,375.00",
      ].join("\n"),
    ],
    [
      "a contact sheet",
      ["Contact list", "Ahmed 0501234567", "Sara 0509876543", "Office 0112345678", "Fax 0112345679"].join("\n"),
    ],
    [
      "a national identity card",
      ["هوية وطنية - بطاقة أحوال مدنية", "رقم الهوية 1098765432", "تاريخ الميلاد 1990/05/12"].join("\n"),
    ],
    [
      "a price list",
      ["PRICE LIST 2026", "Item A 1100.00", "Item B 300.00", "Item C 850.50", "Item D 2200.75"].join("\n"),
    ],
    [
      "a bank statement",
      [
        "STATEMENT OF ACCOUNT",
        "01/01/2026 Opening 125000.00",
        "05/01/2026 Transfer 250000.00",
        "09/01/2026 Payment 375000.00",
        "31/01/2026 Closing 500000.00",
      ].join("\n"),
    ],
    [
      "a project schedule with percentages",
      ["Project progress", "Phase 1 25.50", "Phase 2 40.75", "Phase 3 18.20", "Phase 4 15.55"].join("\n"),
    ],
    [
      "prose about boundaries",
      "This report describes the northern and eastern boundaries of the plot and the area of the site.",
    ],
  ];

  for (const [label, text] of negatives) {
    it(`finds no coordinate table in ${label}`, () => {
      assert.deepEqual(extractSurveyTables(text), [], label);
      assert.deepEqual(extractParcelCandidates(text), [], label);
    });
  }

  for (const [label, text] of negatives) {
    it(`draws no parcel from ${label}`, async () => {
      const result = await resolveLandDocument({ metadata: metadata(text) });
      assert.equal(result.geometry, undefined, label);
      assert.equal(result.evidence.coordinatePairs.length, 0, label);
    });
  }

  it("does not read a year or an identifier as a coordinate", () => {
    const text = ["Reference 2026 1100 300 30 10", "Serial 565150 2550415"].join("\n");
    assert.deepEqual(extractSurveyTables(text), []);
  });

  it("does not treat a lone area figure as a parcel", async () => {
    const result = await resolveLandDocument({
      metadata: metadata("The plot area is 300 square meters and it faces the main road."),
    });
    assert.equal(result.evidence.coordinatePairs.length, 0);
    assert.equal(result.geometry, undefined);
  });
});

describe("Positive corpus: layouts that must be read", () => {
  const positives: readonly [string, string, number][] = [
    [
      "English LINE table",
      ["UTM Zone 40N", "LINE EASTING NORTHING DIST", "1 2 565150.50 2550415.28 30.00", "2 3 565136.78 2550388.60 10.00", "3 1 565127.88 2550393.17 31.62"].join("\n"),
      3,
    ],
    [
      "English POINT table",
      ["UTM Zone 40N", "POINT EASTING NORTHING", "1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17"].join("\n"),
      3,
    ],
    [
      "VERTEX table with X and Y",
      ["EPSG:32640", "VERTEX X Y", "1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17"].join("\n"),
      3,
    ],
    [
      "STATION table",
      ["UTM Zone 40N", "STATION EASTING NORTHING", "1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17"].join("\n"),
      3,
    ],
    [
      "From/To table",
      ["UTM Zone 40N", "From To Easting Northing Length", "1 2 565150.50 2550415.28 30.00", "2 3 565136.78 2550388.60 10.00", "3 1 565127.88 2550393.17 31.62"].join("\n"),
      3,
    ],
    [
      "Arabic headings",
      ["نظام الإحداثيات: UTM Zone 40N", "رقم النقطة الشرقيات الشماليات", "1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17"].join("\n"),
      3,
    ],
    [
      "geographic table",
      ["WGS84", "ID Latitude Longitude", "1 24.713600 46.675300", "2 24.713900 46.675300", "3 24.713900 46.675700"].join("\n"),
      3,
    ],
  ];

  for (const [label, text, expected] of positives) {
    it(`reads ${label}`, async () => {
      const tables = extractSurveyTables(text);
      assert.equal(tables.length, 1, `${label}: table count`);
      assert.equal(tables[0].rows.length, expected, `${label}: row count`);

      const result = await resolveLandDocument({ metadata: metadata(text) });
      assert.equal(result.evidence.coordinatePairs.length, expected, `${label}: resolved points`);
    });
  }

  it("reads a zone stated before the table and one stated after it", () => {
    const before = findCrsDeclarations("UTM Zone 40N\nLINE EASTING NORTHING");
    const after = findCrsDeclarations("LINE EASTING NORTHING\nUTM Zone 40N");
    assert.equal(before.find((entry) => entry.zone !== undefined)?.zone, 40);
    assert.equal(after.find((entry) => entry.zone !== undefined)?.zone, 40);
  });

  it("reads every area wording used in the corpus", () => {
    for (const text of ["AREA = 300 SQ.m", "AREA 300 m2", "المساحة 300 م2", "Total area 300 sqm"]) {
      assert.equal(registeredArea(text)?.squareMeters, 300, text);
    }
  });
});

describe("Pattern engine performance and resilience", () => {
  /** Inputs shaped to make a careless pattern backtrack exponentially. */
  const hostileInputs: readonly [string, string][] = [
    ["a long digit run", `LINE EASTING NORTHING DIST\n1 2 ${"9".repeat(5000)}`],
    ["repeated separators", `1 ${"-".repeat(5000)}2 565150.50 2550415.28`],
    ["repeated spaces", `LINE EASTING NORTHING\n1${" ".repeat(5000)}565150.50 2550415.28`],
    ["repeated decimal points", `1 2 ${".".repeat(5000)}5 ${".".repeat(5000)}6`],
    ["repeated commas", `AREA = ${",".repeat(5000)}300`],
    ["alternating digits and dots", `AREA = ${"1.".repeat(3000)}`],
    ["many near-headings", Array.from({ length: 600 }, () => "EASTING NORTHING").join(" ")],
    ["many near-rows", Array.from({ length: 600 }, (_, index) => `${index} 1 2`).join(" ")],
  ];

  for (const [label, text] of hostileInputs) {
    it(`survives ${label} in bounded time`, () => {
      const started = process.hrtime.bigint();
      extractSurveyTables(text);
      findCrsDeclarations(text);
      registeredArea(text);
      extractParcelCandidates(text);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      assert.ok(elapsedMs < 1500, `${label} took ${elapsedMs} ms`);
    });
  }

  it("handles a realistic multi-table document quickly", () => {
    const blocks: string[] = [];
    for (let table = 0; table < 8; table += 1) {
      blocks.push(`PARCEL ${table + 1} - UTM Zone 40N`, "LINE EASTING NORTHING DIST");
      for (let row = 1; row <= 20; row += 1) {
        blocks.push(`${row} ${row + 1} ${565000 + row}.50 ${2550000 + row}.28 30.00`);
      }
      blocks.push("AREA = 600 SQ.m", "");
    }
    const document = blocks.join("\n");

    const started = process.hrtime.bigint();
    const tables = extractSurveyTables(document);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(tables.length >= 2, "several tables are found");
    assert.ok(elapsedMs < 1500, `scan took ${elapsedMs} ms`);
  });

  it("never returns more candidates than the table cap allows", () => {
    const blocks: string[] = [];
    for (let table = 0; table < 40; table += 1) {
      blocks.push("POINT EASTING NORTHING");
      blocks.push("1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17");
    }
    const tables = extractSurveyTables(blocks.join("\n"));
    assert.ok(tables.length <= 12, `found ${tables.length} tables`);
  });
});
