/**
 * News & Ticker Engine — minimal RSS/Atom feed parser.
 *
 * Hand-rolled and dependency-free so ingestion works in the Workers runtime
 * (vinext dev) without extra packages. Supports RSS 2.0 (`<item>`) and Atom
 * (`<entry>`), extracting title, link, guid/id, description/summary, pubDate,
 * categories and language. Well-formed but lenient: malformed entries are
 * skipped rather than failing the whole feed.
 */

export type ParsedFeedEntry = {
  title: string;
  link: string | null;
  guid: string | null;
  description: string | null;
  pubDate: string | null;
  categories: string[];
};

export type ParsedFeed = {
  title: string | null;
  language: string | null;
  entries: ParsedFeedEntry[];
  rawHash: string | null;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function extractInner(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(xml);
  if (!match) return "";
  return decodeEntities(match[1].trim());
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function findAllBlocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    out.push(match[0]);
  }
  return out;
}

export function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function entryContentHash(entry: ParsedFeedEntry): string {
  return stableHash(`${entry.title}|${entry.link ?? ""}|${entry.pubDate ?? ""}`);
}

export function parseFeed(xml: string): ParsedFeed {
  if (!xml || typeof xml !== "string") {
    return { title: null, language: null, entries: [], rawHash: null };
  }
  const root = xml.slice(0, 500).toLowerCase();
  const isAtom = root.includes("<feed") || root.includes('xmlns="http://www.w3.org/2005/atom"');
  const entryTag = isAtom ? "entry" : "item";
  const feedTitle = isAtom ? extractInner(xml, "title") : extractInner(xml, "channel") ? extractInner(extractChannel(xml), "title") : "";
  const language = isAtom ? "" : extractInner(extractChannel(xml), "language");

  const entries: ParsedFeedEntry[] = findAllBlocks(xml, entryTag).map((block) => {
    const title = stripTags(extractInner(block, isAtom ? "title" : "title"));
    const link =
      isAtom
        ? extractLinkAtom(block)
        : extractLinkRss(block);
    const guid = isAtom ? extractInner(block, "id") : extractInner(block, "guid") || extractLinkRss(block);
    const description = isAtom ? stripTags(extractInner(block, "summary")) : stripTags(extractInner(block, "description"));
    const pubDate = isAtom ? extractInner(block, "updated") || extractInner(block, "published") : extractInner(block, "pubDate");
    const categories = findAllBlocks(block, "category").map((c) => stripTags(extractInner(c, "category"))).filter(Boolean);
    return { title, link, guid: guid || null, description, pubDate: pubDate || null, categories };
  });

  return {
    title: feedTitle || null,
    language: language || null,
    entries,
    rawHash: stableHash(xml.replace(/\s+/g, "")),
  };
}

function extractChannel(xml: string): string {
  const match = /<channel\b[^>]*>[\s\S]*?<\/channel>/i.exec(xml);
  return match?.[0] ?? xml;
}

function extractLinkRss(block: string): string | null {
  const direct = /<link\s*>\s*([^<]+?)\s*<\/link>/i.exec(block);
  if (direct) return decodeEntities(direct[1].trim());
  const attr = /<link\s+(?:href="([^"]+)"|href='([^']+)'|[^>]*href="([^"]+)")\s*\/?>/i.exec(block);
  return attr ? decodeEntities((attr[1] ?? attr[2] ?? attr[3] ?? "").trim()) || null : null;
}

function extractLinkAtom(block: string): string | null {
  const direct = /<link\s*>\s*([^<]+?)\s*<\/link>/i.exec(block);
  if (direct) return decodeEntities(direct[1].trim());
  const attr = /<link\s+(?:href="([^"]+)"|href='([^']+)'|[^>]*href="([^"]+)")\s*\/?>/i.exec(block);
  return attr ? decodeEntities((attr[1] ?? attr[2] ?? attr[3] ?? "").trim()) || null : null;
}
