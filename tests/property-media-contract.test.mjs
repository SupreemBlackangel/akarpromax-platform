// The media contract: docs/contracts/PROPERTY_MEDIA_CONTRACT.md.
//
// A listing added on the web and the same listing published from the office
// application must land in property_media as the same rows. They used to build
// those rows separately, with the same intent and different results — most
// visibly a video-only listing, which came out of the bridge with no cover at
// all.
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePropertyMedia,
  mediaFromDesktopPayload,
} from "../lib/media/property-media.ts";
import {
  isAcceptedMediaUrl,
  MAX_PROPERTY_IMAGES,
  MAX_PROPERTY_VIDEOS,
  MAX_PROPERTY_IMAGE_BYTES,
} from "../lib/media/limits.ts";

const UPLOAD = (name) => `/uploads/properties/${name}.webp`;

// ---- §2 the two accepted URL forms ---------------------------------------

test("a stored upload path and an absolute http(s) URL are both accepted", () => {
  assert.ok(isAcceptedMediaUrl(UPLOAD("a")));
  assert.ok(isAcceptedMediaUrl("https://cdn.example.com/a.jpg"));
  assert.ok(isAcceptedMediaUrl("http://example.com/a.jpg"));
  assert.ok(isAcceptedMediaUrl("https://www.youtube.com/watch?v=abc"));
});

test("nothing that cannot survive a reload is accepted", () => {
  for (const url of [
    "blob:https://akarpromax.com/9f8c",
    "data:image/png;base64,iVBORw0KGgo=",
    "/etc/passwd",
    "/uploads/properties/../../etc/passwd",
    "uploads/properties/a.webp",
    "ftp://example.com/a.jpg",
    "", "   ", null, undefined, 42, {},
  ]) {
    assert.equal(isAcceptedMediaUrl(url), false, String(url));
  }
});

// ---- §3 order and cover ---------------------------------------------------

test("order is dense and 0-based, images before videos", () => {
  const rows = normalizePropertyMedia([
    { url: "https://v.example.com/clip", type: "video" },
    { url: UPLOAD("a"), type: "image" },
    { url: UPLOAD("b"), type: "image" },
  ]);
  assert.deepEqual(rows.map((row) => row.order), [0, 1, 2]);
  assert.deepEqual(rows.map((row) => row.type), ["image", "image", "video"]);
});

test("exactly one row is the cover, and it is the first image", () => {
  const rows = normalizePropertyMedia([
    { url: "https://v.example.com/clip", type: "video" },
    { url: UPLOAD("a"), type: "image" },
  ]);
  assert.equal(rows.filter((row) => row.isFeatured).length, 1);
  assert.equal(rows.find((row) => row.isFeatured).url, UPLOAD("a"));
});

test("a listing whose only medium is a video still has a cover", () => {
  // The bug this fixes: the bridge wrote isFeatured:false on the video row and
  // there were no image rows, so nothing was the cover.
  const rows = normalizePropertyMedia(mediaFromDesktopPayload([], "https://youtu.be/abc"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].isFeatured, true);
  assert.equal(rows[0].type, "video");
  assert.equal(rows[0].order, 0);
});

test("a cover the caller marked is honoured", () => {
  const rows = normalizePropertyMedia([
    { url: UPLOAD("a"), type: "image" },
    { url: UPLOAD("b"), type: "image", isFeatured: true },
  ]);
  assert.equal(rows.find((row) => row.isFeatured).url, UPLOAD("b"));
  assert.equal(rows.filter((row) => row.isFeatured).length, 1);
});

// ---- §4 the two doors produce the same rows -------------------------------

test("the web shape and the desktop shape normalise to identical rows", () => {
  const images = [UPLOAD("a"), UPLOAD("b"), UPLOAD("c")];
  const video = "https://youtu.be/abc";

  const fromDesktop = normalizePropertyMedia(mediaFromDesktopPayload(images, video));
  const fromWeb = normalizePropertyMedia([
    ...images.map((url) => ({ url, type: "image" })),
    { url: video, type: "video" },
  ]);

  assert.deepEqual(fromWeb, fromDesktop);
  assert.equal(JSON.stringify(fromWeb), JSON.stringify(fromDesktop));
});

