/**
 * Where a click may send a visitor.
 *
 * `target_url` is admin-entered free text stored on the campaign and handed
 * straight to a Location header. A `javascript:` or `data:` value has no
 * business there, and a protocol-relative `//evil.example` would quietly leave
 * the site while looking like a path. Anything unrecognised falls back to the
 * site root rather than being passed through.
 */
export function safeRedirect(target: string | null | undefined, origin: string): string {
  const value = (target ?? "").trim();
  if (!value) return origin;
  if (value.startsWith("//")) return origin;
  if (value.startsWith("/")) return new URL(value, origin).toString();
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : origin;
  } catch {
    return origin;
  }
}
