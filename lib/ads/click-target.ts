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

/**
 * The origin a visitor actually reached us on.
 *
 * `request.nextUrl.origin` reports the address the Node server is bound to, not
 * the address the browser used. Behind nginx that is `0.0.0.0:3010`, so every
 * redirect the click tracker produced -- the fallback for an unknown token and
 * the whole of any campaign whose target_url is a path on this site -- pointed
 * at a host no browser can resolve. Now that the ad's anchor links through the
 * tracker, that is the main click path, so it has to come from the forwarded
 * request headers instead.
 */
export function publicOrigin(request: { headers: { get(name: string): string | null }; nextUrl: { origin: string } }): string {
  const host = request.headers.get("host")?.trim().toLowerCase();
  // Self-inflicted only -- nginx replaces Host with the requested one -- but a
  // header is still client-supplied, so reject anything that is not a plain
  // hostname before it reaches a Location.
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/.test(host) || host.startsWith("0.0.0.0")) {
    return request.nextUrl.origin;
  }
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const scheme = proto === "http" || proto === "https" ? proto : "https";
  return `${scheme}://${host}`;
}
