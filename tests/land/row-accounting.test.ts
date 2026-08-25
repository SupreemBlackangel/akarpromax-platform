import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRowAccount,
  emptyRowAccount,
  mergeRowAccounts,
  statusCeilingFor,
  type RejectedRow,
} from "@/lib/land/intelligence/row-accounting";

const rejection = (rowIndex: number, over: Partial<RejectedRow> = {}): RejectedRow => ({
  rowIndex,
  reason: "OUT_OF_RANGE",
  ...over,
});

describe("coordinate row accounting", () => {
  it("reports a fully validated table without demanding review", () => {
    const account = buildRowAccount({ detectedRows: 5, parsedRows: 5, acceptedRows: 5, rejections: [] });
    assert.equal(account.reviewRequired, false);
    assert.equal(account.rejectedRows, 0);
    assert.match(account.summary, /All 5 detected coordinate rows were validated\./);
    assert.equal(statusCeilingFor(account), "VERIFIED");
  });

  it("states the shortfall in the exact terms the brief requires", () => {
    const account = buildRowAccount({
      detectedRows: 6,
      parsedRows: 6,
      acceptedRows: 5,
      rejections: [rejection(3, { reason: "OCR_CONFLICT", detail: "two readings for the northing" })],
    });
    assert.equal(account.reviewRequired, true);
    assert.equal(account.summary, "5 of 6 detected coordinate rows were validated.");
    assert.equal(account.summaryAr, "تم التحقق من 5 من 6 صفوف إحداثيات مكتشفة.");
    assert.equal(statusCeilingFor(account), "REVIEW_REQUIRED");
  });

  it("gives every rejected row a reason", () => {
    const account = buildRowAccount({
      detectedRows: 4,
      parsedRows: 3,
      acceptedRows: 2,
      rejections: [
        rejection(2, { reason: "MISSING_COORDINATE_PAIR" }),
        rejection(3, { reason: "CONVERSION_FAILED", detail: "no CRS established" }),
      ],
    });
    assert.equal(account.rejectedRows, 2);
    for (const r of account.rejections) assert.ok(r.reason, "a rejection without a reason is a silent loss");
  });

  describe("a row can never vanish", () => {
    it("records an unexplained shortfall rather than rounding it away", () => {
      // Six detected, four accepted, but only one rejection reported: the
      // caller lost a row. The account must surface that, not hide it.
      const account = buildRowAccount({ detectedRows: 6, parsedRows: 6, acceptedRows: 4, rejections: [rejection(1)] });
      assert.equal(account.rejectedRows, 2, "the unexplained row must still be counted");
      assert.equal(account.detectedRows, account.acceptedRows + account.rejectedRows);
      assert.ok(account.rejections.some((r) => r.detail?.includes("cannot vanish")));
      assert.equal(account.reviewRequired, true);
    });

    it("keeps detected = accepted + rejected as an invariant", () => {
      for (const [detected, accepted, reported] of [[3, 3, 0], [5, 4, 1], [8, 2, 6], [6, 0, 0]] as const) {
        const account = buildRowAccount({
          detectedRows: detected,
          parsedRows: detected,
          acceptedRows: accepted,
          rejections: Array.from({ length: reported }, (_, i) => rejection(i)),
        });
        assert.equal(account.detectedRows, account.acceptedRows + account.rejectedRows,
          `invariant broken for detected=${detected} accepted=${accepted}`);
      }
    });
  });

  describe("status ceiling", () => {
    it("is UNRESOLVED when nothing was detected", () => {
      assert.equal(statusCeilingFor(emptyRowAccount()), "UNRESOLVED");
    });

    it("is UNRESOLVED when rows were detected but none survived", () => {
      const account = buildRowAccount({
        detectedRows: 4, parsedRows: 4, acceptedRows: 0,
        rejections: Array.from({ length: 4 }, (_, i) => rejection(i)),
      });
      assert.equal(statusCeilingFor(account), "UNRESOLVED");
    });

    it("only ever caps a verdict, never raises one", () => {
      // A fully accounted table is not automatically verified elsewhere —
      // CRS, topology and geometry still have a say. This is the ceiling.
      const account = buildRowAccount({ detectedRows: 4, parsedRows: 4, acceptedRows: 4, rejections: [] });
      assert.equal(statusCeilingFor(account), "VERIFIED");
    });
  });

  describe("merging across tables", () => {
    it("sums the counts and keeps every rejection", () => {
      const a = buildRowAccount({ detectedRows: 4, parsedRows: 4, acceptedRows: 4, rejections: [] });
      const b = buildRowAccount({ detectedRows: 5, parsedRows: 5, acceptedRows: 3, rejections: [rejection(1), rejection(4)] });
      const merged = mergeRowAccounts([a, b]);
      assert.equal(merged.detectedRows, 9);
      assert.equal(merged.acceptedRows, 7);
      assert.equal(merged.rejectedRows, 2);
      assert.equal(merged.rejections.length, 2);
    });

    it("makes review contagious — one short table holds the document down", () => {
      const clean = buildRowAccount({ detectedRows: 4, parsedRows: 4, acceptedRows: 4, rejections: [] });
      const short = buildRowAccount({ detectedRows: 5, parsedRows: 5, acceptedRows: 4, rejections: [rejection(2)] });
      assert.equal(mergeRowAccounts([clean, short]).reviewRequired, true);
      assert.equal(statusCeilingFor(mergeRowAccounts([clean, short])), "REVIEW_REQUIRED");
    });

    it("merging nothing is an empty account, not a crash", () => {
      assert.equal(mergeRowAccounts([]).detectedRows, 0);
    });
  });

  describe("hostile input", () => {
    it("does not accept more rows than were detected", () => {
      const account = buildRowAccount({ detectedRows: 3, parsedRows: 9, acceptedRows: 9, rejections: [] });
      assert.equal(account.acceptedRows, 3);
      assert.equal(account.parsedRows, 3);
    });

    it("survives non-finite counts", () => {
      const account = buildRowAccount({
        detectedRows: Number.NaN, parsedRows: Number.NaN, acceptedRows: Number.NaN, rejections: [],
      });
      assert.equal(account.detectedRows, 0);
      assert.equal(statusCeilingFor(account), "UNRESOLVED");
    });
  });
});
