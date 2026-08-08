import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSafeFetchUrl, safeLinkUrl, sanitizeHtml, escapeHtml } from "@/lib/news/security";

describe("news SSRF guard (isSafeFetchUrl)", () => {
  it("allows public https URLs", () => {
    assert.equal(isSafeFetchUrl("https://timesofoman.com/feed"), true);
    assert.equal(isSafeFetchUrl("http://example.com/rss"), true);
  });

  it("rejects non-http(s) schemes", () => {
    assert.equal(isSafeFetchUrl("file:///etc/passwd"), false);
    assert.equal(isSafeFetchUrl("ftp://example.com/x"), false);
    assert.equal(isSafeFetchUrl("data:text/html,x"), false);
    assert.equal(isSafeFetchUrl("javascript:alert(1)"), false);
  });

  it("rejects localhost and loopback", () => {
    assert.equal(isSafeFetchUrl("http://localhost/admin"), false);
    assert.equal(isSafeFetchUrl("http://127.0.0.1:8080"), false);
    assert.equal(isSafeFetchUrl("http://0.0.0.0"), false);
    assert.equal(isSafeFetchUrl("http://[::1]"), false);
  });

  it("rejects private IP ranges", () => {
    assert.equal(isSafeFetchUrl("http://10.0.0.1"), false);
    assert.equal(isSafeFetchUrl("http://172.16.5.4"), false);
    assert.equal(isSafeFetchUrl("http://192.168.1.1"), false);
    assert.equal(isSafeFetchUrl("http://169.254.169.254/latest/meta-data"), false);
  });

  it("rejects cloud metadata hostnames and malformed URLs", () => {
    assert.equal(isSafeFetchUrl("http://metadata.google.internal"), false);
    assert.equal(isSafeFetchUrl("http://metadata.azure.internal"), false);
    assert.equal(isSafeFetchUrl("not a url"), false);
    assert.equal(isSafeFetchUrl(""), false);
    assert.equal(isSafeFetchUrl(null as unknown as string), false);
  });
});

describe("news safeLinkUrl", () => {
  it("allows https/http/mailto", () => {
    assert.equal(safeLinkUrl("https://example.com"), "https://example.com/");
    assert.equal(safeLinkUrl("mailto:test@example.com"), "mailto:test@example.com");
  });

  it("allows anchors and relative paths", () => {
    assert.equal(safeLinkUrl("#top"), "#top");
    assert.equal(safeLinkUrl("/properties/1"), "/properties/1");
    assert.equal(safeLinkUrl(null), null);
    assert.equal(safeLinkUrl(""), null);
    assert.equal(safeLinkUrl("   "), null);
  });

  it("rejects dangerous schemes", () => {
    assert.equal(safeLinkUrl("javascript:alert(1)"), null);
    assert.equal(safeLinkUrl("data:text/html,x"), null);
    assert.equal(safeLinkUrl("vbscript:msgbox"), null);
    assert.equal(safeLinkUrl("//evil.com"), null);
  });
});

describe("news HTML sanitizer", () => {
  it("strips script, style, comments and unsafe embeds", () => {
    const input = `<p>hello</p><script>alert(1)</script><style>x{}</style><!-- c --><iframe src="x"></iframe>`;
    const out = sanitizeHtml(input);
    assert.ok(!out.includes("<script"));
    assert.ok(!out.includes("<style"));
    assert.ok(!out.includes("<iframe"));
    assert.ok(!out.includes("<!--"));
  });

  it("strips event handlers and unsafe hrefs", () => {
    const input = `<a href="javascript:alert(1)" onclick="x()">link</a>`;
    const out = sanitizeHtml(input);
    assert.ok(!out.includes("onclick"));
    assert.ok(!out.includes("javascript:"));
  });

  it("removes disallowed tags entirely", () => {
    assert.equal(sanitizeHtml("keep <div class=\"a\">this</div>"), "keep this");
  });

  it("adds safe target/rel on anchors", () => {
    const out = sanitizeHtml(`<a href="https://example.com" target="_blank" rel="nofollow">x</a>`);
    assert.ok(out.includes('target="_blank"'));
    assert.ok(out.includes('rel="noopener noreferrer"'));
  });

  it("forces target to _self when not _blank", () => {
    const out = sanitizeHtml(`<a href="https://example.com" target="_top">x</a>`);
    assert.ok(out.includes('target="_self"'));
  });

  it("drops anchors without href", () => {
    assert.ok(!sanitizeHtml(`<a>no href</a>`).includes("<a"));
  });

  it("handles null/empty input", () => {
    assert.equal(sanitizeHtml(null), "");
    assert.equal(sanitizeHtml(""), "");
    assert.equal(sanitizeHtml(undefined), "");
  });
});

describe("news escapeHtml", () => {
  it("escapes HTML special characters", () => {
    assert.equal(escapeHtml(`<b>"x" & 'y'</b>`), "&lt;b&gt;&quot;x&quot; &amp; &#x27;y&#x27;&lt;/b&gt;");
  });
});
