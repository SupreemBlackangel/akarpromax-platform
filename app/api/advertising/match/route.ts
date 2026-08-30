import { NextRequest, NextResponse } from 'next/server';
import { matchNewsTicker, matchFeaturedProperties, trackAdEvent } from '@/lib/advertising/core/matching.engine';
import { getRuntimeDb } from '@/lib/runtime-db';
import { buildContext } from '@/lib/ads/context';
import { matchAds } from '@/lib/ads/engine';
import type { AdMatchResult } from '@/lib/ads/types';
import { getSession } from '@/lib/auth/session';
import { STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS } from '@/src/config/standard-public-ad-registry';

// The legacy sidebar/hero/bottom components send a family key ("office-detail")
// plus a short slot name ("left_01"). The live engine keys ads on the canonical
// "<family-prefix>_<slot-suffix>" placement (e.g. web_office_detail_side_left_01),
// so map the short slot to its canonical suffix rather than upper-casing it —
// the previous "LEFT_01" form matched no registered placement, leaving these
// slots permanently empty.
const LEGACY_SLOT_SUFFIX: Record<string, string> = {
  hero: 'hero',
  left_01: 'side_left_01',
  left_02: 'side_left_02',
  right_01: 'side_right_01',
  right_02: 'side_right_02',
  bottom_01: 'bottom_01',
  bottom_02: 'bottom_02',
  bottom_03: 'bottom_03',
};

function canonicalLegacyPath(page: string): string {
  if (page === 'home' || page === '/') return '/';
  return page.startsWith('/') ? page : `/${page}`;
}

function canonicalLegacyPlacement(page: string, placement: string): string {
  const suffix = LEGACY_SLOT_SUFFIX[placement.toLowerCase()];
  const family = STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS[page as keyof typeof STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS];
  if (suffix && family) return `${family.prefix}_${suffix}`;
  return placement;
}

export function toLegacyAdvertisingResult(ad: AdMatchResult, language: string) {
  return {
    campaign: {
      id: ad.campaignId,
      name: ad.title,
      type: ad.campaignType,
      status: 'active',
      placement: ad.placement,
    },
    creatives: [{
      id: ad.creativeId,
      campaignId: ad.campaignId,
      language,
      title: ad.title,
      description: ad.description,
      cta: ad.cta,
      url: ad.targetUrl,
      imageUrl: ad.imageUrl,
      imageAlt: ad.title,
      videoUrl: ad.mediaType === 'video' ? ad.imageUrl : null,
      trackingToken: ad.trackingToken,
    }],
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await getSession().catch(() => null);
    const page = searchParams.get('page') || 'home';
    const placement = searchParams.get('placement') || 'hero';
    const language = searchParams.get('language') || 'ar';
    const latitude = Number(searchParams.get('latitude'));
    const longitude = Number(searchParams.get('longitude'));
    const context = {
      page,
      placement,
      country: searchParams.get('country') || undefined,
      governorate: searchParams.get('governorate') || undefined,
      city: searchParams.get('city') || undefined,
      district: searchParams.get('district') || undefined,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      language,
      userId: session?.userId,
      sessionId: request.cookies.get('session_id')?.value,
    };
    const canonicalContext = buildContext({
      path: canonicalLegacyPath(page),
      placement: canonicalLegacyPlacement(page, placement),
      language,
      countryCode: context.country,
      regionId: context.governorate,
      cityId: context.city,
      districtId: context.district,
      latitude: context.latitude,
      longitude: context.longitude,
      userId: context.userId,
      sessionId: context.sessionId,
    });
    const [canonicalAds, news, featured] = await Promise.all([
      getRuntimeDb()
        .then((runtimeDb) => matchAds(runtimeDb, canonicalContext, { count: 10 }))
        .catch(() => []),
      matchNewsTicker(context).catch(() => []),
      matchFeaturedProperties(context).catch(() => []),
    ]);
    const ads = canonicalAds.map((ad) => toLegacyAdvertisingResult(ad, language));
    return NextResponse.json({ success: true, data: { ads, news, featured } });
  } catch (error) {
    console.error('[Advertising match] Public match failed:', error);
    return NextResponse.json({ success: true, data: { ads: [], news: [], featured: [] } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await trackAdEvent(body.campaignId, body.creativeId || null, body.eventType, {
      userId: body.userId,
      sessionId: body.sessionId,
      ip: body.ip,
      page: body.page,
      placement: body.placement,
      country: body.country,
      governorate: body.governorate,
      city: body.city,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'فشل في تتبع الحدث' }, { status: 500 });
  }
}
