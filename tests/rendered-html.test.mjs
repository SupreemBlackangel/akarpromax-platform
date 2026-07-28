import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AkarPromax public landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>عقار بروماكس \| منصة العقار الذكية في عُمان<\/title>/);
  assert.match(html, /قرارك العقاري/);
  assert.match(html, /AkarPromax Office/);
  assert.match(html, /الشريط الإخباري/);
  assert.match(html, /أدوات المنصة/);
  assert.match(html, /اختيار اللغة/);
  assert.match(html, /العربية/);
  assert.match(html, /English/);
  assert.match(html, /Türkçe/);
  assert.match(html, /country-trigger/);
  assert.match(html, /country-dropdown/);
  assert.match(html, /country-flag/);
});

test("does not retain the starter preview or starter metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(layout, /عقار بروماكس/);
  assert.match(layout, /openGraph/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
