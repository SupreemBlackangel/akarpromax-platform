import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRows, inferColumns, assignColumns, reconstructLayout, fromPdfjsTextItems,
  type PositionedItem,
} from "@/lib/land/intelligence/layout";

/** Lays out a grid: cols are x positions, rows descend the page. */
function grid(rows: string[][], xs: number[], page = 1, topY = 700, step = 14): PositionedItem[] {
  const items: PositionedItem[] = [];
  rows.forEach((cells, r) => {
    cells.forEach((text, c) => {
      if (!text) return; // a blank cell leaves a hole, as in a real table
      items.push({ page, x: xs[c], y: topY - r * step, width: text.length * 5, height: 10, text });
    });
  });
  return items;
}

const XS = [50, 150, 260, 380];

describe("layout reconstruction from positioned text", () => {
  describe("rows", () => {
    it("groups items on the same baseline into one row", () => {
      const rows = buildRows(grid([["LINE", "EASTING", "NORTHING", "DIST"]], XS));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].cells.length, 4);
      assert.equal(rows[0].text, "LINE EASTING NORTHING DIST");
    });

    it("keeps adjacent lines apart", () => {
      const rows = buildRows(grid([["a", "b"], ["c", "d"], ["e", "f"]], XS));
      assert.equal(rows.length, 3);
    });

    it("tolerates a small baseline wobble within one row", () => {
      const items: PositionedItem[] = [
        { page: 1, x: 50, y: 700.0, width: 20, height: 10, text: "1 2" },
        { page: 1, x: 150, y: 700.4, width: 40, height: 10, text: "565150.50" },
        { page: 1, x: 260, y: 699.6, width: 40, height: 10, text: "2550415.28" },
      ];
      assert.equal(buildRows(items).length, 1);
    });

    it("reads the page top-down even when items arrive out of order", () => {
      const shuffled = grid([["first"], ["second"], ["third"]], XS).reverse();
      assert.deepEqual(buildRows(shuffled).map((r) => r.text), ["first", "second", "third"]);
    });

    it("joins a number a PDF split across several items", () => {
      const items: PositionedItem[] = [
        { page: 1, x: 150, y: 700, width: 12, height: 10, text: "2550" },
        { page: 1, x: 162, y: 700, width: 12, height: 10, text: "415" },
        { page: 1, x: 174, y: 700, width: 8, height: 10, text: ".28" },
      ];
      const rows = buildRows(items);
      assert.equal(rows[0].cells.length, 1);
      assert.equal(rows[0].cells[0].text, "2550415.28");
    });

    it("separates pages", () => {
      const items = [...grid([["p1"]], XS, 1), ...grid([["p2"]], XS, 2)];
      const rows = buildRows(items);
      assert.deepEqual(rows.map((r) => r.page), [1, 2]);
    });

    it("ignores blank and non-finite items rather than crashing", () => {
      const items: PositionedItem[] = [
        { page: 1, x: 50, y: 700, width: 10, height: 10, text: "   " },
        { page: 1, x: Number.NaN, y: 700, width: 10, height: 10, text: "x" },
        { page: 1, x: 50, y: 690, width: 10, height: 10, text: "ok" },
      ];
      assert.deepEqual(buildRows(items).map((r) => r.text), ["ok"]);
    });
  });

  describe("columns", () => {
    const TABLE = [
      ["LINE", "EASTING", "NORTHING", "DIST"],
      ["1 2", "565150.50", "2550415.28", "30.00"],
      ["2 3", "565136.78", "2550388.60", "10.00"],
      ["3 4", "565127.88", "2550393.17", "30.00"],
      ["4 1", "565141.61", "2550419.85", "10.00"],
    ];

    it("infers one column per aligned position", () => {
      const rows = buildRows(grid(TABLE, XS));
      assert.equal(inferColumns(rows).length, 4);
    });

    it("assigns every cell to its column", () => {
      const rows = buildRows(grid(TABLE, XS));
      const columns = inferColumns(rows);
      assignColumns(rows, columns);
      for (const row of rows) {
        row.cells.forEach((cell, index) => assert.equal(cell.column, index));
      }
    });

    it("a blank cell leaves a hole instead of shifting the row left", () => {
      // This is the failure whitespace splitting cannot avoid: with DIST
      // missing, a text-only parser reads NORTHING as DIST.
      const withHole = [
        ["LINE", "EASTING", "NORTHING", "DIST"],
        ["1 2", "565150.50", "2550415.28", "30.00"],
        ["2 3", "565136.78", "2550388.60", ""],
        ["3 4", "565127.88", "2550393.17", "30.00"],
      ];
      const rows = buildRows(grid(withHole, XS));
      const columns = inferColumns(rows);
      assignColumns(rows, columns);
      const short = rows[2];
      assert.equal(short.cells.length, 3);
      assert.deepEqual(short.cells.map((c) => c.column), [0, 1, 2],
        "the northing must stay in the NORTHING column");
      assert.equal(short.cells[2].text, "2550388.60");
    });

    it("does not care what order the columns are in", () => {
      const swapped = [
        ["LINE", "NORTHING", "EASTING", "DIST"],
        ["1 2", "2570944.95", "596810.74", "30.00"],
        ["2 3", "2570958.48", "596837.52", "22.00"],
      ];
      const rows = buildRows(grid(swapped, XS));
      assignColumns(rows, inferColumns(rows));
      assert.equal(rows[0].cells[1].text, "NORTHING");
      assert.equal(rows[1].cells[1].text, "2570944.95");
    });

    it("handles a table with a different column count", () => {
      const threeCol = [["POINT", "X", "Y"], ["P1", "500000", "2600000"], ["P2", "500020", "2600000"]];
      const rows = buildRows(grid(threeCol, [50, 150, 260]));
      assert.equal(inferColumns(rows).length, 3);
    });
  });

  describe("full reconstruction", () => {
    it("returns one table per page with rows and columns", () => {
      const items = [
        ...grid([["A", "B"], ["1", "2"]], [50, 150], 1),
        ...grid([["C", "D"], ["3", "4"]], [50, 150], 2),
      ];
      const tables = reconstructLayout(items);
      assert.equal(tables.length, 2);
      assert.equal(tables[0].page, 1);
      assert.equal(tables[1].page, 2);
      assert.equal(tables[0].rows.length, 2);
      assert.equal(tables[0].columns.length, 2);
    });

    it("is empty for empty input rather than throwing", () => {
      assert.deepEqual(reconstructLayout([]), []);
    });
  });

  describe("pdfjs adapter", () => {
    it("reads position out of the transform matrix", () => {
      const items = fromPdfjsTextItems(3, [
        { str: "EASTING", transform: [1, 0, 0, 10, 150, 700], width: 40, height: 10 },
        { str: "", transform: [1, 0, 0, 10, 200, 700] },
        { str: "no transform" },
      ]);
      assert.equal(items.length, 1);
      assert.equal(items[0].page, 3);
      assert.equal(items[0].x, 150);
      assert.equal(items[0].y, 700);
      assert.equal(items[0].text, "EASTING");
    });

    it("falls back to the vertical scale when no height is given", () => {
      const items = fromPdfjsTextItems(1, [{ str: "1 2", transform: [1, 0, 0, 12, 50, 700] }]);
      assert.equal(items[0].height, 12);
      assert.ok(items[0].width > 0);
    });
  });
});
