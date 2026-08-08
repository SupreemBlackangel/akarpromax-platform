import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFeed, stableHash, entryContentHash } from "@/lib/news/rss";
import { relevanceScore } from "@/lib/news/ingestion";

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com/</link>
    <description>News</description>
    <item>
      <title>Breaking: Oman opens new port</title>
      <link>https://example.com/port</link>
      <guid>https://example.com/port</guid>
      <pubDate>Mon, 01 Aug 2026 08:00:00 GMT</pubDate>
      <description>Details about the new port.</description>
    </item>
    <item>
      <title>Second story</title>
      <link>https://example.com/two</link>
      <guid>two</guid>
      <pubDate>invalid date</pubDate>
      <description><![CDATA[<p>Second story text.</p>]]></description>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <id>https://example.com/feed</id>
  <link href="https://example.com/feed" rel="self"/>
  <entry>
    <title>Atom entry</title>
    <id>https://example.com/atom/1</id>
    <link href="https://example.com/atom/1"/>
    <published>2026-08-02T10:00:00Z</published>
    <updated>2026-08-02T10:00:00Z</updated>
    <summary>Atom summary</summary>
  </entry>
</feed>`;

describe("news RSS parsing", () => {
  it("parses RSS 2.0 items", () => {
    const feed = parseFeed(RSS_FIXTURE);
    assert.equal(feed.entries.length, 2);
    assert.equal(feed.entries[0].title, "Breaking: Oman opens new port");
    assert.equal(feed.entries[0].link, "https://example.com/port");
    assert.equal(feed.entries[0].guid, "https://example.com/port");
    assert.equal(feed.entries[0].pubDate, "Mon, 01 Aug 2026 08:00:00 GMT");
    assert.equal(feed.entries[0].description, "Details about the new port.");
  });

  it("parses Atom entries", () => {
    const feed = parseFeed(ATOM_FIXTURE);
    assert.equal(feed.entries.length, 1);
    assert.equal(feed.entries[0].title, "Atom entry");
    assert.equal(feed.entries[0].link, "https://example.com/atom/1");
    assert.equal(feed.entries[0].pubDate, "2026-08-02T10:00:00Z");
    assert.equal(feed.entries[0].description, "Atom summary");
  });

  it("returns empty entries for malformed XML", () => {
    const feed = parseFeed("<not-xml");
    assert.deepEqual(feed.entries, []);
  });

  it("returns empty entries for empty input", () => {
    assert.deepEqual(parseFeed("").entries, []);
    assert.deepEqual(parseFeed(null as unknown as string).entries, []);
  });

  it("deduplicates entries by content hash", () => {
    const feed = parseFeed(RSS_FIXTURE);
    const hashes = feed.entries.map((e) => entryContentHash(e));
    assert.equal(new Set(hashes).size, 2);
  });
});

describe("news stableHash", () => {
  it("is deterministic", () => {
    assert.equal(stableHash("hello world"), stableHash("hello world"));
  });

  it("differs for different input", () => {
    assert.notEqual(stableHash("a"), stableHash("b"));
  });

  it("handles empty and unicode input", () => {
    assert.ok(stableHash("").length > 0);
    assert.ok(stableHash("خبر بالعربية").length > 0);
  });
});

describe("news relevance scoring", () => {
  it("scores higher with more matched keywords", () => {
    const title = "New villa project announced";
    const low = relevanceScore(title, null);
    const high = relevanceScore(title, "Villa apartments for rent in Muscat with new development plans");
    assert.ok(high > low);
    assert.ok(high >= 3);
  });

  it("neutral score without keywords", () => {
    const score = relevanceScore("Some unrelated headline", null);
    assert.equal(typeof score, "number");
    assert.ok(score >= 0);
  });
});
