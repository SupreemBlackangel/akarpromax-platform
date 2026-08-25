import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_TABLE_ROWS,
  extractSurveyTables,
  primarySurveyTable,
} from "@/lib/land/intelligence/patterns/survey-table-patterns";
import {
  classifyColumn,
  classifyHeadingLine,
} from "@/lib/land/intelligence/patterns/labels";
import {
  crsDeclarationFor,
  findCrsDeclarations,
} from "@/lib/land/intelligence/patterns/crs-patterns";
import {
  findAreaStatements,
  registeredArea,
} from "@/lib/land/intelligence/patterns/area-patterns";

/** The reference survey sheet this engine was built against. */
const REFERENCE_SHEET = [
  "WGS84 40N",
  "",
  "LINE    EASTING       NORTHING       DIST",
  "1  2    565150.50     2550415.28     30.00",
  "2  3    565136.78     2550388.60     10.00",
  "3  4    565127.88     2550393.17     30.00",
  "4  1    565141.61     2550419.85     10.00",
  "",
  "AREA = 300 SQ.m",
].join("\n");

describe("Column heading vocabulary", () => {
  it("classifies English headings", () => {
    assert.equal(classifyColumn("EASTING"), "EASTING");
    assert.equal(classifyColumn("NORTHING"), "NORTHING");
    assert.equal(classifyColumn("LATITUDE"), "LATITUDE");
    assert.equal(classifyColumn("LONGITUDE"), "LONGITUDE");
    assert.equal(classifyColumn("DIST"), "DISTANCE");
    assert.equal(classifyColumn("LINE"), "LINE");
    assert.equal(classifyColumn("POINT"), "POINT");
    assert.equal(classifyColumn("VERTEX"), "POINT");
    assert.equal(classifyColumn("STATION"), "POINT");
    assert.equal(classifyColumn("BEARING"), "BEARING");
  });

  it("classifies Arabic headings", () => {
    assert.equal(classifyColumn("الشرقيات"), "EASTING");
    assert.equal(classifyColumn("الشماليات"), "NORTHING");
    assert.equal(classifyColumn("خط العرض"), "LATITUDE");
    assert.equal(classifyColumn("خط الطول"), "LONGITUDE");
    assert.equal(classifyColumn("المسافة"), "DISTANCE");
    assert.equal(classifyColumn("رقم النقطة"), "POINT");
    assert.equal(classifyColumn("الاتجاه"), "BEARING");
  });

  it("accepts single-letter headings only as whole tokens", () => {
    assert.equal(classifyColumn("E"), "EASTING");
    assert.equal(classifyColumn("N"), "NORTHING");
    assert.equal(classifyColumn("X"), "EASTING");
    assert.equal(classifyColumn("Y"), "NORTHING");
    assert.equal(classifyColumn("ELEVATION"), "UNKNOWN", "a longer word is not the letter E");
  });

  it("tolerates a unit in the heading", () => {
    assert.equal(classifyColumn("EASTING (m)"), "EASTING");
    assert.equal(classifyColumn("DIST (M)"), "DISTANCE");
  });

  it("refuses a line that is not a coordinate heading", () => {
    assert.equal(classifyHeadingLine("This document states the area of the plot"), null);
    assert.equal(classifyHeadingLine("Invoice number and date"), null);
    assert.equal(classifyHeadingLine("LINE DIST"), null, "no coordinate pair means no table");
  });

  it("accepts a heading in any column order", () => {
    assert.ok(classifyHeadingLine("LINE    EASTING   NORTHING   DIST"));
    assert.ok(classifyHeadingLine("POINT   NORTHING  EASTING"));
    assert.ok(classifyHeadingLine("ID  Latitude  Longitude"));
    assert.ok(classifyHeadingLine("From  To  Easting  Northing  Length"));
  });
});