test("round trip: normalised rows fed back in are unchanged", () => {
  // What the sync route hands back to the office application, re-sent.
  const first = normalizePropertyMedia(
    mediaFromDesktopPayload([UPLOAD("a"), UPLOAD("b")], "https://youtu.be/abc"),
  );
  const second = normalizePropertyMedia(first);
  assert.deepEqual(second, first);
  assert.deepEqual(normalizePropertyMedia(second), first);
});

// ---- rubbish in, clean rows out -------------------------------------------

test("unusable entries are dropped rather than stored as broken rows", () => {
  const rows = normalizePropertyMedia([
    null,
    undefined,
    { url: "" },
    { url: "blob:https://akarpromax.com/x", type: "image" },
    { url: UPLOAD("a"), type: "image" },
    "not a url",
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, UPLOAD("a"));
  assert.ok(rows.every((row) => typeof row.url === "string" && row.url.length > 0));
});

test("the same URL twice becomes one row", () => {
  const rows = normalizePropertyMedia([
    { url: UPLOAD("a"), type: "image" },
    { url: UPLOAD("a"), type: "image" },
    { url: UPLOAD("b"), type: "image" },
  ]);
  assert.deepEqual(rows.map((row) => row.url), [UPLOAD("a"), UPLOAD("b")]);
});

test("a bare string is read as an image URL", () => {
  const rows = normalizePropertyMedia([UPLOAD("a"), "https://cdn.example.com/b.jpg"]);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.type === "image"));
});

test("no media at all is an empty list, not a row with an empty url", () => {
  for (const input of [[], null, undefined, "", {}]) {
    assert.deepEqual(normalizePropertyMedia(input), []);
  }
});

// ---- §5 the limits --------------------------------------------------------

test("the counts are capped by the shared limits", () => {
  const many = Array.from({ length: MAX_PROPERTY_IMAGES + 5 }, (_, i) => ({ url: UPLOAD(`i${i}`), type: "image" }));
  const videos = Array.from({ length: 3 }, (_, i) => ({ url: `https://v.example.com/${i}`, type: "video" }));
  const rows = normalizePropertyMedia([...many, ...videos]);
  assert.equal(rows.filter((row) => row.type === "image").length, MAX_PROPERTY_IMAGES);
  assert.equal(rows.filter((row) => row.type === "video").length, MAX_PROPERTY_VIDEOS);
  assert.deepEqual(rows.map((row) => row.order), rows.map((_, i) => i));
});

test("the image size cap is the office application's 6 MB, one number for both sides", async () => {
  assert.equal(MAX_PROPERTY_IMAGE_BYTES, 6 * 1024 * 1024);
  // The bridge and the web upload route must both read it from here.
  const { readFile } = await import("node:fs/promises");
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|\*).*$/gm, "");
  const bridge = strip(await readFile(new URL("../lib/integration/desktop-property-publish.ts", import.meta.url), "utf8"));
  assert.match(bridge, /MAX_PROPERTY_IMAGE_BYTES/);
  assert.doesNotMatch(bridge, /6 \* 1024 \* 1024/, "the bridge must not keep its own copy of the cap");
});

// ---- §4.4 the sync pull carries the media back ---------------------------

test("the pull the office application uses returns media, in its own shape", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../lib/integration/desktop-property-publish.ts", import.meta.url), "utf8");
  // It answered without media at all, so a listing added on the website came
  // back to the office with no images — and re-publishing it would wipe them.
  assert.match(source, /listDesktopProperties/);
  assert.match(source, /images: media\.filter\(\(item\) => item\.type === "image"\)/);
  assert.match(source, /videoUrl: media\.find\(\(item\) => item\.type === "video"\)/);
  // Additive only: the fields the desktop 3.0.3 already reads are untouched.
  for (const field of ["ownerName", "agentName", "latitude", "longitude", "price", "area"]) {
    assert.match(source, new RegExp(`${field}: properties\.${field}`), `${field} must still be selected`);
  }
});

// ---- the write paths all go through the normaliser ------------------------

test("every write path normalises instead of building rows itself", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of [
    "app/api/properties/route.ts",
    "app/api/properties/[id]/route.ts",
    "lib/integration/desktop-property-publish.ts",
  ]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /normalizePropertyMedia/, `${file} must normalise its media`);
    assert.doesNotMatch(source, /isFeatured: index === 0/, `${file} must not assign the cover itself`);
  }
});
