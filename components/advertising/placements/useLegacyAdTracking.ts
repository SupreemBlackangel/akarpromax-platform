'use client';

import { useEffect, useRef } from 'react';

/**
 * Report impressions and clicks for the legacy ad components.
 *
 * These components were counting almost nothing. They posted a click to
 * `/api/advertising/track`, which writes `ad_analytics` -- a table no report
 * reads -- and they recorded no impression at all, on the client or the server.
 *
 * So an ad shown on a company, office or tool page was invisible to every
 * counter that matters:
 *
 *   - impressions never incremented, so a CPM campaign was never charged for
 *     them and `max_impressions` never reached its cap;
 *   - `frequency_cap_per_user` never fired, so the same visitor could be shown
 *     the same ad without limit;
 *   - the admin statistics read `ad_impressions`, so those pages contributed
 *     nothing to any report, and CTR was computed from partial data.
 *
 * The fix needed nothing new: `/api/advertising/match` already returns the
 * tracking token the engine minted, so these components always had what the
 * protected endpoints require. They simply did not use it.
 *
 * The existing `/api/advertising/track` call is left in place. It writes a
 * table nothing currently reads, but removing a write is a separate decision
 * from starting the ones that were missing.
 */

type TrackingContext = {
  countryCode?: string;
  language?: string;
  deviceType?: 'desktop' | 'mobile';
};

function post(path: string, body: Record<string, unknown>): void {
  // Fire and forget. A counter that fails must never break the page the ad sits
  // on, and there is nothing useful to tell the visitor about it.
  try {
    void fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function detectDevice(): 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

/**
 * Record one impression for a rendered ad.
 *
 * @param campaignId The campaign being shown.
 * @param trackingToken The token the match returned. Without it the endpoint
 *   refuses, which is the point: the token is bound to this campaign and
 *   expires.
 */
export function useAdImpression(
  campaignId: string | undefined,
  trackingToken: string | undefined,
  context: TrackingContext = {},
): void {
  // One impression per rendered ad, not one per render. Without this, every
  // parent re-render and React StrictMode's double effect would each count.
  // The server claims the nonce as well, so this is the cheap half of a
  // guarantee that already exists.
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!campaignId || !trackingToken) return;
    const key = `${campaignId}:${trackingToken}`;
    if (reported.current === key) return;
    reported.current = key;

    post('/api/ads/impression', {
      campaignId,
      token: trackingToken,
      countryCode: context.countryCode,
      language: context.language ?? 'ar',
      deviceType: context.deviceType ?? detectDevice(),
    });
  }, [campaignId, trackingToken, context.countryCode, context.language, context.deviceType]);
}

/** Record a click on a rendered ad. */
export function reportAdClick(
  campaignId: string | undefined,
  trackingToken: string | undefined,
  context: TrackingContext = {},
): void {
  if (!campaignId || !trackingToken) return;
  post('/api/ads/click', {
    campaignId,
    token: trackingToken,
    countryCode: context.countryCode,
    language: context.language ?? 'ar',
    deviceType: context.deviceType ?? detectDevice(),
  });
}