describe("CRS declaration patterns", () => {
  it("reads `WGS84 40N` written above the table", () => {
    const declarations = findCrsDeclarations(REFERENCE_SHEET);
    const datum = declarations.find((entry) => entry.kind === "DATUM_ZONE");
    assert.ok(datum);
    assert.equal(datum.zone, 40);
    assert.equal(datum.hemisphere, "N");
  });

  it("reads every zone and EPSG wording", () => {
    const cases: readonly [string, number, "N" | "S"][] = [
      ["EPSG:32640", 40, "N"],
      ["EPSG 32756", 56, "S"],
      ["UTM Zone 39N", 39, "N"],
      ["UTM 38N", 38, "N"],
      ["Zone 23 S", 23, "S"],
      ["WGS 84 / UTM zone 40N", 40, "N"],
      ["WGS84 UTM 33 S", 33, "S"],
    ];
    for (const [text, zone, hemisphere] of cases) {
      const declaration = findCrsDeclarations(text).find((entry) => entry.zone !== undefined);
      assert.ok(declaration, `no declaration for ${text}`);
      assert.equal(declaration.zone, zone, text);
      assert.equal(declaration.hemisphere, hemisphere, text);
    }
  });

  it("attaches a table to the declaration written above it", () => {
    const text = [
      "SHEET 1 - UTM Zone 39N",
      "LINE EASTING NORTHING DIST",
      "1 2 565150.50 2550415.28 30.00",
      "2 1 565136.78 2550388.60 30.00",
      "SHEET 2 - UTM Zone 40N",
      "LINE EASTING NORTHING DIST",
      "1 2 565150.50 2550415.28 30.00",
      "2 1 565136.78 2550388.60 30.00",
    ].join("\n");
    const declarations = findCrsDeclarations(text);
    const tables = extractSurveyTables(text);
    assert.equal(tables.length, 2);
    assert.equal(crsDeclarationFor(declarations, tables[0].index)?.zone, 39);
    assert.equal(crsDeclarationFor(declarations, tables[1].index)?.zone, 40);
  });

  it("rejects a zone outside 1-60", () => {
    assert.equal(findCrsDeclarations("UTM Zone 61N").find((entry) => entry.zone !== undefined), undefined);
    assert.equal(findCrsDeclarations("Zone 0 N").find((entry) => entry.zone !== undefined), undefined);
  });

  it("recognises a geographic declaration", () => {
    const declarations = findCrsDeclarations("Coordinate Reference System: WGS84");
    assert.ok(declarations.some((entry) => entry.kind === "GEOGRAPHIC" || entry.datum === "WGS84"));
  });
});

describe("Area statement patterns", () => {
  it("reads the reference sheet's area", () => {
    const area = registeredArea(REFERENCE_SHEET);
    assert.ok(area);
    assert.equal(area.squareMeters, 300);
  });

  it("reads every wording", () => {
    const cases: readonly [string, number][] = [
      ["AREA = 300 SQ.m", 300],
      ["AREA=300 SQM", 300],
      ["AREA 300 m2", 300],
      ["AREA: 300 m²", 300],
      ["300 SQ.M", 300],
      ["المساحة 300 م2", 300],
      ["المساحة = 300 متر مربع", 300],
      ["Total area 1,248.62 sqm", 1248.62],
      ["AREA = 2.5 hectares", 25_000],
    ];
    for (const [text, expected] of cases) {
      const area = registeredArea(text);
      assert.ok(area, `no area for ${text}`);
      assert.equal(area.squareMeters, expected, text);
    }
  });

  it("prefers a labelled statement over a bare number", () => {
    const area = registeredArea("Plot 300 SQ.M reference\nAREA = 508 m2");
    assert.ok(area);
    assert.equal(area.squareMeters, 508);
  });

  it("does not invent an area", () => {
    assert.equal(registeredArea("Invoice 2026 total 1100"), undefined);
    assert.equal(findAreaStatements("no area here").length, 0);
  });
});

describe("The reference LINE/EASTING/NORTHING/DIST sheet", () => {
  const tables = extractSurveyTables(REFERENCE_SHEET);
  const table = primarySurveyTable(tables);

  it("finds exactly one table", () => {
    assert.equal(tables.length, 1);
    assert.ok(table);
  });

  it("reads the columns in the order the heading states", () => {
    assert.deepEqual(table!.columns, ["LINE", "EASTING", "NORTHING", "DISTANCE"]);
  });

  it("reads four rows, not sixteen loose numbers", () => {
    assert.equal(table!.rows.length, 4);
    assert.equal(table!.rows[0].easting, 565150.5);
    assert.equal(table!.rows[0].northing, 2550415.28);
    assert.equal(table!.rows[0].distance, 30);
    assert.equal(table!.rows[3].easting, 565141.61);
    assert.equal(table!.rows[3].northing, 2550419.85);
  });

  it("reads the edge topology from the LINE column", () => {
    assert.equal(table!.topology, "LINE");
    assert.deepEqual(
      table!.rows.map((row) => [row.fromPoint, row.toPoint]),
      [["1", "2"], ["2", "3"], ["3", "4"], ["4", "1"]],
    );
  });

  it("derives the boundary sequence 1 to 2 to 3 to 4 and back", () => {
    assert.deepEqual(table!.sequence, ["1", "2", "3", "4"]);
    assert.equal(table!.closed, true);
    assert.equal(table!.sequence.length, 4, "the closing edge is not a fifth corner");
  });

  it("reads all four edge lengths", () => {
    assert.deepEqual(table!.distances, [
      { from: "1", to: "2", meters: 30 },
      { from: "2", to: "3", meters: 10 },
      { from: "3", to: "4", meters: 30 },
      { from: "4", to: "1", meters: 10 },
    ]);
  });

  it("scores an explicit closed topology highly", () => {
    assert.ok(table!.score >= 90, `score was ${table!.score}`);
  });
});

