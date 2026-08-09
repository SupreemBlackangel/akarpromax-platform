import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setNewsDbForTesting } from "@/lib/news/db";
import { createInMemoryDb } from "../helpers/in-memory-db.mjs";
import { createNewsSource } from "@/lib/news/sources";
import { ingestSource } from "@/lib/news/ingestion";

type MemDb = { seed(name: string, rows: unknown[]): void; dump(name: string): unknown[] };

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Test</title>
  <item>
    <title>Oman real estate market grows</title>
    <link>https://example.com/1</link>
    <guid>https://example.com/1</guid>
    <pubDate>Mon, 01 Aug 2026 08:00:00 GMT</pubDate>
    <description>New housing development in Muscat.</description>
  </item>
  <item>
    <title>Second unrelated story</title>
    <link>https://example.com/2</link>
    <guid>https://example.com/2</guid>
    <pubDate>Mon, 01 Aug 2026 09:00:00 GMT</pubDate>
    <description>Something else.</description>
  </item>
</channel></rss>`;

function mockFetchOnce(body: string, status = 200): void {
  (globalThis as Record<string, unknown>).fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/rss+xml" }),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  });
}

function mockFetchSequence(...responses: Array<{ body?: string; status?: number; headers?: Record<string, string> }>): void {
  let index = 0;
  (globalThis as Record<string, unknown>).fetch = async () => {
    const response = responses[Math.min(index, responses.length - 1)] ?? {};
    index += 1;
    const body = response.body ?? "";
    const status = response.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(response.headers ?? { "content-type": "application/rss+xml" }),
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    };
  };
}

function clearFetchMock(): void {
  delete (globalThis as Record<string, unknown>).fetch;
}

describe("news ingestion (in-memory db + mocked fetch)", () => {
  beforeEach(() => {
    setNewsDbForTesting(createInMemoryDb() as never);
  });
  afterEach(() => {
    setNewsDbForTesting(null);
    clearFetchMock();
  });

  it("ingests entries as drafts with REVIEW_REQUIRED", async () => {
    const mem = createInMemoryDb() as never as MemDb;
    setNewsDbForTesting(mem as never);
    mockFetchOnce(RSS_XML);
    const source = await createNewsSource({
      name: "Times", url: "https://timesofoman.com/rss", language: "ar",
    }, "admin-1");
    const summary = await ingestSource(source.id);

    assert.equal(summary.fetched, true);
    assert.equal(summary.entries, 2);
    assert.equal(summary.newItems, 2);
    assert.equal(summary.duplicates, 0);

    const news = mem.dump("news");
    assert.equal(news.length, 2);
    const first = news[0] as Record<string, unknown>;
    assert.equal(first.status, "draft");
    assert.equal(first.scope, "global");
    assert.equal(first.country_code, null);

    const ext = mem.dump("news_extended");
    assert.equal(ext.length, 2);
    assert.equal((ext[0] as Record<string, unknown>).review_status, "REVIEW_REQUIRED");
    assert.equal((ext[0] as Record<string, unknown>).news_type, "RSS");
    assert.equal((ext[0] as Record<string, unknown>).source_name, "Times");
  });

  it("deduplicates on re-fetch via content hash", async () => {
    const mem = createInMemoryDb() as never as MemDb;
    setNewsDbForTesting(mem as never);
    mockFetchOnce(RSS_XML);
    const source = await createNewsSource({ name: "Times", url: "https://timesofoman.com/rss" }, "admin-1");

    const first = await ingestSource(source.id);
    assert.equal(first.newItems, 2);

    const second = await ingestSource(source.id);
    assert.equal(second.newItems, 0);
    assert.equal(second.duplicates, 2);
    assert.equal(mem.dump("news").length, 2);
  });

  it("skips entries without a title", async () => {
    const xml = `<rss><channel><item><link>https://example.com/x</link></item></channel></rss>`;
    mockFetchOnce(xml);
    const source = await createNewsSource({ name: "A", url: "https://a.com/rss" }, null);
    const summary = await ingestSource(source.id);
    assert.equal(summary.entries, 1);
    assert.equal(summary.newItems, 0);
    assert.equal(summary.duplicates, 1);
  });

  it("records fetch error on HTTP failure", async () => {
    mockFetchOnce("oops", 500);
    const source = await createNewsSource({ name: "A", url: "https://a.com/rss" }, null);
    const summary = await ingestSource(source.id);
    assert.equal(summary.fetched, false);
    assert.ok(summary.errors.some((e) => e.includes("HTTP 500")));
  });

  it("blocks redirects to private or local targets", async () => {
    mockFetchSequence({
      status: 302,
      headers: { location: "http://127.0.0.1:3010/internal" },
    });
    const source = await createNewsSource({ name: "Redirector", url: "https://example.com/rss" }, null);
    const summary = await ingestSource(source.id);
    assert.equal(summary.fetched, false);
    assert.ok(summary.errors.some((e) => e.includes("Blocked: source URL is not a public http(s) endpoint")));
  });

  it("rejects unknown sources", async () => {
    const summary = await ingestSource("missing-source");
    assert.equal(summary.fetched, false);
    assert.ok(summary.errors.some((e) => e.includes("Source not found")));
    assert.equal(summary.sourceId, "missing-source");
  });
});
