import assert from "node:assert/strict";
import test from "node:test";

import { normaliseCreatives } from "../lib/ads/admin.ts";

// The PATCH route reconciles creatives by id (UPDATE kept / INSERT new /
// DELETE removed) instead of deleting and re-inserting the whole set. That only
// works if the normaliser keeps the ids the client sends back — a fresh UUID
// on every save is exactly what used to orphan impression/click history.

function body(creatives) {
  return { creatives };
}

test("a creative sent with its id keeps that id across a save", () => {
  const [creative] = normaliseCreatives(body([{ id: "cr-existing", mediaUrl: "https://cdn.example.com/a.webp" }]));
  assert.equal(creative.id, "cr-existing");
});

test("a creative sent without an id (newly added) gets a fresh uuid", () => {
  const [creative] = normaliseCreatives(body([{ mediaUrl: "https://cdn.example.com/new.webp" }]));
  assert.match(creative.id, /^[0-9a-f-]{36}$/);
});

test("alt text and intrinsic dimensions ride through the payload", () => {
  const [creative] = normaliseCreatives(body([{
    id: "cr-1",
    mediaUrl: "https://cdn.example.com/a.webp",
    altTextAr: "فيلا للبيع في الرياض",
    altTextEn: "Villa for sale in Riyadh",
    altTextTr: "Riyad'da satılık villa",
    mediaWidth: 1920,
    mediaHeight: 800,
  }]));
  assert.deepEqual(creative.altText, { ar: "فيلا للبيع في الرياض", en: "Villa for sale in Riyadh", tr: "Riyad'da satılık villa" });
  assert.equal(creative.mediaWidth, 1920);
  assert.equal(creative.mediaHeight, 800);
});

test("absent alt text and dimensions become null, so COALESCE keeps stored values", () => {
  const [creative] = normaliseCreatives(body([{ id: "cr-1", mediaUrl: "https://cdn.example.com/a.webp" }]));
  assert.deepEqual(creative.altText, { ar: null, en: null, tr: null });
  assert.equal(creative.mediaWidth, null);
  assert.equal(creative.mediaHeight, null);
});

test("garbage dimensions are rejected rather than stored", () => {
  const [creative] = normaliseCreatives(body([{ id: "cr-1", mediaUrl: "https://cdn.example.com/a.webp", mediaWidth: -5, mediaHeight: "huge" }]));
  assert.equal(creative.mediaWidth, null);
  assert.equal(creative.mediaHeight, null);
});

test("position follows array order, so reordering in the wizard is honoured", () => {
  const list = normaliseCreatives(body([
    { id: "b", mediaUrl: "https://cdn.example.com/b.webp" },
    { id: "a", mediaUrl: "https://cdn.example.com/a.webp" },
  ]));
  assert.deepEqual(list.map((c) => [c.id, c.position]), [["b", 1], ["a", 2]]);
});