describe("Column-order flexibility", () => {
  it("reads NORTHING before EASTING", () => {
    const text = [
      "POINT NORTHING EASTING",
      "1 2550415.28 565150.50",
      "2 2550388.60 565136.78",
      "3 2550393.17 565127.88",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows[0].northing, 2550415.28);
    assert.equal(table.rows[0].easting, 565150.5);
    assert.equal(table.topology, "POINT");
  });

  it("reads X and Y headings", () => {
    const text = ["Vertex X Y", "1 565150.50 2550415.28", "2 565136.78 2550388.60", "3 565127.88 2550393.17"].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows[0].easting, 565150.5);
    assert.equal(table.rows[0].northing, 2550415.28);
  });

  it("reads Longitude before Latitude", () => {
    const text = [
      "ID Longitude Latitude",
      "1 46.675300 24.713600",
      "2 46.675300 24.713900",
      "3 46.675700 24.713900",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows[0].longitude, 46.6753);
    assert.equal(table.rows[0].latitude, 24.7136);
  });

  it("reads a From/To heading as edge topology", () => {
    const text = [
      "From To Easting Northing Length",
      "1 2 565150.50 2550415.28 30.00",
      "2 3 565136.78 2550388.60 10.00",
      "3 1 565127.88 2550393.17 31.62",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.topology, "LINE");
    assert.equal(table.closed, true);
  });

  it("reads Arabic column headings", () => {
    const text = [
      "رقم النقطة    الشرقيات    الشماليات",
      "1 565150.50 2550415.28",
      "2 565136.78 2550388.60",
      "3 565127.88 2550393.17",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].easting, 565150.5);
  });
});

describe("Edge separators", () => {
  const separators = ["1  2", "1-2", "1 - 2", "1 → 2", "1 TO 2", "1/2", "1|2"];

  for (const separator of separators) {
    it(`reads \`${separator}\` as an edge`, () => {
      const text = [
        "LINE EASTING NORTHING DIST",
        `${separator} 565150.50 2550415.28 30.00`,
        "2 1 565136.78 2550388.60 30.00",
      ].join("\n");
      const table = primarySurveyTable(extractSurveyTables(text));
      assert.ok(table, separator);
      assert.equal(table.rows[0].fromPoint, "1", separator);
      assert.equal(table.rows[0].toPoint, "2", separator);
    });
  }
});

describe("Multiple tables stay separate", () => {
  it("keeps a parcel table and a reference-point table apart", () => {
    const text = [
      "PARCEL BOUNDARY - UTM Zone 40N",
      "LINE EASTING NORTHING DIST",
      "1 2 565150.50 2550415.28 30.00",
      "2 3 565136.78 2550388.60 10.00",
      "3 4 565127.88 2550393.17 30.00",
      "4 1 565141.61 2550419.85 10.00",
      "",
      "REFERENCE SURVEY POINTS",
      "STATION EASTING NORTHING",
      "101 560000.00 2540000.00",
      "102 561000.00 2541000.00",
      "103 562000.00 2542000.00",
      "104 563000.00 2543000.00",
      "105 564000.00 2544000.00",
    ].join("\n");

    const tables = extractSurveyTables(text);
    assert.equal(tables.length, 2);
    const parcel = primarySurveyTable(tables);
    assert.ok(parcel);
    assert.equal(parcel.topology, "LINE", "the closed edge table wins over a station list");
    assert.equal(parcel.rows.length, 4);

    const stations = tables.find((entry) => entry !== parcel);
    assert.ok(stations);
    assert.equal(stations.rows.length, 5);
    assert.equal(stations.closed, false);
  });
});

describe("False-positive protection", () => {
  const negatives: readonly [string, string][] = [
    ["an invoice", "Invoice 2026-1100\nAmount 300.00\nVAT 45.00\nTotal 345.00"],
    ["a date list", "2024 2025 2026\n01 02 03"],
    ["phone numbers", "Contact: 0501234567\nOffice: 0112345678"],
    ["prices", "Price 1100 SAR\nDiscount 300 SAR\nNet 800 SAR"],
    ["an area-only note", "The plot area is 300 square meters."],
    ["plain prose", "This survey report describes the northern and eastern boundaries of the plot."],
  ];

  for (const [label, text] of negatives) {
    it(`extracts no table from ${label}`, () => {
      assert.deepEqual(extractSurveyTables(text), [], label);
    });
  }

  it("rejects a table whose numbers are outside coordinate ranges", () => {
    const text = ["POINT EASTING NORTHING", "1 12 34", "2 56 78", "3 90 12"].join("\n");
    assert.deepEqual(extractSurveyTables(text), []);
  });

  it("needs at least two rows before it calls something a table", () => {
    const text = ["LINE EASTING NORTHING DIST", "1 2 565150.50 2550415.28 30.00"].join("\n");
    assert.deepEqual(extractSurveyTables(text), []);
  });
});

