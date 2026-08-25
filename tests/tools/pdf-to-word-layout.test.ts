import assert from "node:assert/strict";
import test from "node:test";
import {
  groupPdfTextIntoLines,
  hasPresentationForms,
  isLikelyTableLine,
  normalizePdfText,
  splitLinesIntoSegments,
  type PositionedPdfText,
} from "../../src/lib/tools/pdf-to-word-layout";

test("normalizes Arabic presentation forms into editable Unicode text", () => {
  const source = "اﻟﻤﻨﻄﻘﺔ";
  assert.equal(hasPresentationForms(source), true);
  assert.equal(normalizePdfText(source), "المنطقة");
  assert.equal(hasPresentationForms(normalizePdfText(source)), false);
});

test("reconstructs a mixed Arabic table row from PDF coordinates", () => {
  const items: PositionedPdfText[] = [
    { text: "اﻟﺒﺎﺣﺔ", x: 551.16, y: 615.48, width: 26.3, height: 12, direction: "rtl" },
    { text: "ﻗﻠﻮة )اﻟﺮﻣﻴﻀﺔ(", x: 428.88, y: 615.48, width: 71.4, height: 12, direction: "rtl" },
    { text: "CPLX-BH-76-1", x: 294.72, y: 615.48, width: 75.58, height: 12, direction: "ltr" },
    { text: "19.90105", x: 193.68, y: 615.48, width: 48.1, height: 12, direction: "ltr" },
    { text: ",", x: 190.32, y: 615.48, width: 3.35, height: 12, direction: "ltr" },
    { text: "41.12947", x: 141, y: 615.48, width: 46.14, height: 12, direction: "ltr" },
    { text: "220,000", x: 51.84, y: 615.48, width: 45.4, height: 12, direction: "ltr" },
  ];

  const [line] = groupPdfTextIntoLines(items);
  assert.ok(line);
  assert.equal(line.rtl, true);
  assert.equal(line.blocks.length, 5);
  assert.equal(line.blocks[0]?.text, "220,000");
  assert.equal(line.blocks[2]?.text, "CPLX-BH-76-1");
  assert.equal(line.blocks[4]?.text, "الباحة");
  assert.equal(isLikelyTableLine(line, 612), true);
});

test("keeps visual lines separate and only promotes repeated rows to a table", () => {
  const row = (y: number, suffix: string): PositionedPdfText[] => [
    { text: `100${suffix}`, x: 40, y, width: 50, height: 12, direction: "ltr" },
    { text: `CODE-${suffix}`, x: 280, y, width: 70, height: 12, direction: "ltr" },
    { text: `اﻟﺮﻳﺎض ${suffix}`, x: 500, y, width: 70, height: 12, direction: "rtl" },
  ];
  const heading: PositionedPdfText = { text: "2 - ﻗﺎﺋﻤﺔ اﻟﻤﻮاﻗﻊ", x: 420, y: 700, width: 150, height: 16, direction: "rtl" };
  const lines = groupPdfTextIntoLines([heading, ...row(620, "A"), ...row(580, "B"), ...row(540, "C")]);
  const segments = splitLinesIntoSegments(lines, 612);

  assert.equal(lines.length, 4);
  assert.deepEqual(segments.map((segment) => segment.kind), ["text", "table"]);
  assert.equal(segments[1]?.lines.length, 3);
});

test("does not misclassify one wide multi-column line as a table", () => {
  const lines = groupPdfTextIntoLines([
    { text: "يمين", x: 500, y: 600, width: 40, height: 12, direction: "rtl" },
    { text: "وسط", x: 280, y: 600, width: 40, height: 12, direction: "rtl" },
    { text: "يسار", x: 40, y: 600, width: 40, height: 12, direction: "rtl" },
  ]);
  assert.equal(splitLinesIntoSegments(lines, 612)[0]?.kind, "text");
});
