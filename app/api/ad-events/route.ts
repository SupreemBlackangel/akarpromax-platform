import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { resolveTrackRequest, type TrackRequest } from "@/lib/ads/track";
import { resolveServerAdContext } from "@/lib/ads/server-context";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Deprecated ad event intake.
 *
 * This accepted POST with no authentication, no permission, no rate limit and
 * no signed token, and wrote straight into `ad_events` -- the table that feeds
 * impression and click counts, which feed budget exhaustion. Anyone able to
 * send a request could inflate or exhaust any active campaign's budget, and
 * could do it as fast as the server would answer.
 *
 * Its siblings `/api/ads/impression` and `/api/ads/click` were already
 * protected: rate limited, and requiring a tracking token this server minted
 * for that campaign. This route was the unguarded one.
 *
 * It is kept rather than deleted because a stale client bundle under `dist/`
 * still references the path, and a route that vanishes gives whoever calls it
 * a 404 with nothing to read. It now enforces exactly what its siblings
 * enforce, and logs each call, so that if anything real is still using it that
 * becomes a fact in the log rather than a guess. Once the log stays empty it
 * can go.
 *
 * Evidence it is unused, gathered before changing it: no caller anywhere in
 * `app/`, `src/` or `components/`; no reference in the desktop application or
 * its shipped front end; zero occurrences in the production nginx access log.
 */

const EVENT_TYPES = [
  "impression",
  "click",
  "slide_change",
  "video_start",
  "video_25",
  "video_50",
  "video_75",
  "video_complete",
];

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const limit = await enforceRateLimit("ads_impression", clientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Unguarded request.json() threw on a non-JSON body, which became a 500 --
  // an error page for what is only a malformed request.
  const body = (await request.json().catch(() => null)) as (TrackRequest & Record<string, unknown>) | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // The token is the whole point: it is minted by this server when the ad is
  // served, is bound to that campaign, and expires. Without it there is nothing
  // separating a real impression from a script in a loop.
  const server = resolveServerAdContext(request, clean(body.countryCode, 2));
  const resolved = await resolveTrackRequest(body, server);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const eventType = clean(body.eventType, 30);
  const countryCode = clean(body.countryCode, 2).toLowerCase();
  const cityId = clean(body.cityId, 100).toLowerCase() || null;
  const locale = clean(body.locale, 2).toLowerCase();
  const device = clean(body.device, 20).toLowerCase();

  if (
    !EVENT_TYPES.includes(eventType) ||
    !/^[a-z]{2}$/.test(countryCode) ||
    !["ar", "en", "tr"].includes(locale) ||
    !["desktop", "mobile"].includes(device)
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const campaign = await db.prepare(
    `SELECT id FROM ad_campaigns
     WHERE id = ?1 AND status = 'active'
       AND (start_at IS NULL OR datetime(start_at) <= datetime('now'))
       AND (end_at IS NULL OR datetime(end_at) >= datetime('now'))
     LIMIT 1`,
  ).bind(resolved.campaignId).first<{ id: string }>();
  if (!campaign) return NextResponse.json({ error: "Campaign not active" }, { status: 404 });

  // Recorded so the decision to remove this route is made from evidence.
  console.warn("[ad-events] deprecated endpoint used", {
    campaignId: resolved.campaignId,
    eventType,
  });

  await db.prepare(
    `INSERT INTO ad_events
      (id, campaign_id, event_type, country_code, city_id, locale, device)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind(crypto.randomUUID(), resolved.campaignId, eventType, countryCode, cityId, locale, device).run();

  return new NextResponse(null, { status: 204 });
}