describe("OCR-damaged tables", () => {
  it("tolerates irregular spacing", () => {
    const text = [
      "LINE     EASTING          NORTHING         DIST",
      "1   2      565150.50        2550415.28       30.00",
      "2  3   565136.78   2550388.60  10.00",
      "3    4  565127.88     2550393.17    30.00",
      "4 1 565141.61 2550419.85 10.00",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows.length, 4);
    assert.equal(table.closed, true);
  });

  it("tolerates a stray blank line inside the table", () => {
    const text = [
      "LINE EASTING NORTHING DIST",
      "1 2 565150.50 2550415.28 30.00",
      "",
      "2 3 565136.78 2550388.60 10.00",
      "3 1 565127.88 2550393.17 31.62",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows.length, 3);
  });

  it("stops at the end of the table rather than swallowing the footer", () => {
    const table = primarySurveyTable(extractSurveyTables(REFERENCE_SHEET));
    assert.ok(table);
    assert.equal(table.rows.length, 4);
    assert.ok(table.rows.every((row) => !row.raw.includes("AREA")));
  });

  it("reads Arabic-Indic digits in rows", () => {
    const text = [
      "رقم النقطة الشرقيات الشماليات",
      "١ ٥٦٥١٥٠٫٥٠ ٢٥٥٠٤١٥٫٢٨",
      "٢ ٥٦٥١٣٦٫٧٨ ٢٥٥٠٣٨٨٫٦٠",
      "٣ ٥٦٥١٢٧٫٨٨ ٢٥٥٠٣٩٣٫١٧",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].easting, 565150.5);
    assert.equal(table.rows[0].northing, 2550415.28);
  });

  it("reports an edge chain that does not connect", () => {
    const text = [
      "LINE EASTING NORTHING DIST",
      "1 2 565150.50 2550415.28 30.00",
      "3 4 565136.78 2550388.60 10.00",
      "5 6 565127.88 2550393.17 30.00",
    ].join("\n");
    const table = primarySurveyTable(extractSurveyTables(text));
    assert.ok(table);
    assert.equal(table.topology, "ORDERED");
    assert.match(table.warnings.join(" "), /does not chain/i);
  });
});

describe("Resource limits and ReDoS safety", () => {
  it("ignores an input beyond the scan limit", () => {
    const huge = "A".repeat(400_001);
    assert.deepEqual(extractSurveyTables(huge), []);
  });

  it("caps the number of rows it will read", () => {
    const rows = Array.from({ length: MAX_TABLE_ROWS + 50 }, (_, index) =>
      `${index + 1} ${index + 2} 565150.50 2550415.28 30.00`,
    );
    const table = primarySurveyTable(extractSurveyTables(["LINE EASTING NORTHING DIST", ...rows].join("\n")));
    assert.ok(table);
    assert.ok(table.rows.length <= MAX_TABLE_ROWS);
  });

  it("completes quickly on inputs designed to cause backtracking", () => {
    const hostile = [
      "LINE EASTING NORTHING DIST",
      `1 2 ${"9".repeat(600)} ${"8".repeat(600)} ${"7".repeat(600)}`,
      `${" ".repeat(2000)}1 2 3`,
      `${"1 ".repeat(3000)}`,
      `${"-".repeat(2000)}1`,
      `${".".repeat(2000)}5`,
    ].join("\n");

    const started = process.hrtime.bigint();
    extractSurveyTables(hostile);
    findCrsDeclarations(hostile);
    findAreaStatements(hostile);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(elapsedMs < 1000, `pattern scan took ${elapsedMs} ms`);
  });

  it("stays fast on a long ordinary document", () => {
    const document = Array.from({ length: 4000 }, (_, index) =>
      `Line ${index}: the parcel is described in the attached schedule with area 300 square meters.`,
    ).join("\n");

    const started = process.hrtime.bigint();
    extractSurveyTables(document);
    findCrsDeclarations(document);
    registeredArea(document);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(elapsedMs < 2000, `scan took ${elapsedMs} ms`);
  });
});
