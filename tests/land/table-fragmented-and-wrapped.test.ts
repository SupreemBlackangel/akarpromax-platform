import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconstructLayout, type PositionedItem } from "@/lib/land/intelligence/layout";
import { extractTablesFromLayout } from "@/lib/land/intelligence/table-extraction";

describe("Layouts that flat text cannot read", () => {
  it("reassembles a number a PDF split across several text items", () => {
    const items: PositionedItem[] = [
      { page: 1, x: 60, y: 700, width: 30, height: 10, text: "POINT" },
      { page: 1, x: 170, y: 700, width: 40, height: 10, text: "EASTING" },
      { page: 1, x: 280, y: 700, width: 40, height: 10, text: "NORTHING" },
    ];
    const rows = [
      ["1", ["567", "350", ".49"], ["2170", "025", ".51"]],
      ["2", ["567", "328", ".10"], ["2169", "983", ".63"]],
      ["3", ["567", "268", ".17"], ["2170", "015", ".56"]],
    ] as const;
    rows.forEach((row, rowIndex) => {
      const y = 680 - rowIndex * 16;
      items.push({ page: 1, x: 60, y, width: 8, height: 10, text: row[0] as string });
      let x = 170;
      for (const piece of row[1] as readonly string[]) {
        items.push({ page: 1, x, y, width: piece.length * 5, height: 10, text: piece });
        x += piece.length * 5;
      }
      x = 280;
      for (const piece of row[2] as readonly string[]) {
        items.push({ page: 1, x, y, width: piece.length * 5, height: 10, text: piece });
        x += piece.length * 5;
      }
    });

    const [table] = extractTablesFromLayout(reconstructLayout(items), {});
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].primary, 567350.49);
    assert.equal(table.rows[0].secondary, 2170025.51);
  });

  it("reads a heading that wrapped onto two lines", () => {
    const items: PositionedItem[] = [
      { page: 1, x: 170, y: 712, width: 30, height: 10, text: "COORD" },
      { page: 1, x: 280, y: 712, width: 30, height: 10, text: "COORD" },
      { page: 1, x: 60, y: 700, width: 30, height: 10, text: "POINT" },
      { page: 1, x: 170, y: 700, width: 40, height: 10, text: "EASTING" },
      { page: 1, x: 280, y: 700, width: 40, height: 10, text: "NORTHING" },
      { page: 1, x: 60, y: 684, width: 8, height: 10, text: "1" },
      { page: 1, x: 170, y: 684, width: 40, height: 10, text: "567350.49" },
      { page: 1, x: 280, y: 684, width: 45, height: 10, text: "2170025.51" },
      { page: 1, x: 60, y: 668, width: 8, height: 10, text: "2" },
      { page: 1, x: 170, y: 668, width: 40, height: 10, text: "567328.10" },
      { page: 1, x: 280, y: 668, width: 45, height: 10, text: "2169983.63" },
      { page: 1, x: 60, y: 652, width: 8, height: 10, text: "3" },
      { page: 1, x: 170, y: 652, width: 40, height: 10, text: "567268.17" },
      { page: 1, x: 280, y: 652, width: 45, height: 10, text: "2170015.56" },
    ];
    const [table] = extractTablesFromLayout(reconstructLayout(items), {});
    assert.equal(table.rows.length, 3);
  });

  it("keeps reading a table whose columns drift, as an OCR pass makes them", () => {
    const items: PositionedItem[] = [
      { page: 1, x: 60, y: 700, width: 30, height: 10, text: "POINT" },
      { page: 1, x: 170, y: 700, width: 20, height: 10, text: "Y" },
      { page: 1, x: 280, y: 700, width: 20, height: 10, text: "X" },
    ];
    const drift = [0, 4, -5, 3, -2, 6];
    drift.forEach((offset, index) => {
      const y = 684 - index * 16;
      items.push({ page: 1, x: 60 + offset, y, width: 20, height: 10, text: String(index + 1) });
      items.push({ page: 1, x: 170 + offset, y, width: 45, height: 10, text: (550332 + index).toFixed(2) });
      items.push({ page: 1, x: 280 - offset, y, width: 48, height: 10, text: (4339627 - index).toFixed(2) });
    });
    const [table] = extractTablesFromLayout(reconstructLayout(items), { documentText: "aplikasyon krokisi parsel" });
    assert.ok(table, "the drifting columns still read as one table");
    assert.equal(table.rows.length, 6);
    assert.equal(table.axis.confident, true);
  });

  it("ignores prose that happens to sit on the same rows as the table", () => {
    const items: PositionedItem[] = [
      { page: 1, x: 40, y: 700, width: 90, height: 10, text: "Introducing the service" },
      { page: 1, x: 300, y: 700, width: 30, height: 10, text: "LINE" },
      { page: 1, x: 380, y: 700, width: 40, height: 10, text: "EASTING" },
      { page: 1, x: 470, y: 700, width: 45, height: 10, text: "NORTHING" },
    ];
    const rows = [["1-2", "567350.49", "2170025.51"], ["2-3", "567328.10", "2169983.63"], ["3-4", "567268.17", "2170015.56"]];
    rows.forEach((row, index) => {
      const y = 684 - index * 16;
      items.push({ page: 1, x: 40, y, width: 120, height: 10, text: "cadastral drawing, which marks an official" });
      items.push({ page: 1, x: 300, y, width: 20, height: 10, text: row[0] });
      items.push({ page: 1, x: 380, y, width: 40, height: 10, text: row[1] });
      items.push({ page: 1, x: 470, y, width: 45, height: 10, text: row[2] });
    });
    const [table] = extractTablesFromLayout(reconstructLayout(items), {});
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].primary, 567350.49);
    assert.equal(table.rows[0].fromPoint, "1");
    assert.equal(table.rows[0].toPoint, "2");
  });
});
