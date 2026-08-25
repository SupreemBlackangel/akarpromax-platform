import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAxisAssignment, type AxisColumn } from "@/lib/land/intelligence/axis-resolution";

function column(index: number, token: string, role: AxisColumn["headerRole"], values: number[]): AxisColumn {
  return { columnIndex: index, headerToken: token, headerRole: role, values };
}

const EASTINGS = [550332.65, 550329.37, 550329.98, 550330.94, 550334.25];
const NORTHINGS = [4339627.75, 4339530.49, 4339530.37, 4339529.11, 4339527.56];

describe("X and Y are resolved from the document, not from a global rule", () => {
  it("reads Y as easting and X as northing on a Turkish cadastral sheet", () => {
    const assignment = resolveAxisAssignment(
      column(1, "Y", "AXIS_Y", EASTINGS),
      column(2, "X", "AXIS_X", NORTHINGS),
      { documentText: "APLİKASYON KROKİSİ  372 ada 27 parsel  Köşe Koordinatları (ITRF_96)" },
    );
    assert.ok(assignment);
    assert.equal(assignment.primaryColumn, 1, "Y holds the easting here");
    assert.equal(assignment.secondaryColumn, 2);
    assert.equal(assignment.confident, true);
    assert.ok(assignment.evidence.some((item) => /Turkish cadastral convention/.test(item)));
  });

  it("reads X as easting where the values say so and nothing Turkish is present", () => {
    const assignment = resolveAxisAssignment(
      column(1, "X", "AXIS_X", [567350.49, 567328.1, 567268.17, 567290.62]),
      column(2, "Y", "AXIS_Y", [2170025.51, 2169983.63, 2170015.56, 2170057.49]),
      { documentText: "KROOKI  PLOT NO 149  PROJECTION: WGS84 ZONE 40N" },
    );
    assert.ok(assignment);
    assert.equal(assignment.primaryColumn, 1, "the easting-shaped column is the easting");
  });

  it("never lets magnitude alone declare an assignment confident", () => {
    const assignment = resolveAxisAssignment(
      column(1, "", "UNKNOWN", EASTINGS),
      column(2, "", "UNKNOWN", NORTHINGS),
      {},
    );
    assert.ok(assignment);
    assert.equal(assignment.primaryColumn, 1);
    assert.equal(assignment.confident, false, "one signal is never enough");
    assert.deepEqual(assignment.evidence.filter((item) => /value ranges/.test(item)).length, 1);
  });

  it("is confident when headings and ranges agree", () => {
    const assignment = resolveAxisAssignment(
      column(1, "EASTING", "EASTING", EASTINGS),
      column(2, "NORTHING", "NORTHING", NORTHINGS),
      { spatiallyAdjacent: true },
    );
    assert.ok(assignment);
    assert.equal(assignment.confident, true);
  });

  it("records a conflict when the headings and the values disagree", () => {
    const assignment = resolveAxisAssignment(
      column(1, "NORTHING", "NORTHING", EASTINGS),
      column(2, "EASTING", "EASTING", NORTHINGS),
      {},
    );
    assert.ok(assignment);
    assert.equal(assignment.confident, false);
    assert.ok(assignment.conflicts.length > 0);
  });

  it("tolerates a minority of OCR-damaged values without losing the column", () => {
    const damaged = [...EASTINGS, 55032650];
    const assignment = resolveAxisAssignment(
      column(1, "Y", "AXIS_Y", damaged),
      column(2, "X", "AXIS_X", [...NORTHINGS, 433953049]),
      { documentText: "aplikasyon krokisi parsel" },
    );
    assert.ok(assignment);
    assert.equal(assignment.primaryColumn, 1);
    assert.equal(assignment.confident, true);
  });

  it("returns nothing when the two columns cannot be a coordinate pair", () => {
    assert.equal(
      resolveAxisAssignment(column(1, "A", "UNKNOWN", [1, 2, 3]), column(2, "B", "UNKNOWN", [500000, 500001, 500002]), {}),
      null,
    );
  });

  it("refuses to be confident on only two rows", () => {
    const assignment = resolveAxisAssignment(
      column(1, "EASTING", "EASTING", [550332.65, 550329.37]),
      column(2, "NORTHING", "NORTHING", [4339627.75, 4339530.49]),
      { spatiallyAdjacent: true },
    );
    assert.ok(assignment);
    assert.equal(assignment.confident, false);
  });
});
