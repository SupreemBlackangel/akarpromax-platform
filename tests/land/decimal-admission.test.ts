import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { admitLooseDecimalPair, contextWindow } from "@/lib/geo/decimal-admission";
import { extractCoordinateEvidence } from "@/lib/geo/evidence-extraction";

describe("Unlabelled decimal pairs must earn their place", () => {
  it("rejects numbers sitting in a distance context", () => {
    const window = "LINE EASTING NORTHING DIST (m) 47.49 67.91";
    const verdict = admitLooseDecimalPair({ window, siblingCount: 2, pairOffset: window.indexOf("47.49") });
    assert.equal(verdict.admission, "REJECT");
    assert.match(verdict.reason, /measurement context/);
  });

  it("rejects numbers sitting in an area or scale context", () => {
    for (const window of ["AREA: 3,227 SQ. M. 47.49 67.91", "SCALE 1:2950 12.5 13.4", "المساحة ٣٢٢٧ 47.49 67.91", "ÖLÇEK 12.5 13.4"]) {
      assert.equal(admitLooseDecimalPair({ window, siblingCount: 2 }).admission, "REJECT", window);
    }
  });

  it("accepts numbers the document names as coordinates", () => {
    for (const window of [
      "Coordinates: 24.7136 46.6753",
      "الإحداثيات 24.7136 46.6753",
      "Koordinatlar 39.2044 27.5829",
    ]) {
      assert.equal(admitLooseDecimalPair({ window, siblingCount: 1 }).admission, "ACCEPT", window);
    }
  });

  it("rejects one or two bare pairs with nothing to support them", () => {
    assert.equal(admitLooseDecimalPair({ window: "24.7136 46.6753", siblingCount: 1 }).admission, "REJECT");
    assert.equal(admitLooseDecimalPair({ window: "24.7136 46.6753", siblingCount: 2 }).admission, "REJECT");
  });

  it("carries a repeated structure for review rather than mapping it", () => {
    const verdict = admitLooseDecimalPair({ window: "24.7136 46.6753", siblingCount: 5 });
    assert.equal(verdict.admission, "REVIEW_ONLY");
    assert.match(verdict.reason, /needs review/);
  });

  it("lets a structured reader override the surrounding words", () => {
    const verdict = admitLooseDecimalPair({
      window: "DIST (m) 24.7136 46.6753",
      siblingCount: 1,
      structurallyIdentified: true,
    });
    assert.equal(verdict.admission, "ACCEPT");
    assert.match(verdict.reason, /structured reader/);
  });

  it("lets the nearer vocabulary decide when a sheet carries both", () => {
    const near = "coordinates 24.7136 46.6753 ....................................... distance";
    assert.equal(
      admitLooseDecimalPair({ window: near, siblingCount: 1, pairOffset: near.indexOf("24.7136") }).admission,
      "ACCEPT",
    );
    const far = "coordinates ....................................... distance 12.5 13.4";
    assert.equal(
      admitLooseDecimalPair({ window: far, siblingCount: 1, pairOffset: far.indexOf("12.5") }).admission,
      "REJECT",
    );
  });

  it("names the evidence it weighed", () => {
    const window = "NORTHING 2170025.51 DIST 47.49 67.91";
    const verdict = admitLooseDecimalPair({ window, siblingCount: 4, pairOffset: window.indexOf("47.49") });
    assert.ok(verdict.evidence.some((item) => /measurement vocabulary/.test(item)));
    assert.ok(verdict.evidence.some((item) => /closer to the numbers/.test(item)));
  });

  it("slices a window around the pair", () => {
    const text = `${"x".repeat(200)}47.49 67.91${"y".repeat(200)}`;
    const window = contextWindow(text, 200, 211);
    assert.ok(window.includes("47.49 67.91"));
    assert.ok(window.length < text.length);
  });
});

describe("Side lengths never become coordinates", () => {
  it("rules out a krooki's DIST column", () => {
    const evidence = extractCoordinateEvidence(
      "LINE EASTING NORTHING DIST (m) 1-2 2-3 3-4 4-1 567350.49 567328.10 567268.17 567290.62 "
      + "2170025.51 2169983.63 2170015.56 2170057.49 47.49 67.91 47.56 67.87 AREA: 3,227 SQ. M.",
    );
    const loose = evidence.filter((item) => item.source === "unlabelled-decimal");
    assert.ok(loose.length > 0, "the pairs are still seen");
    assert.ok(loose.every((item) => item.admission === "REJECT"), "and none of them is admitted as a position");
    for (const item of loose) assert.ok(item.admissionReason);
  });

  it("still admits a labelled coordinate table", () => {
    const evidence = extractCoordinateEvidence("Coordinates 24.71360 46.67530 24.71365 46.67540 24.71370 46.67550");
    const admitted = evidence.filter((item) => item.source === "unlabelled-decimal" && item.admission === "ACCEPT");
    assert.ok(admitted.length >= 3);
  });
});
