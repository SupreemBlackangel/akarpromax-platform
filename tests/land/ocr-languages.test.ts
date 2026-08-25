import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  chooseOcrLanguages,
  createOcrWorkerWithFallback,
  languageList,
  DEFAULT_LANGUAGES,
} from "@/lib/land/ocr/languages";

describe("OCR language selection", () => {
  it("uses the regional default when the document says nothing", () => {
    assert.equal(chooseOcrLanguages(""), DEFAULT_LANGUAGES);
  });

  it("adds Turkish for a Turkish cadastral sheet and does not load Arabic for it", () => {
    const languages = chooseOcrLanguages("Manisa ili, Soma ilçesi — APLİKASYON KROKİSİ, 372 ada 27 parsel");
    assert.ok(languageList(languages).includes("tur"));
    assert.ok(languageList(languages).includes("eng"));
    assert.ok(!languageList(languages).includes("ara"), "a Turkish sheet does not pay for the Arabic model");
  });

  it("keeps Arabic for an Arabic document", () => {
    const languages = chooseOcrLanguages("الرسم المساحي لقطعة أرض - المساحة ٣٢٢٧ متر مربع");
    assert.ok(languageList(languages).includes("ara"));
    assert.ok(!languageList(languages).includes("tur"));
  });

  it("loads all three when a document carries both scripts", () => {
    assert.equal(chooseOcrLanguages("الرسم المساحي — 372 ada 27 parsel aplikasyon krokisi"), "ara+eng+tur");
  });

  it("reads the file name as evidence too", () => {
    assert.ok(languageList(chooseOcrLanguages("", "H02_Turkey_aplikasyon_krokisi.pdf")).includes("tur"));
  });

  it("degrades to a single model rather than losing the document", async () => {
    const attempts: string[] = [];
    const degraded: string[] = [];
    const result = await createOcrWorkerWithFallback(
      async (languages) => {
        attempts.push(languages);
        if (languages.includes("+")) throw new Error("trained data unavailable");
        return { id: languages };
      },
      "tur+eng",
      (attempted, used) => degraded.push(`${attempted}->${used}`),
    );
    assert.equal(result.languages, "eng");
    assert.deepEqual(result.worker, { id: "eng" });
    assert.ok(attempts.length >= 2);
    assert.deepEqual(degraded, ["tur+eng->eng"]);
  });

  it("keeps the requested models when they load", async () => {
    const result = await createOcrWorkerWithFallback(async (languages) => ({ id: languages }), "ara+eng");
    assert.equal(result.languages, "ara+eng");
  });
});
