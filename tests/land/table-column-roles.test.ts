import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyAxisToken, classifyColumn } from "@/lib/land/intelligence/patterns/labels";

describe("Column headings across the region's languages", () => {
  it("reads easting and northing headings in English, Arabic and Turkish forms", () => {
    assert.equal(classifyColumn("EASTING"), "EASTING");
    assert.equal(classifyColumn("Easting (m)"), "EASTING");
    assert.equal(classifyColumn("الاحداثي الشرقي"), "EASTING");
    assert.equal(classifyColumn("NORTHING"), "NORTHING");
    assert.equal(classifyColumn("الشماليات"), "NORTHING");
  });

  it("reads a heading with and without the Arabic definite article", () => {
    assert.equal(classifyColumn("الضلع"), "LINE");
    assert.equal(classifyColumn("ضلع"), "LINE");
    assert.equal(classifyColumn("الخط"), "LINE");
    assert.equal(classifyColumn("المسافة"), "DISTANCE");
    assert.equal(classifyColumn("مسافة"), "DISTANCE");
  });

  it("treats a bare X or Y as an axis, not as a direction", () => {
    assert.equal(classifyAxisToken("X"), "AXIS_X");
    assert.equal(classifyAxisToken("y"), "AXIS_Y");
    assert.equal(classifyAxisToken("X (m)"), "AXIS_X");
    assert.equal(classifyAxisToken("Coord Y"), "AXIS_Y");
  });

  it("does not claim an axis for a word that merely contains x or y", () => {
    assert.equal(classifyAxisToken("PROXY"), null);
    assert.equal(classifyAxisToken("YÜZÖLÇÜMÜ"), null);
    assert.equal(classifyAxisToken(""), null);
    assert.equal(classifyAxisToken("Xx"), null);
  });

  it("keeps distance, bearing and area apart from the coordinate axes", () => {
    assert.equal(classifyColumn("DIST (m)"), "DISTANCE");
    assert.equal(classifyColumn("BEARING"), "BEARING");
    assert.equal(classifyColumn("AREA"), "AREA");
    assert.equal(classifyColumn("Mesafe"), "DISTANCE");
    assert.equal(classifyColumn("Nokta No"), "POINT");
    assert.equal(classifyColumn("Yüzölçümü"), "AREA");
  });
});
