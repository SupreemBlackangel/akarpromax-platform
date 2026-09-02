import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { ensureAdSchema } from "@/lib/ad-schema";
import {
  normaliseCampaignPayload,
  validateCampaignPayload,
  canManageTargets,
  resolveApprovalStatus,
  ADMIN_CAMPAIGN_SELECT,
  serialiseCampaign,
  type AdminRow,
} from "@/lib/ads/admin";

export const dynamic = "force-dynamic";

type CreativeRow = {
  id: string;
  campaign_id: string;
  media_type: string;
  media_url: string;
  mobile_media_url: string | null;
  tablet_media_url: string | null;
  poster_url: string | null;
  position: number;
  duration_seconds: number;
  status: string;
  alt_text_ar: string | null;
  alt_text_en: string | null;
  alt_text_tr: string | null;
  media_width: number | null;
  media_height: number | null;
};

function parseList(value: string | null | undefined, fallback: string[] = []): string[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

async function writeAudit(db: D1Database, actor: string | null, action: string, campaignId: string, metadata: object) {
  try {
    await db.prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?1, ?2, ?3, 'ad_campaign', ?4, ?5)`,
    ).bind(crypto.randomUUID(), actor, action, campaignId, JSON.stringify(metadata)).run();
  } catch {
    // audit best-effort
  }
}

function visibleTo(identity: { role: string; countryCode: string | null }, countries: string[]): boolean {
  if (identity.role === "super_admin" || identity.role === "ad_manager") return true;
  const country = identity.countryCode?.toLowerCase();
  return Boolean(country && countries.includes(country));
}

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ?view=archived lists the soft-deleted campaigns for review/restore.
  const archived = request.nextUrl.searchParams.get("view") === "archived";
  const db = await getRuntimeDb();
  const rows = await db
    .prepare(
      `${ADMIN_CAMPAIGN_SELECT}
       WHERE a.deleted_at IS ${archived ? "NOT NULL" : "NULL"}
       ORDER BY CASE a.status WHEN 'active' THEN 0 WHEN 'pending' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
                a.priority ASC, a.updated_at DESC
       LIMIT 300`,
    )
    .all<AdminRow>();
  const campaigns = rows.results.map(serialiseCampaign).filter((campaign) => visibleTo(identity, campaign.countries));
  let listed = campaigns;
  if (campaigns.length) {
    const ids = campaigns.map((campaign) => campaign.id);
    const placeholders = ids.map((_, index) => `?${index + 1}`).join(",");
    const creativeRows = await db
      .prepare(`SELECT id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, poster_url, position, duration_seconds, status, alt_text_ar, alt_text_en, alt_text_tr, media_width, media_height FROM ad_creatives WHERE campaign_id IN (${placeholders}) ORDER BY position ASC`)
      .bind(...ids)
      .all<CreativeRow>();
    const grouped = new Map<string, CreativeRow[]>();
    for (const row of creativeRows.results) grouped.set(row.campaign_id, [...(grouped.get(row.campaign_id) ?? []), row]);
    listed = campaigns.map((campaign) => ({
      ...campaign,
      creatives: (grouped.get(campaign.id) ?? []).filter((row) => row.status === "active").map((row) => ({
        id: row.id,
        mediaType: row.media_type,
        mediaUrl: row.media_url,
        mobileMediaUrl: row.mobile_media_url,
        tabletMediaUrl: row.tablet_media_url,
        posterUrl: row.poster_url,
        altTextAr: row.alt_text_ar ?? null,
        altTextEn: row.alt_text_en ?? null,
        altTextTr: row.alt_text_tr ?? null,
        mediaWidth: row.media_width != null ? Number(row.media_width) : null,
        mediaHeight: row.media_height != null ? Number(row.media_height) : null,
        position: Number(row.position),
        durationSeconds: Number(row.duration_seconds),
        status: row.status,
      })),
    }));
  }
  return NextResponse.json({ identity, campaigns: listed }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const payload = normaliseCampaignPayload(body);
  if (!validateCampaignPayload(payload) || !canManageTargets(identity, payload.countries)) {
    return NextResponse.json({ error: "Invalid campaign data or targeting scope" }, { status: 400 });
  }
  let status = payload.status;
  if (status === "active" && !hasSponsorPermission(identity, PERMISSIONS.ADS_PUBLISH)) {
    status = "draft";
  }
  const approvalStatus = resolveApprovalStatus(body, identity);
  const approvedBy = approvalStatus === "approved" && hasSponsorPermission(identity, PERMISSIONS.ADS_APPROVE) ? identity.email : null;

  const db = await getRuntimeDb();
  await ensureAdSchema(db);
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO ad_campaigns
        (id, internal_name, advertiser_name, campaign_type, status, media_type,
         media_url, mobile_media_url, tablet_media_url, poster_url, channels,
         eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr,
         accent_ar, accent_en, accent_tr, description_ar, description_en, description_tr,
         cta_ar, cta_en, cta_tr, target_url, countries, cities, languages, devices,
         priority, weight, start_at, end_at,
         section_scopes, page_types, placements, domains, region_ids, district_ids,
         latitude, longitude, radius_km,
         target_all_countries, target_all_regions, target_all_cities, target_all_districts,
         entity_type, entity_ids, category_ids,
         property_types, service_categories, office_types, tool_categories,
         operating_systems, daily_start_time, daily_end_time, days_of_week, rotation_group,
         pricing_model, price, budget, daily_budget,
         max_impressions, max_clicks, frequency_cap_per_user, frequency_cap_period,
         approval_status, is_active, is_sponsored, is_featured, is_fallback, is_global,
         approved_by, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
               ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30,
               ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40,
               ?41, ?42, ?43, ?44, ?45, ?46, ?47, ?48, ?49, ?50,
               ?51, ?52, ?53, ?54, ?55, ?56, ?57, ?58, ?59, ?60,
               ?61, ?62, ?63, ?64, ?65, ?66, ?67, ?68, ?69, ?70, ?71, ?72, ?73, ?74, ?75, ?76)`,
    )
    .bind(
      id, payload.internalName, payload.advertiserName, payload.campaignType, status,
      payload.mediaType, payload.mediaUrl, payload.mobileMediaUrl, payload.tabletMediaUrl, payload.posterUrl,
      JSON.stringify(payload.channels),
      payload.eyebrowAr, payload.eyebrowEn, payload.eyebrowTr,
      payload.titleAr, payload.titleEn, payload.titleTr,
      payload.accentAr, payload.accentEn, payload.accentTr,
      payload.descriptionAr, payload.descriptionEn, payload.descriptionTr,
      payload.ctaAr, payload.ctaEn, payload.ctaTr, payload.targetUrl,
      JSON.stringify(payload.countries), JSON.stringify(payload.cities),
      JSON.stringify(payload.languages), JSON.stringify(payload.devices),
      payload.priority, payload.weight, payload.startAt, payload.endAt,
      JSON.stringify(payload.sectionScopes), JSON.stringify(payload.pageTypes), JSON.stringify(payload.placements),
      JSON.stringify(payload.domains),
      JSON.stringify(payload.regionIds), JSON.stringify(payload.districtIds),
      payload.latitude, payload.longitude, payload.radiusKm,
      payload.targetAllCountries ? 1 : 0, payload.targetAllRegions ? 1 : 0, payload.targetAllCities ? 1 : 0, payload.targetAllDistricts ? 1 : 0,
      payload.entityType, JSON.stringify(payload.entityIds), JSON.stringify(payload.categoryIds),
      JSON.stringify(payload.propertyTypes), JSON.stringify(payload.serviceCategories),
      JSON.stringify(payload.officeTypes), JSON.stringify(payload.toolCategories),
      JSON.stringify(payload.operatingSystems),
      payload.dailyStartTime, payload.dailyEndTime, JSON.stringify(payload.daysOfWeek), payload.rotationGroup,
      payload.pricingModel, payload.price, payload.budget, payload.dailyBudget,
      payload.maxImpressions, payload.maxClicks, payload.frequencyCapPerUser, payload.frequencyCapPeriod,
      approvalStatus, payload.isActive ? 1 : 0,
      0, payload.isFeatured ? 1 : 0, 0, payload.isGlobal ? 1 : 0,
      approvedBy, identity.email,
    )
    .run();
  if (payload.creatives.length) {
    await db.batch(payload.creatives.map((creative) => db.prepare(
      `INSERT INTO ad_creatives (id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, poster_url, position, duration_seconds, status, alt_text_ar, alt_text_en, alt_text_tr, media_width, media_height)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    ).bind(creative.id, id, creative.mediaType, creative.mediaUrl, creative.mobileMediaUrl, creative.tabletMediaUrl, creative.posterUrl, creative.position, creative.durationSeconds, creative.status, creative.altText.ar, creative.altText.en, creative.altText.tr, creative.mediaWidth, creative.mediaHeight)));
  }
  await writeAudit(db, identity.email, "ad.created", id, { status, approvalStatus, countries: payload.countries, creatives: payload.creatives.length });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const payload = normaliseCampaignPayload(body);
  if (!id || !validateCampaignPayload(payload) || !canManageTargets(identity, payload.countries)) {
    return NextResponse.json({ error: "Invalid campaign data or targeting scope" }, { status: 400 });
  }
  let status = payload.status;
  if (status === "active" && !hasSponsorPermission(identity, PERMISSIONS.ADS_PUBLISH)) {
    status = "draft";
  }
  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries, approval_status FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NULL LIMIT 1")
    .bind(id).first<{ id: string; countries: string; approval_status: string }>();
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const existingCountries = parseList(existing.countries);
  if (!canManageTargets(identity, existingCountries) && identity.role !== "super_admin" && identity.role !== "ad_manager") {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const canApprove = hasSponsorPermission(identity, PERMISSIONS.ADS_APPROVE);
  const approvalStatus = canApprove && typeof body.approvalStatus === "string" ? body.approvalStatus : existing.approval_status;
  const approvedBy = canApprove && approvalStatus !== existing.approval_status && approvalStatus === "approved" ? identity.email : undefined;

  const sets: string[] = [
    "internal_name = ?", "advertiser_name = ?", "campaign_type = ?", "status = ?",
    "media_type = ?", "media_url = ?", "mobile_media_url = ?", "tablet_media_url = ?", "poster_url = ?", "channels = ?",
    "eyebrow_ar = ?", "eyebrow_en = ?", "eyebrow_tr = ?",
    "title_ar = ?", "title_en = ?", "title_tr = ?",
    "accent_ar = ?", "accent_en = ?", "accent_tr = ?",
    "description_ar = ?", "description_en = ?", "description_tr = ?",
    "cta_ar = ?", "cta_en = ?", "cta_tr = ?", "target_url = ?",
    "countries = ?", "cities = ?", "languages = ?", "devices = ?",
    "priority = ?", "weight = ?", "start_at = ?", "end_at = ?",
    "section_scopes = ?", "page_types = ?", "placements = ?", "domains = ?", "region_ids = ?", "district_ids = ?",
    "latitude = ?", "longitude = ?", "radius_km = ?",
    "target_all_countries = ?", "target_all_regions = ?", "target_all_cities = ?", "target_all_districts = ?",
    "entity_type = ?", "entity_ids = ?", "category_ids = ?",
    "property_types = ?", "service_categories = ?", "office_types = ?", "tool_categories = ?",
    "operating_systems = ?", "daily_start_time = ?", "daily_end_time = ?", "days_of_week = ?", "rotation_group = ?",
    "pricing_model = ?", "price = ?", "budget = ?", "daily_budget = ?",
    "max_impressions = ?", "max_clicks = ?", "frequency_cap_per_user = ?", "frequency_cap_period = ?",
    "approval_status = ?",
    "is_active = ?", "is_sponsored = ?", "is_featured = ?", "is_fallback = ?", "is_global = ?",
    "updated_at = CURRENT_TIMESTAMP",
  ];
  const values: unknown[] = [
    payload.internalName, payload.advertiserName, payload.campaignType, status,
    payload.mediaType, payload.mediaUrl, payload.mobileMediaUrl, payload.tabletMediaUrl, payload.posterUrl,
    JSON.stringify(payload.channels),
    payload.eyebrowAr, payload.eyebrowEn, payload.eyebrowTr,
    payload.titleAr, payload.titleEn, payload.titleTr,
    payload.accentAr, payload.accentEn, payload.accentTr,
    payload.descriptionAr, payload.descriptionEn, payload.descriptionTr,
    payload.ctaAr, payload.ctaEn, payload.ctaTr, payload.targetUrl,
    JSON.stringify(payload.countries), JSON.stringify(payload.cities),
    JSON.stringify(payload.languages), JSON.stringify(payload.devices),
    payload.priority, payload.weight, payload.startAt, payload.endAt,
    JSON.stringify(payload.sectionScopes), JSON.stringify(payload.pageTypes), JSON.stringify(payload.placements),
    JSON.stringify(payload.domains),
    JSON.stringify(payload.regionIds), JSON.stringify(payload.districtIds),
    payload.latitude, payload.longitude, payload.radiusKm,
    payload.targetAllCountries ? 1 : 0, payload.targetAllRegions ? 1 : 0, payload.targetAllCities ? 1 : 0, payload.targetAllDistricts ? 1 : 0,
    payload.entityType, JSON.stringify(payload.entityIds), JSON.stringify(payload.categoryIds),
    JSON.stringify(payload.propertyTypes), JSON.stringify(payload.serviceCategories),
    JSON.stringify(payload.officeTypes), JSON.stringify(payload.toolCategories),
    JSON.stringify(payload.operatingSystems),
    payload.dailyStartTime, payload.dailyEndTime, JSON.stringify(payload.daysOfWeek), payload.rotationGroup,
    payload.pricingModel, payload.price, payload.budget, payload.dailyBudget,
    payload.maxImpressions, payload.maxClicks, payload.frequencyCapPerUser, payload.frequencyCapPeriod,
    approvalStatus,
    payload.isActive ? 1 : 0,
    0, payload.isFeatured ? 1 : 0, 0, payload.isGlobal ? 1 : 0,
  ];

  if (approvedBy !== undefined) {
    sets.splice(sets.length - 1, 0, "approved_by = ?");
    values.splice(values.length, 0, approvedBy);
  }

  await db
    .prepare(`UPDATE ad_campaigns SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values, id)
    .run();
  if (Array.isArray(body.creatives)) {
    // Reconcile rather than delete-all + insert-all. The old approach re-created
    // every row on each save: any creative the client sent without its id got a
    // fresh UUID (orphaning its impression/click history), and rows lost every
    // column the client does not round-trip - alt text, dimensions, created_at.
    // Now: kept creatives are UPDATEd in place (COALESCE keeps stored alt text
    // and dimensions when the payload has none), new ones INSERTed, and only
    // the ones the admin actually removed are DELETEd.
    const existing = await db
      .prepare("SELECT id FROM ad_creatives WHERE campaign_id = ?1")
      .bind(id)
      .all<{ id: string }>();
    const existingIds = new Set(existing.results.map((row) => row.id));
    const keptIds = new Set(payload.creatives.map((creative) => creative.id));
    const statements = payload.creatives.map((creative) =>
      existingIds.has(creative.id)
        ? db.prepare(
            `UPDATE ad_creatives SET
               media_type = ?1, media_url = ?2, mobile_media_url = ?3, tablet_media_url = ?4,
               poster_url = ?5, position = ?6, duration_seconds = ?7, status = ?8,
               alt_text_ar = COALESCE(?9, alt_text_ar),
               alt_text_en = COALESCE(?10, alt_text_en),
               alt_text_tr = COALESCE(?11, alt_text_tr),
               media_width = COALESCE(?12, media_width),
               media_height = COALESCE(?13, media_height)
             WHERE id = ?14 AND campaign_id = ?15`,
          ).bind(creative.mediaType, creative.mediaUrl, creative.mobileMediaUrl, creative.tabletMediaUrl, creative.posterUrl, creative.position, creative.durationSeconds, creative.status, creative.altText.ar, creative.altText.en, creative.altText.tr, creative.mediaWidth, creative.mediaHeight, creative.id, id)
        : db.prepare(
            `INSERT INTO ad_creatives (id, campaign_id, media_type, media_url, mobile_media_url, tablet_media_url, poster_url, position, duration_seconds, status, alt_text_ar, alt_text_en, alt_text_tr, media_width, media_height)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
          ).bind(creative.id, id, creative.mediaType, creative.mediaUrl, creative.mobileMediaUrl, creative.tabletMediaUrl, creative.posterUrl, creative.position, creative.durationSeconds, creative.status, creative.altText.ar, creative.altText.en, creative.altText.tr, creative.mediaWidth, creative.mediaHeight),
    );
    const removed = [...existingIds].filter((existingId) => !keptIds.has(existingId));
    for (const removedId of removed) {
      statements.push(db.prepare("DELETE FROM ad_creatives WHERE id = ?1 AND campaign_id = ?2").bind(removedId, id));
    }
    if (statements.length) await db.batch(statements);
  }
  await writeAudit(db, identity.email, "ad.updated", id, { status, approvalStatus, creatives: Array.isArray(body.creatives) ? payload.creatives.length : undefined });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries FROM ad_campaigns WHERE id = ?1 AND deleted_at IS NULL LIMIT 1")
    .bind(id).first<{ id: string; countries: string }>();
  if (!existing || !canManageTargets(identity, parseList(existing.countries))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  const hard = request.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    // Permanent removal: the campaign, its creatives and its tracking rows are
    // gone for good. Archive (the default) stays the reversible path.
    await db.prepare("DELETE FROM ad_creatives WHERE campaign_id = ?1").bind(id).run();
    for (const table of ["ad_impressions", "ad_clicks", "ad_conversions", "ad_daily_statistics"]) {
      try { await db.prepare(`DELETE FROM ${table} WHERE campaign_id = ?1`).bind(id).run(); } catch { /* table optional */ }
    }
    await db.prepare("DELETE FROM ad_campaigns WHERE id = ?1").bind(id).run();
    await writeAudit(db, identity.email, "ad.deleted", id, { hard: true });
    return NextResponse.json({ ok: true, hard: true });
  }
  await db
    .prepare("UPDATE ad_campaigns SET status = 'archived', deleted_at = CURRENT_TIMESTAMP, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1")
    .bind(id)
    .run();
  await writeAudit(db, identity.email, "ad.deleted", id, {});
  return NextResponse.json({ ok: true });
}
