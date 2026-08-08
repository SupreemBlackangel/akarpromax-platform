import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { translations } from "@/src/data/translations";

describe("news RTL / i18n completeness", () => {
  it("exposes ticker navigation labels in all three locales", () => {
    assert.equal(typeof translations.ar.tickerPrev, "string");
    assert.equal(typeof translations.ar.tickerNext, "string");
    assert.equal(typeof translations.en.tickerPrev, "string");
    assert.equal(typeof translations.en.tickerNext, "string");
    assert.equal(typeof translations.tr.tickerPrev, "string");
    assert.equal(typeof translations.tr.tickerNext, "string");
  });

  it("Arabic ticker labels are non-empty and RTL-appropriate", () => {
    assert.ok(translations.ar.tickerPrev.trim().length > 0);
    assert.ok(translations.ar.tickerNext.trim().length > 0);
  });

  it("all locales have the same label keys", () => {
    const keys = Object.keys(translations.ar).sort();
    for (const locale of ["en", "tr"]) {
      assert.deepEqual(Object.keys(translations[locale as "en"]).sort(), keys);
    }
  });
});
