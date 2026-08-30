// News ticker and featured-property matching for the legacy /api/advertising
// surface. Ad campaign matching itself now lives entirely in lib/ads/engine.ts
// (the raw-SQL ad_campaigns system); the old drizzle-backed matchAds that read
// a second, incompatible ad_campaigns definition has been removed so the two
// schemas no longer collide.
import { adAnalytics, newsTickerItems, featuredProperties } from '@/lib/db/schemas/advertising-schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface MatchContext {
  page: string;
  placement?: string;
  country?: string;
  governorate?: string;
  city?: string;
  language?: string;
  userId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface GeoTargeting {
  pages?: string[];
  countries?: string[];
  governorates?: string[];
  cities?: string[];
}

interface AdEventContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  page?: string;
  placement?: string;
  country?: string;
  governorate?: string;
  city?: string;
}

export async function trackAdEvent(campaignId: string, creativeId: string | null, eventType: string, context: AdEventContext) {
  await db.insert(adAnalytics).values({
    campaignId,
    creativeId,
    eventType,
    userId: context.userId || null,
    sessionId: context.sessionId || null,
    ip: context.ip || null,
    page: context.page || null,
    placement: context.placement || null,
    country: context.country || null,
    governorate: context.governorate || null,
    city: context.city || null,
  });
}

export async function matchNewsTicker(context: MatchContext) {
  const items = await db.select().from(newsTickerItems).where(eq(newsTickerItems.isActive, true));
  return items.filter((item) => {
    const pageTargeting = (item.pageTargeting as GeoTargeting) || {};
    if (pageTargeting.pages && !pageTargeting.pages.includes(context.page)) return false;
    const geoTargeting = (item.geoTargeting as GeoTargeting) || {};
    if (geoTargeting.countries && context.country && !geoTargeting.countries.includes(context.country)) return false;
    if (geoTargeting.governorates && context.governorate && !geoTargeting.governorates.includes(context.governorate)) return false;
    if (geoTargeting.cities && context.city && !geoTargeting.cities.includes(context.city)) return false;
    return true;
  });
}

export async function matchFeaturedProperties(context: MatchContext) {
  const items = await db.select().from(featuredProperties).where(eq(featuredProperties.status, 'active'));
  return items.filter((item) => {
    const geoTargeting = (item.geoTargeting as GeoTargeting) || {};
    if (geoTargeting.countries && context.country && !geoTargeting.countries.includes(context.country)) return false;
    if (geoTargeting.governorates && context.governorate && !geoTargeting.governorates.includes(context.governorate)) return false;
    if (geoTargeting.cities && context.city && !geoTargeting.cities.includes(context.city)) return false;
    return true;
  });
}
