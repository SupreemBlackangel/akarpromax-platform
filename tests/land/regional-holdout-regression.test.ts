/**
 * Regional regression over the real H01–H06 survey documents.
 *
 * The documents are real land records, so they are not committed: they live in
 * the certification scratch folder and the suite skips cleanly without them.
 * Nothing here reads a recorded transcript — every assertion runs the actual
 * PDF through the actual pipeline.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { fromPdfjsTextItems, reconstructLayout, type PositionedItem } from "@/lib/land/intelligence/layout";
import { extractTablesFromLayout, parseNumericCell } from "@/lib/land/intelligence/table-extraction";
import {
  isNativeSurveyEvidenceSufficient,
  selectPagesForOcr,
  surveyVocabularyHits,
  type PageTextStats,
} from "@/lib/land/ocr/page-evidence";
import { chooseOcrLanguages, languageList } from "@/lib/land/ocr/languages";
import { resolveLandDocument } from "@/lib/land/intelligence/resolver";

const CORPUS_DIR = fileURLToPath(new URL("../../tmp/_scratch/holdout/", import.meta.url));

const DOCUMENTS = {
  H01: "H01_Oman_Duqm_Krooki.pdf",
  H02: "H02_Turkey_Manisa.pdf",
  H03: "H03_Turkey_Manyas.pdf",
  H04: "H04_Turkey_Golmarmara.pdf",
  H05: "H05_Oman_Duqm_MasterPlan.pdf",
  H06: "H06_UAE_AbuDhabi_SitePlan.pdf",
} as const;

const available = (name: string) => existsSync(CORPUS_DIR + name);
const paintCodes = new Set(
  Object.entries(OPS as unknown as Record<string, number>)
    .filter(([name]) => /^paint(?:Image|Jpeg|InlineImage)/.test(name))
    .map(([, code]) => code),
);

interface ReadDocument {
  nativeText: string;
  pages: string[];
  items: PositionedItem[];
  stats: PageTextStats[];
  sizeBytes: number;
}

async function readDocument(name: string): Promise<ReadDocument> {
  const bytes = readFileSync(CORPUS_DIR + name);
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  const items: PositionedItem[] = [];
  const stats: PageTextStats[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pageItems = fromPdfjsTextItems(pageNumber, content.items as never);
    items.push(...pageItems);
    const pageText = (content.items as { str?: string }[])
      .filter((item) => typeof item.str === "string")
      .map((item) => item.str as string)
      .join(" ");
    pages.push(pageText);

    let textArea = 0;
    for (const item of content.items as { str?: string; width?: number; height?: number }[]) {
      if (!item.str?.trim()) continue;
      textArea += (item.width ?? 0) * (item.height ?? 8);
    }
    let imageOperations = 0;
    try {
      const operators = await page.getOperatorList();
      imageOperations = operators.fnArray.reduce((total: number, code: number) => total + (paintCodes.has(code) ? 1 : 0), 0);
    } catch {
      imageOperations = 0;
    }
    const tables = reconstructLayout(pageItems);
    stats.push({
      page: pageNumber,
      textChars: pageText.replace(/\s/g, "").length,
      textCoverage: Math.min(1, textArea / Math.max(1, viewport.width * viewport.height)),
      imageOperations,
      numericRows: tables.reduce(
        (total, table) => total + table.rows.filter((row) => row.cells.filter((cell) => parseNumericCell(cell.text) !== null).length >= 2).length,
        0,
      ),
      coordinateRows: extractTablesFromLayout(tables, { documentText: pageText }).reduce((total, reading) => total + reading.rows.length, 0),
      vocabularyHits: surveyVocabularyHits(pageText),
    });
  }

  return { nativeText: pages.join("\n").trim(), pages, items, stats, sizeBytes: bytes.byteLength };
}

async function resolve(name: string, document: ReadDocument) {
  return resolveLandDocument({
    metadata: { fileName: name, mimeType: "application/pdf", sizeBytes: document.sizeBytes, nativeText: document.nativeText },
    pages: document.pages.length > 1 ? document.pages : undefined,
    positionedItems: document.items,
  });
}

describe("Regional holdout — H01 Oman krooki", { skip: !available(DOCUMENTS.H01) && "corpus not present" }, () => {
  it("recovers the coordinate table from the page layout, not from flat text", async () => {
    const document = await readDocument(DOCUMENTS.H01);
    const result = await resolve(DOCUMENTS.H01, document);

    assert.equal(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    assert.equal(result.evidence.coordinatePairs.length, 4);
    assert.equal(result.geometry?.type, "polygon");
    assert.equal(result.crsSelection?.zone, 40);
    assert.equal(result.crsSelection?.hemisphere, "N");
    assert.equal(result.crsSelection?.source, "DOCUMENT");
    const [table] = result.layoutTables ?? [];
    assert.ok(table, "the layout reader produced the table");
    assert.equal(table.rowCount, 4);
    assert.equal(table.axisConfident, true);
  });

  it("turns the side-length column into no coordinate candidates at all", async () => {
    const document = await readDocument(DOCUMENTS.H01);
    const result = await resolve(DOCUMENTS.H01, document);

    assert.deepEqual(result.coordinateGroups, undefined, "no cluster is formed from the side lengths");
    assert.notEqual(result.coordinateGroupSelectionRequired, true);
    // Every accepted point is a grid corner, never one of 47.49 / 67.91.
    for (const point of result.evidence.coordinatePairs) {
      assert.ok(point.lat > 19 && point.lat < 20, `unexpected latitude ${point.lat}`);
      assert.ok(point.lon > 57 && point.lon < 58, `unexpected longitude ${point.lon}`);
    }
    assert.ok(result.steps.some((step) => /read as measurements, not positions/.test(step)));
  });

  it("accounts for every detected row", async () => {
    const document = await readDocument(DOCUMENTS.H01);
    const result = await resolve(DOCUMENTS.H01, document);
    const account = result.rowAccount;
    assert.ok(account);
    assert.equal(account.detectedRows, account.acceptedRows + account.rejectedRows);
    assert.equal(account.acceptedRows, 4);
    assert.equal(account.reviewRequired, false);
  });

  it("needs no OCR, because the text layer already holds the table", async () => {
    const document = await readDocument(DOCUMENTS.H01);
    assert.equal(isNativeSurveyEvidenceSufficient(document.stats[0]).sufficient, true);
    assert.deepEqual(selectPagesForOcr(document.stats), []);
  });
});

for (const key of ["H02", "H03", "H04"] as const) {
  const name = DOCUMENTS[key];
  describe(`Regional holdout — ${key} Turkish krokisi`, { skip: !available(name) && "corpus not present" }, () => {
    it("sends the raster page to OCR instead of trusting the caption", async () => {
      const document = await readDocument(name);
      const selection = selectPagesForOcr(document.stats);
      assert.ok(selection.length > 0, "the sketch page is selected for OCR");
      assert.ok(
        document.stats.every((page) => isNativeSurveyEvidenceSufficient(page).sufficient === false),
        "no page's text layer is treated as sufficient",
      );
      assert.ok(selection[0].reasons.length > 0, "the selection states its reasons");
    });

    it("reads it with the Turkish model", async () => {
      const document = await readDocument(name);
      assert.ok(languageList(chooseOcrLanguages(document.nativeText, name)).includes("tur"));
    });

    it("invents nothing from the text layer alone", async () => {
      const document = await readDocument(name);
      const result = await resolve(name, document);
      assert.equal(result.evidence.coordinatePairs.length, 0);
      assert.equal(result.geometry, undefined);
      assert.equal(result.parcel, undefined);
      assert.notEqual(result.status, "RESOLVED_EXPLICIT_COORDINATES");
    });
  });
}

for (const key of ["H05", "H06"] as const) {
  const name = DOCUMENTS[key];
  describe(`Regional holdout — ${key} must stay safe`, { skip: !available(name) && "corpus not present" }, () => {
    it("produces no parcel and no invented coordinate system", async () => {
      const document = await readDocument(name);
      const result = await resolve(name, document);
      assert.equal(result.evidence.coordinatePairs.length, 0);
      assert.equal(result.geometry, undefined);
      assert.equal(result.parcel, undefined);
      assert.equal(result.coordinateGroups, undefined);
      if (result.crsSelection) {
        assert.notEqual(result.crsSelection.source, "COUNTRY_INFERENCE", "no CRS is guessed for a document with no coordinates");
      }
    });
  });
}
