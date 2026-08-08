import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setNewsDbForTesting } from "@/lib/news/db";
import { createInMemoryDb } from "../helpers/in-memory-db.mjs";
import {
  validateSourceInput,
  createNewsSource,
  listNewsSources,
  getNewsSource,
  updateNewsSource,
  deleteNewsSource,
  recordSourceFetch,
} from "@/lib/news/sources";

describe("news sources module (in-memory db)", () => {
  beforeEach(() => {
    setNewsDbForTesting(createInMemoryDb() as never);
  });
  afterEach(() => {
    setNewsDbForTesting(null);
  });

  it("validates source input", () => {
    assert.equal(validateSourceInput({ name: "", url: "https://x.com" }).ok, false);
    assert.equal(validateSourceInput({ name: "x", url: "" }).ok, false);
    assert.equal(validateSourceInput({ name: "x", url: "http://localhost:3000/feed" }).ok, false);
    assert.equal(validateSourceInput({ name: "x", url: "ftp://x.com" }).ok, false);

    const good = validateSourceInput({
      name: "Times of Oman", url: "https://timesofoman.com/rss",
      sourceType: "RSS", format: "rss", language: "en",
    });
    assert.equal(good.ok, true);
    assert.equal(good.normalized?.trustLevel, "REVIEW_REQUIRED");
    assert.equal(good.normalized?.status, "active");
  });

  it("creates and lists sources", async () => {
    const source = await createNewsSource(
      { name: "Test", url: "https://example.com/feed", language: "ar" },
      "admin-1",
    );
    assert.ok(source.id);
    assert.equal(source.name, "Test");
    assert.equal(source.sourceType, "RSS");
    assert.equal(source.trustLevel, "REVIEW_REQUIRED");
    assert.equal(source.status, "active");

    const all = await listNewsSources();
    assert.equal(all.length, 1);
    const byStatus = await listNewsSources({ status: "active" });
    assert.equal(byStatus.length, 1);
  });

  it("updates a source preserving normalized fields", async () => {
    const source = await createNewsSource({ name: "A", url: "https://example.com/a" }, null);
    const updated = await updateNewsSource(source.id, { name: "B", trustLevel: "TRUSTED" });
    assert.equal(updated.name, "B");
    assert.equal(updated.trustLevel, "TRUSTED");
    assert.equal(updated.url, "https://example.com/a");
  });

  it("rejects update to a blocked URL", async () => {
    const source = await createNewsSource({ name: "A", url: "https://example.com/a" }, null);
    await assert.rejects(
      () => updateNewsSource(source.id, { url: "http://192.168.0.1/x" }),
      /not allowed/,
    );
  });

  it("deletes a source", async () => {
    const source = await createNewsSource({ name: "A", url: "https://example.com/a" }, null);
    await deleteNewsSource(source.id);
    assert.equal(await getNewsSource(source.id), null);
    assert.equal((await listNewsSources()).length, 0);
  });

  it("records fetch status", async () => {
    const source = await createNewsSource({ name: "A", url: "https://example.com/a" }, null);
    await recordSourceFetch(source.id, "ok", null, "hash-1", "etag-1");
    const updated = await getNewsSource(source.id);
    assert.equal(updated?.lastFetchStatus, "ok");
    assert.equal(updated?.contentHash, "hash-1");
    assert.equal(updated?.etag, "etag-1");

    await recordSourceFetch(source.id, "error", "HTTP 500");
    const failed = await getNewsSource(source.id);
    assert.equal(failed?.lastFetchStatus, "error");
    assert.equal(failed?.lastError, "HTTP 500");
  });
});
