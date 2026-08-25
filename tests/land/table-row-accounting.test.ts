import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reconstructLayout, type PositionedItem } from "@/lib/land/intelligence/layout";
import { extractTablesFromLayout } from "@/lib/land/intelligence/table-extraction";

function tableItems(rows: readonly (readonly string[])[]): PositionedItem[] {
  const items: PositionedItem[] = [];
  rows.forEach((cells, rowIndex) => {
    cells.forEach((text, columnIndex) => {
      if (!text) return;
      items.push({
        page: 1,
        x: 60 + columnIndex * 110,
        y: 700 - rowIndex * 16,
        width: Math.max(8, text.length * 5),
        height: 10,
        text,
      });
    });
  });
  return items;
}

const read = (rows: readonly (readonly string[])[]) =>
  extractTablesFromLayout(reconstructLayout(tableItems(rows)), {});

describe("No coordinate row may disappear", () => {
  it("balances detected, accepted and rejected rows", () => {
    const [table] = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "567350.49", "2170025.51"],
      ["2", "567328.10", ""],
      ["3", "567268.17", "2170015.56"],
      ["4", "567290.62", "2170057.49"],
    ]);
    const account = table.account;
    assert.equal(account.detectedRows, account.acceptedRows + account.rejectedRows);
    assert.equal(account.acceptedRows, 3);
    assert.equal(account.rejectedRows, 1);
    assert.equal(account.reviewRequired, true);
  });

  it("gives every rejected row a stated reason", () => {
    const [table] = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "567350.49", "2170025.51"],
      ["2", "", "2169983.63"],
      ["3", "567268.17", "2170015.56"],
      ["4", "567290.62", "2170057.49"],
    ]);
    assert.ok(table.account.rejections.length > 0);
    for (const rejection of table.account.rejections) {
      assert.ok(rejection.reason, "a rejection always names a reason");
      assert.ok(rejection.detail && rejection.detail.length > 0, "a rejection always explains itself");
    }
    assert.equal(table.account.rejections[0].reason, "MISSING_COORDINATE_PAIR");
  });

  it("rejects a row whose value cannot be that axis, rather than using it", () => {
    const [table] = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "550332.65", "4339627.75"],
      ["2", "550329.37", "433953049"],
      ["3", "550329.98", "4339530.37"],
      ["4", "550330.94", "4339529.11"],
    ]);
    assert.equal(table.rows.length, 3);
    const outOfRange = table.account.rejections.find((rejection) => rejection.reason === "OUT_OF_RANGE");
    assert.ok(outOfRange, "the merged decimal point is caught");
    assert.match(outOfRange.detail ?? "", /not a plausible northing/);
    assert.equal(table.account.detectedRows, table.account.acceptedRows + table.account.rejectedRows);
  });

  it("reports the account in both languages", () => {
    const [table] = read([
      ["POINT", "EASTING", "NORTHING"],
      ["1", "567350.49", "2170025.51"],
      ["2", "567328.10", "2169983.63"],
      ["3", "567268.17", "2170015.56"],
    ]);
    assert.match(table.account.summary, /All 3 detected coordinate rows/);
    assert.match(table.account.summaryAr, /٣|3/);
  });
});
