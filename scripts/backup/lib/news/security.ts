/**
 * News & Ticker Engine — SSRF + XSS protections.
 *
 * `isSafeFetchUrl` blocks private/local network targets before the ingestion
 * engine ever calls fetch() (SSRF). `sanitizeHtml` strips scripts, event
 * handlers and unsafe URL schemes from imported/summarized body text so the
 * ticker/news blocks never render attacker-controlled markup.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "metadata.azure.internal",
  "169.254.169.254",
]);

const PRIVATE_IP_PREFIXES = [
  "10.",
  "127.",
  "169.254.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.2",
  "172.30.",
  "172.31.",
  "192.168.",
];

const SAFE_SCHEMES = new Set(["http:", "https:"]);

export function isSafeFetchUrl(candidate: string): boolean {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return false;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname)) return false;
  if (hostname.split(".").some((part) => BLOCKED_HOSTNAMES.has(part))) return false;
  if (PRIVATE_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) return false;
  if (hostname.includes(":")) return false;
  return true;
}

export function safeLinkUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  if (!value) return null;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "span", "a", "ul", "ol",
  "li", "h2", "h3", "h4", "blockquote", "code", "pre", "figure", "figcaption",
]);

const ALLOWED_ATTRS = new Set(["href", "title", "target", "rel"]);

const UNSAFE_ATTR_PATTERN = /^on/i;
const UNSAFE_PROTOCOL_PATTERN = /^\s*(javascript|vbscript|data):/i;

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  let value = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(iframe|object|embed|form|input|button|textarea|select|base|meta|link)[\s\S]*?>/gi, "");

  value = value.replace(/<(\/?)([a-z0-9]+)((?:"[^"]*"|'[^']*'|[^"'>])*?)>/gi, (full, closing: string, tag: string, attrs: string) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) {
      return "";
    }
    const cleaned = attrs.replace(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_match, name: string, dq?: string, sq?: string, bare?: string) => {
      const attrName = name.toLowerCase();
      if (UNSAFE_ATTR_PATTERN.test(attrName)) return "";
      const attrValue = (dq ?? sq ?? bare ?? "").trim();
      if (attrName === "href" || attrName === "src") {
        if (UNSAFE_PROTOCOL_PATTERN.test(attrValue)) return "";
      }
      if (attrName === "target") {
        return attrValue === "_blank" ? `${name}="_blank"` : `${name}="_self"`;
      }
      if (attrName === "rel") {
        return `${name}="noopener noreferrer"`;
      }
      if (!ALLOWED_ATTRS.has(attrName)) return "";
      const escaped = attrValue.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `${name}="${escaped}"`;
    });
    if (lower === "a" && !/href=/.test(cleaned)) return "";
    const selfClose = /\/>/.test(full) && !closing ? " />" : ">";
    return `<${closing}${lower}${cleaned}${selfClose}`;
  });

  return value.trim();
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
