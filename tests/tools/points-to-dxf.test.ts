import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSurveyPointsDxf,
  outputDxfName,
  parseSurveyPoints,
} from "@/src/lib/tools/points-to-dxf";

describe("survey points parser", () => {
  it("keeps numeric point names out of the X coordinate", () => {
    const result = parseSurveyPoints("1 437000.00 2606000.00 50.0 BM");
    assert.deepEqual(result.points[0], {
      name: "1",
      x: 437000,
      y: 2606000,
      z: 50,
      code: "BM",
      sourceLine: 1,
    });
  });

  it("supports comma, tab and space separated office exports", () => {
    const result = parseSurveyPoints([
      "N,X,Y,Z,Code",
      "P1,437000,2606000,50.25,BLD",
      "P2\t437050\t2606020\t51\tROAD",
      "P3 437100 2605980 49.8",
    ].join("\n"));
    assert.equal(result.points.length, 3);
    assert.equal(result.points[0].code, "BLD");
    assert.equal(result.points[1].name, "P2");
    assert.equal(result.skippedLines, 0);
  });

  it("skips comments and reports invalid data rows", () => {
    const result = parseSurveyPoints("# survey\ninvalid row\n1 10 20 3 BM");
    assert.equal(result.points.length, 1);
    assert.equal(result.skippedLines, 1);
  });

  it("supports N, X, Y files without elevation or code", () => {
    const result = parseSurveyPoints([
      "P1,521272.320,2420196.850",
      "P2,521229.687,2420199.580",
      "P3,521267.962,2420211.203",
      "P4,521234.046,2420185.228",
      "6,521262.915,2420207.169",
      "7,521266.578,2420195.107",
    ].join("\n"));

    assert.equal(result.points.length, 6);
    assert.equal(result.skippedLines, 0);
    assert.deepEqual(result.points[0], {
      name: "P1",
      x: 521272.32,
      y: 2420196.85,
      z: 0,
      code: "",
      sourceLine: 1,
    });
    assert.deepEqual(result.points[5], {
      name: "7",
      x: 521266.578,
      y: 2420195.107,
      z: 0,
      code: "",
      sourceLine: 6,
    });
  });
});

describe("survey points DXF", () => {
  const points = parseSurveyPoints([
    "1 437000 2606000 50 BM",
    "2 437050 2606020 50.5 ROAD",
  ].join("\n")).points;

  it("generates an AutoCAD R12 file with the old survey layers", () => {
    const dxf = generateSurveyPointsDxf(points);
    assert.match(dxf, /\$ACADVER\r\n1\r\nAC1009/);
    for (const layer of ["CROSS", "NAME", "ELEV", "CODE"]) {
      assert.match(dxf, new RegExp(`\\r\\n2\\r\\n${layer}\\r\\n`));
    }
    assert.equal((dxf.match(/\r\nLINE\r\n/g) ?? []).length, 4);
    assert.match(dxf, /\r\n10\r\n437000\.000\r\n/);
    assert.match(dxf, /\r\n1\r\nBM\r\n/);
    assert.ok(dxf.endsWith("0\r\nEOF\r\n"));
  });

  it("derives a safe DXF name from the uploaded file", () => {
    assert.equal(outputDxfName("my survey.csv"), "my survey.dxf");
    assert.equal(outputDxfName(""), "survey_points.dxf");
  });
});
