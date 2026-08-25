import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconstructLayout, type PositionedItem } from "@/lib/land/intelligence/layout";
import { extractTablesFromLayout } from "@/lib/land/intelligence/table-extraction";

/** Lays a table out on a page: one item per cell, evenly spaced columns. */
function tableItems(rows: readonly (readonly string[])[], options: { page?: number; x0?: number; pitch?: number } = {}): PositionedItem[] {
  const page = options.page ?? 1;
  const x0 = options.x0 ?? 60;
  const pitch = options.pitch ?? 110;
  const items: PositionedItem[] = [];
  rows.forEach((cells, rowIndex) => {
    cells.forEach((text, columnIndex) => {
      if (!text) return;
      items.push({
        page,
        x: x0 + columnIndex * pitch,
        y: 700 - rowIndex * 16,
        width: Math.max(8, text.length * 5),
        height: 10,
        text,
      });
    });
  });
  return items;
}

function read(rows: readonly (readonly string[])[], documentText = "") {
  return extractTablesFromLayout(reconstructLayout(tableItems(rows)), { documentText });
}

describe("Row-major coordinate tables in any column order", () => {
  it("reads EASTING then NORTHING", () => {
    const [table] = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "567350.49", "2170025.51"],
      ["2", "567328.10", "2169983.63"],
      ["3", "567268.17", "2170015.56"],
    ]);
    assert.equal(table.kind, "PROJECTED");
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].primary, 567350.49);
    assert.equal(table.rows[0].secondary, 2170025.51);
    assert.equal(table.axis.confident, true);
  });

  it("reads NORTHING then EASTING and still reports easting first", () => {
    const [table] = read([
      ["POINT", "NORTHING", "EASTING"],
      ["1", "2170025.51", "567350.49"],
      ["2", "2169983.63", "567328.10"],
      ["3", "2170015.56", "567268.17"],
    ]);
    assert.equal(table.rows[0].primary, 567350.49);
    assert.equal(table.rows[0].secondary, 2170025.51);
    assert.equal(table.axis.confident, true);
  });

  it("reads a geographic table with LATITUDE before LONGITUDE", () => {
    const [table] = read([
      ["POINT", "LATITUDE", "LONGITUDE"],
      ["1", "24.71360", "46.67530"],
      ["2", "24.71365", "46.67540"],
      ["3", "24.71370", "46.67550"],
    ]);
    assert.equal(table.kind, "GEOGRAPHIC");
    assert.equal(table.rows[0].primary, 46.6753);
    assert.equal(table.rows[0].secondary, 24.7136);
  });

  it("reads a geographic table with LONGITUDE before LATITUDE", () => {
    const [table] = read([
      ["POINT", "LONGITUDE", "LATITUDE"],
      ["1", "46.67530", "24.71360"],
      ["2", "46.67540", "24.71365"],
      ["3", "46.67550", "24.71370"],
    ]);
    assert.equal(table.rows[0].primary, 46.6753);
    assert.equal(table.rows[0].secondary, 24.7136);
  });

  it("reads Arabic headings", () => {
    const [table] = read([
      ["رقم النقطة", "الاحداثي الشرقي", "الاحداثي الشمالي"],
      ["١", "567350.49", "2170025.51"],
      ["٢", "567328.10", "2169983.63"],
      ["٣", "567268.17", "2170015.56"],
    ]);
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].primary, 567350.49);
  });

  it("reads Turkish headings", () => {
    const [table] = read([
      ["Nokta No", "Sağa", "Yukarı", "Mesafe"],
      ["1", "550332.65", "4339627.75", "12.40"],
      ["2", "550329.37", "4339530.49", "10.10"],
      ["3", "550329.98", "4339530.37", "9.80"],
    ], "aplikasyon krokisi parsel");
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].primary, 550332.65);
    assert.equal(table.rows[0].distance, 12.4);
  });

  it("keeps a DIST column out of the coordinate pair", () => {
    const [table] = read([
      ["LINE", "EASTING", "NORTHING", "DIST (m)"],
      ["1-2", "567350.49", "2170025.51", "47.49"],
      ["2-3", "567328.10", "2169983.63", "67.91"],
      ["3-4", "567268.17", "2170015.56", "47.56"],
    ]);
    for (const row of table.rows) {
      assert.notEqual(row.primary, row.distance);
      assert.ok(row.primary > 100_000, "the easting column, not the side length, is the coordinate");
    }
    assert.deepEqual(table.rows.map((row) => row.distance), [47.49, 67.91, 47.56]);
  });

  it("refuses a table of fewer than two usable rows", () => {
    const readings = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "567350.49", "2170025.51"],
    ]);
    assert.equal(readings.length, 0);
  });
});
