import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectSurveyTableROIs } from "@/lib/land/ocr/survey-roi";
import type { PositionedItem } from "@/lib/land/intelligence/layout";

/** Words laid out as a table; columns at fixed x, rows descending in y. */
function tableWords(
  rows: readonly (readonly string[])[],
  options: { page?: number; x0?: number; y0?: number; pitch?: number } = {},
): PositionedItem[] {
  const page = options.page ?? 1;
  const x0 = options.x0 ?? 400;
  const y0 = options.y0 ?? 1500;
  const pitch = options.pitch ?? 160;
  const items: PositionedItem[] = [];
  rows.forEach((cells, rowIndex) => {
    cells.forEach((text, columnIndex) => {
      if (!text) return;
      items.push({
        page,
        x: x0 + columnIndex * pitch,
        y: y0 - rowIndex * 26,
        width: Math.max(10, text.length * 9),
        height: 16,
        text,
      });
    });
  });
  return items;
}

function proseWords(count: number, page = 1, y0 = 2200): PositionedItem[] {
  const words = ["planning", "report", "prepared", "for", "the", "municipality", "of", "the", "region"];
  const items: PositionedItem[] = [];
  for (let index = 0; index < count; index += 1) {
    items.push({
      page,
      x: 100 + (index % 9) * 90,
      y: y0 - Math.floor(index / 9) * 24,
      width: 70,
      height: 14,
      text: words[index % words.length],
    });
  }
  return items;
}

const COORD_ROWS = [
  ["Nokta", "Y", "X"],
  ["3720007", "550332.65", "4339627.75"],
  ["3720008", "550329.37", "4339530.49"],
  ["3720009", "550329.98", "4339530.37"],
  ["3720010", "550330.94", "4339529.11"],
  ["3720011", "550334.25", "4339527.56"],
];

describe("Survey-table ROI detection", () => {
  it("finds a coordinate table among prose and reports why", () => {
    const items = [...proseWords(45), ...tableWords(COORD_ROWS)];
    const rois = detectSurveyTableROIs(items);
    assert.equal(rois.length >= 1, true);
    const [roi] = rois;
    assert.ok(roi.estimatedRows >= 4, `rows ${roi.estimatedRows}`);
    assert.ok(roi.confidence >= 0.5, `confidence ${roi.confidence}`);
    assert.ok(roi.detectionReasons.some((reason) => /aligned numeric rows/.test(reason)));
    assert.ok(roi.detectionReasons.some((reason) => /headers nearby/i.test(reason)));
  });

  it("covers the table's rows with its bbox", () => {
    const items = tableWords(COORD_ROWS);
    const [roi] = detectSurveyTableROIs(items);
    const numeric = items.filter((item) => /^\d/.test(item.text));
    for (const word of numeric) {
      assert.ok(word.x >= roi.bbox.x - 1 && word.x <= roi.bbox.x + roi.bbox.width + 1, `x ${word.x}`);
      assert.ok(word.y >= roi.bbox.y - 20 && word.y <= roi.bbox.y + roi.bbox.height + 20, `y ${word.y}`);
    }
  });

  it("works without any header row — alignment alone is evidence", () => {
    const rois = detectSurveyTableROIs(tableWords(COORD_ROWS.slice(1)));
    assert.equal(rois.length, 1);
    assert.ok(rois[0].confidence > 0.2);
  });

  it("reads Arabic and Turkish headers as table evidence", () => {
    const arabic = detectSurveyTableROIs(tableWords([
      ["نقطة", "شرقيات", "شماليات"],
      ["1", "565150.50", "2550415.28"],
      ["2", "565136.78", "2550388.60"],
      ["3", "565127.88", "2550393.17"],
    ]));
    assert.ok(arabic[0]?.detectionReasons.some((reason) => /headers nearby/i.test(reason)));
    const turkish = detectSurveyTableROIs(tableWords([
      ["Nokta No", "Sağa", "Yukarı"],
      ["1", "550332.65", "4339627.75"],
      ["2", "550329.37", "4339530.49"],
      ["3", "550329.98", "4339530.37"],
    ]));
    assert.ok(turkish[0]?.detectionReasons.some((reason) => /headers nearby/i.test(reason)));
  });

  it("finds a tiny three-row table", () => {
    const rois = detectSurveyTableROIs(tableWords(COORD_ROWS.slice(0, 4)));
    assert.equal(rois.length, 1);
  });

  it("keeps two separate tables as two ROIs", () => {
    const upper = tableWords(COORD_ROWS, { y0: 2400 });
    const lower = tableWords([
      ["POINT", "EASTING", "NORTHING"],
      ["A", "612000.10", "2455000.20"],
      ["B", "612050.55", "2455100.80"],
      ["C", "612100.99", "2455050.40"],
    ], { y0: 1000 });
    const rois = detectSurveyTableROIs([...upper, ...lower]);
    assert.equal(rois.length, 2);
  });

  it("caps the number of ROIs it returns", () => {
    const many: PositionedItem[] = [];
    for (let table = 0; table < 6; table += 1) {
      many.push(...tableWords(COORD_ROWS, { y0: 3200 - table * 500 }));
    }
    assert.ok(detectSurveyTableROIs(many).length <= 3);
  });

  it("returns nothing for prose alone", () => {
    assert.deepEqual(detectSurveyTableROIs(proseWords(60)), []);
  });

  it("finds the table wherever the page sits in the document", () => {
    const items = tableWords(COORD_ROWS, { page: 38 });
    const [roi] = detectSurveyTableROIs(items);
    assert.equal(roi.page, 38);
  });
});
