import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import {
  getServiceMarketplaceSettings,
  updateServiceMarketplaceSettings,
  type ServiceMarketplaceSettings,
} from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

const textValue = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : undefined;
const boolValue = (value: unknown) => typeof value === "boolean" ? value : undefined;
const limitValue = (value: unknown, max: number) => {
  if (value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(max, Math.round(number))) : undefined;
};

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "OM").slice(0, 8).toUpperCase();
  const settings = await getServiceMarketplaceSettings(country);
  return NextResponse.json({ settings }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=180" } });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  const country = (textValue(body.countryCode, 8) || "OM").toUpperCase();
  const patch: Partial<Omit<ServiceMarketplaceSettings, "countryCode">> = {
    heroKickerAr: textValue(body.heroKickerAr, 180),
    heroKickerEn: textValue(body.heroKickerEn, 180),
    heroTitleAr: textValue(body.heroTitleAr, 300),
    heroTitleEn: textValue(body.heroTitleEn, 300),
    heroDescriptionAr: textValue(body.heroDescriptionAr, 800),
    heroDescriptionEn: textValue(body.heroDescriptionEn, 800),
    primaryCtaAr: textValue(body.primaryCtaAr, 100),
    primaryCtaEn: textValue(body.primaryCtaEn, 100),
    primaryCtaHref: textValue(body.primaryCtaHref, 400),
    secondaryCtaAr: textValue(body.secondaryCtaAr, 100),
    secondaryCtaEn: textValue(body.secondaryCtaEn, 100),
    secondaryCtaHref: textValue(body.secondaryCtaHref, 400),
    announcementAr: textValue(body.announcementAr, 500),
    announcementEn: textValue(body.announcementEn, 500),
    showCategories: boolValue(body.showCategories),
    showFeaturedProviders: boolValue(body.showFeaturedProviders),
    showLatestRequests: boolValue(body.showLatestRequests),
    showHowItWorks: boolValue(body.showHowItWorks),
    showTrustBar: boolValue(body.showTrustBar),
    featuredCategoryLimit: limitValue(body.featuredCategoryLimit, 48),
    featuredProviderLimit: limitValue(body.featuredProviderLimit, 24),
    latestRequestLimit: limitValue(body.latestRequestLimit, 24),
    allowPublicRequests: boolValue(body.allowPublicRequests),
    allowProviderRegistration: boolValue(body.allowProviderRegistration),
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete patch[key as keyof typeof patch];
  }
  const settings = await updateServiceMarketplaceSettings(country, patch, {
    userId: identity.email,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  return NextResponse.json({ ok: true, settings });
}
