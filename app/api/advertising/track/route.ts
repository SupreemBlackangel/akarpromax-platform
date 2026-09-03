import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adAnalytics } from '@/lib/db/schemas/advertising-schema';
import { clientIp, enforceRateLimit } from '@/lib/security/rate-limit';

/**
 * The legacy advertising tracker.
 *
 * This is the second of two ad stacks. It is live: the components under
 * `components/advertising/placements/*` call it from the company, office and
 * tool pages. The other stack (`/api/ads/*`) protects its trackers with a
 * signed, campaign-bound token, a nonce and a rate limit.
 *
 * A token cannot be demanded here without breaking those components, which do
 * not mint one -- so this closes what can be closed without taking a working
 * feature off the site: a rate limit, an allow-listed event type, and bounded
 * field lengths. The real fix is retiring this stack in favour of the one that
 * already does it properly, and that is a phase of its own.
 *
 * Recorded rather than changed: this writes a raw IP address into
 * `ad_analytics`. Nothing reads it today. It should be hashed or dropped, but
 * changing it silently would alter what the existing rows mean, so it belongs
 * with the stack decision rather than here.
 */

/** Event names this tracker accepts. Anything else was previously inserted verbatim. */
const EVENT_TYPES = new Set(['impression', 'click', 'view', 'close', 'conversion']);

function clean(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  // Public by necessity -- a browser reports these -- so the limit is the only
  // thing between one visitor and an unbounded write loop.
  const limit = await enforceRateLimit('ads_impression', clientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const campaignId = clean(body.campaignId, 80);
    const eventType = clean(body.eventType, 32);

    if (!campaignId || !eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await db.insert(adAnalytics).values({
      campaignId,
      creativeId: clean(body.creativeId, 80),
      eventType,
      // Bounded. These arrived from the page and went into the column at
      // whatever length they happened to be.
      page: clean(body.page, 200),
      placement: clean(body.placement, 64),
      country: clean(body.country, 8),
      governorate: clean(body.governorate, 100),
      city: clean(body.city, 100),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
