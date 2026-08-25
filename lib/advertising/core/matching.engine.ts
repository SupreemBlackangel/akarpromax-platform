import { adCampaigns, adCreatives, adAnalytics, newsTickerItems, featuredProperties } from '@/lib/db/schemas/advertising-schema';
import { db } from '@/lib/db';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

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

export async function matchAds(context: MatchContext, limit: number = 5) {
  const conditions = [eq(adCampaigns.status, 'active')];
  if (context.startDate) conditions.push(gte(adCampaigns.startDate, context.startDate));
  if (context.endDate) conditions.push(lte(adCampaigns.endDate, context.endDate));

  const campaigns = await db.select().from(adCampaigns).where(and(...conditions)).orderBy(adCampaigns.priority).limit(limit);

  const matchedCampaigns = campaigns.filter((campaign) => {
    const targeting = (campaign.targeting as GeoTargeting) || {};
    if (targeting.pages && !targeting.pages.includes(context.page)) return false;
    if (targeting.countries && context.country && !targeting.countries.includes(context.country)) return false;
    if (targeting.governorates && context.governorate && !targeting.governorates.includes(context.governorate)) return false;
    if (targeting.cities && context.city && !targeting.cities.includes(context.city)) return false;
    return true;
  });

  if (matchedCampaigns.length === 0) return [];

  const campaignIds = matchedCampaigns.map(c => c.id);
  const allCreatives = await db.select().from(adCreatives).where(inArray(adCreatives.campaignId, campaignIds));
  const creativesByCampaign = new Map<string, typeof allCreatives>();
  for (const creative of allCreatives) {
    if (!creative.campaignId) continue;
    const list = creativesByCampaign.get(creative.campaignId) || [];
    list.push(creative);
    creativesByCampaign.set(creative.campaignId, list);
  }

  const results = [];
  for (const campaign of matchedCampaigns) {
    const creatives = creativesByCampaign.get(campaign.id) || [];
    if (creatives.length > 0) results.push({ campaign, creatives });
  }
  return results;
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
