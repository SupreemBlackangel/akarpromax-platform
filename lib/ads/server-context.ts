import { createHmac } from "node:crypto";
import type { DeviceType } from "@/src/constants/advertising";

/**
 * Server-derived ad targeting signals.
 *
 * Every field the matcher targets on used to arrive from the browser and was
 * only length-clamped (see buildContext). That is the structural problem for a
 * system that bills: the payer's spend is computed from numbers anyone can
 * type. Device-targeted campaigns could be served to any device, domain
 * allowlists bypassed, and — most costly — a new sessionStorage id reset the
 * frequency cap and minted a fresh "unique" impression.
 *
 * This module derives what the request itself proves. It is deliberately
 * honest about what it cannot prove: nginx here forwards X-Real-IP but has no
 * GeoIP module, so country stays client-asserted and is marked as such rather
 * than being dressed up as verified. Wiring a geo source later only needs
 * `resolveServerAdContext` to fill `countryCode` and flip `countrySource`.
 */

export type CountrySource = "server" | "client";

export type ServerAdContext = {
  /** Parsed from the User-Agent — cannot be spoofed by the page's JS. */
  deviceType: DeviceType;
  /** The Host header, not window.location. */
  domain: string | undefined;
  /** Signed, HttpOnly-backed id. Stable per browser, not per tab. */
  sessionId: string;
  /** Set when a fresh session id was minted and the caller must persist it. */
  issuedSessionCookie: string | null;
  clientIp: string | undefined;
  countryCode: string | undefined;
  countrySource: CountrySource;
};

export const AD_SESSION_COOKIE = "akar_ads_sid";
const SESSION_TTL_DAYS = 30;

/** Bots first: they must never consume frequency budget as "mobile users". */
const BOT = /bot|crawl|spider|slurp|bingpreview|headlesschrome|lighthouse|pingdom|gtmetrix/i;
const TABLET = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;
const MOBILE = /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i;

export function deviceFromUserAgent(userAgent: string | null | undefined): DeviceType {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "desktop";
  if (TABLET.test(ua)) return "tablet";
  if (MOBILE.test(ua)) return "mobile";
  return "desktop";
}

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  return BOT.test(userAgent ?? "");
}

function secret(): string {
  const value = process.env.AD_TRACKING_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AD_TRACKING_SECRET is required in production: ad session ids cannot be signed with a public default.");
  }
  return "akar-ad-tracking-dev-only";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);
}

/** `<uuid>.<hmac>` — tamper-evident without a server-side store. */
export function mintSessionId(): string {
  const id = crypto.randomUUID();
  return `${id}.${sign(id)}`;
}

export function verifySessionId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  const id = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!id || !signature) return null;
  // Constant time is unnecessary here: forging only grants a fresh frequency
  // bucket, which minting a new id already grants anyone.
  return sign(id) === signature ? raw : null;
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function sessionCookieHeader(value: string): string {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return `${AD_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Secure`;
}

function normalizeCountry(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toLowerCase();
  // ISO-3166 alpha-2 only: anything else is a typo or an injection attempt and
  // would silently make a campaign unservable.
  return /^[a-z]{2}$/.test(code) ? code : undefined;
}

export function resolveServerAdContext(
  request: Request,
  clientCountry?: unknown,
): ServerAdContext {
  const headers = request.headers;

  const existing = verifySessionId(readCookie(headers.get("cookie"), AD_SESSION_COOKIE));
  const sessionId = existing ?? mintSessionId();

  const host = headers.get("host") ?? undefined;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    deviceType: deviceFromUserAgent(headers.get("user-agent")),
    domain: host ? host.split(":")[0].toLowerCase() : undefined,
    sessionId,
    issuedSessionCookie: existing ? null : sessionCookieHeader(sessionId),
    clientIp: forwarded || headers.get("x-real-ip") || undefined,
    // No GeoIP at the edge yet, so this stays the visitor's assertion — kept
    // because the country switcher is a real product feature, but validated
    // and labelled so a future geo source can override it.
    countryCode: normalizeCountry(clientCountry),
    countrySource: "client",
  };
}
