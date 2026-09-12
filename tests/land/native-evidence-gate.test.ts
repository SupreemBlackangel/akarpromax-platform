import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isNativeSurveyEvidenceSufficient,
  selectPagesForOcr,
  surveyVocabularyHits,
  type PageTextStats,
} from "@/lib/land/ocr/page-evidence";

function page(overrides: Partial<PageTextStats> = {}): PageTextStats {
  return {
    page: 1,
    textChars: 0,
    textCoverage: 0,
    imageOperations: 0,
    numericRows: 0,
    coordinateRows: 0,
    vocabularyHits: [],
    ...overrides,
  };
}

describe("Whether a page's own text is enough", () => {
  it("accepts a page whose text layer yielded a coordinate table", () => {
    const verdict = isNativeSurveyEvidenceSufficient(page({ textChars: 3127, textCoverage: 0.21, coordinateRows: 4, imageOperations: 6 }));
    assert.equal(verdict.sufficient, true);
  });

  it("rejects a long page of prose with no coordinate table", () => {
    const verdict = isNativeSurveyEvidenceSufficient(page({ textChars: 8000, textCoverage: 0.4 }));
    assert.equal(verdict.sufficient, false, "volume of text is not survey evidence");
    assert.ok(verdict.reasons.some((reason) => /no coordinate table/.test(reason)));
  });

  it("rejects a caption over a picture, however many characters it has", () => {
    const verdict = isNativeSurveyEvidenceSufficient(page({ textChars: 283, textCoverage: 0.019, imageOperations: 2 }));
    assert.equal(verdict.sufficient, false);
    assert.equal(verdict.rasterDominant, true);
  });

  it("accepts a page whose flat text holds the schedule, table or no table", () => {
    // pdfjs joins a page's items with spaces, so a survey sheet can arrive as
    // one line: column reconstruction finds nothing while the resolver reads
    // every row. Sending that page to OCR costs a minute and adds nothing.
    const verdict = isNativeSurveyEvidenceSufficient(
      page({ textChars: 191, textCoverage: 0.04, coordinateRows: 0, numericRows: 0, textLayerCoordinateRows: 4 }),
    );
    assert.equal(verdict.sufficient, true);
    assert.match(verdict.reasons.join(" "), /flat text layer/);
  });

  it("still reads a picture whose caption happens to carry numbers", () => {
    const verdict = isNativeSurveyEvidenceSufficient(
      page({ textChars: 90, textCoverage: 0.03, imageOperations: 5, coordinateRows: 0, textLayerCoordinateRows: 4 }),
    );
    assert.equal(verdict.sufficient, false, "a raster-dominant page is read as a picture regardless");
  });

  it("does not accept a fragment of a schedule", () => {
    const verdict = isNativeSurveyEvidenceSufficient(
      page({ textChars: 140, textCoverage: 0.05, coordinateRows: 0, textLayerCoordinateRows: 2 }),
    );
    assert.equal(verdict.sufficient, false);
    assert.match(verdict.reasons.join(" "), /only 2 coordinate row/);
  });

  it("names the unread numeric structure it can see", () => {
    const verdict = isNativeSurveyEvidenceSufficient(page({ textChars: 718, textCoverage: 0.036, imageOperations: 13, numericRows: 2 }));
    assert.ok(verdict.reasons.some((reason) => /none could be read as coordinates/.test(reason)));
  });

  it("finds survey vocabulary in all three languages", () => {
    assert.ok(surveyVocabularyHits("Ek1: Aplikasyon Krokisi (372/27)").includes("aplikasyon"));
    assert.ok(surveyVocabularyHits("الرسم المساحي لقطعة أرض").includes("الرسم المساحي"));
    assert.ok(surveyVocabularyHits("PROJECTION: WGS84 ZONE 40N").includes("wgs84"));
    assert.deepEqual(surveyVocabularyHits("quarterly financial statement"), []);
  });
});

describe("Which pages get read as pictures", () => {
  it("skips a page whose text layer already carries the table", () => {
    const selection = selectPagesForOcr([page({ coordinateRows: 4, textChars: 3000, textCoverage: 0.2 })]);
    assert.deepEqual(selection, []);
  });

  it("skips a zone-less survey sheet that arrived as one line of text", () => {
    const selection = selectPagesForOcr([
      page({ page: 1, textChars: 191, textCoverage: 0.04, textLayerCoordinateRows: 4, vocabularyHits: ["easting", "northing", "survey"] }),
    ]);
    assert.deepEqual(selection, [], "survey vocabulary must not drag a readable page into OCR");
  });

  it("reaches a survey page late in a long document", () => {
    const pages: PageTextStats[] = [];
    for (let index = 1; index <= 40; index += 1) {
      pages.push(page({ page: index, textChars: 4000, textCoverage: 0.35 }));
    }
    pages[29] = page({
      page: 30,
      textChars: 283,
      textCoverage: 0.019,
      imageOperations: 2,
      vocabularyHits: ["aplikasyon", "krokisi"],
    });
    const selection = selectPagesForOcr(pages, { maxPages: 3 });
    assert.equal(selection[0].page, 30, "the krokisi is found wherever it sits");
    assert.ok(selection[0].reasons.some((reason) => /survey vocabulary/.test(reason)));
  });

  it("never assumes the interesting page is near the front", () => {
    const pages = [
      page({ page: 1, textChars: 500, textCoverage: 0.05, imageOperations: 1 }),
      page({ page: 2, textChars: 500, textCoverage: 0.05, imageOperations: 1 }),
      page({ page: 3, textChars: 200, textCoverage: 0.01, imageOperations: 4, vocabularyHits: ["coordinate"], numericRows: 9 }),
    ];
    const selection = selectPagesForOcr(pages, { maxPages: 1 });
    assert.equal(selection[0].page, 3);
  });

  it("spreads a bounded sample across the document when nothing scores", () => {
    const pages = Array.from({ length: 12 }, (_, index) => page({ page: index + 1, textChars: 900, textCoverage: 0.3 }));
    const selection = selectPagesForOcr(pages, { maxPages: 8, fallbackPages: 4 });
    assert.equal(selection.length, 4);
    assert.equal(selection[0].page, 1);
    assert.equal(selection[selection.length - 1].page, 12, "the last page is always in the sample");
    assert.ok(selection.every((candidate) => candidate.reasons.some((reason) => /sampled across the document/.test(reason))));
  });

  it("respects the page budget", () => {
    const pages = Array.from({ length: 30 }, (_, index) => page({
      page: index + 1, textChars: 100, textCoverage: 0.01, imageOperations: 2, vocabularyHits: ["parcel"],
    }));
    assert.equal(selectPagesForOcr(pages, { maxPages: 5 }).length, 5);
  });

  it("returns nothing for an empty document", () => {
    assert.deepEqual(selectPagesForOcr([]), []);
  });
});
