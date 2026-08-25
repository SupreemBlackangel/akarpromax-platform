import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconstructLayout, type PositionedItem } from "@/lib/land/intelligence/layout";
import { extractTablesFromLayout } from "@/lib/land/intelligence/table-extraction";

function tableItems(rows: readonly (readonly string[])[]): PositionedItem[] {
  const items: PositionedItem[] = [];
  rows.forEach((cells, rowIndex) => {
    cells.forEach((text, columnIndex) => {
      if (!text) return;
      items.push({ page: 1, x: 60 + columnIndex * 110, y: 700 - rowIndex * 16, width: Math.max(8, text.length * 5), height: 10, text });
    });
  });
  return items;
}

const read = (rows: readonly (readonly string[])[]) => extractTablesFromLayout(reconstructLayout(tableItems(rows)), {});

describe("Edge topology", () => {
  it("reads a LINE column of the form 1-2 as an edge", () => {
    const [table] = read([
      ["LINE", "EASTING", "NORTHING", "DIST (m)"],
      ["1-2", "567350.49", "2170025.51", "47.49"],
      ["2-3", "567328.10", "2169983.63", "67.91"],
      ["3-4", "567268.17", "2170015.56", "47.56"],
      ["4-1", "567290.62", "2170057.49", "67.87"],
    ]);
    assert.deepEqual(table.rows.map((row) => [row.fromPoint, row.toPoint]), [["1", "2"], ["2", "3"], ["3", "4"], ["4", "1"]]);
  });

  it("reads explicit FROM and TO columns", () => {
    const [table] = read([
      ["FROM", "TO", "EASTING", "NORTHING"],
      ["A", "B", "567350.49", "2170025.51"],
      ["B", "C", "567328.10", "2169983.63"],
      ["C", "A", "567268.17", "2170015.56"],
    ]);
    assert.deepEqual(table.rows.map((row) => row.fromPoint), ["A", "B", "C"]);
    assert.deepEqual(table.rows.map((row) => row.toPoint), ["B", "C", "A"]);
  });

  it("reads Turkish başlangıç/bitiş edge columns", () => {
    const [table] = read([
      ["Başlangıç", "Bitiş", "Sağa", "Yukarı"],
      ["1", "2", "550332.65", "4339627.75"],
      ["2", "3", "550329.37", "4339530.49"],
      ["3", "1", "550329.98", "4339530.37"],
    ]);
    assert.deepEqual(table.rows.map((row) => row.fromPoint), ["1", "2", "3"]);
  });

  it("keeps a point-number column as an identifier, not as an edge", () => {
    const [table] = read([
      ["Nokta No", "Sağa", "Yukarı"],
      ["3720007", "550332.65", "4339627.75"],
      ["3720008", "550329.37", "4339530.49"],
      ["3720009", "550329.98", "4339530.37"],
    ]);
    assert.deepEqual(table.rows.map((row) => row.pointId), ["3720007", "3720008", "3720009"]);
    assert.equal(table.rows[0].fromPoint, undefined);
  });
});
