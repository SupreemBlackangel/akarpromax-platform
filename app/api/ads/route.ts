import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission, type SponsorIdentity } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const statuses = ["draft", "active", "paused", "expired", "archived"] as const;
const campaignTypes = ["platform", "sponsor", "property", "service"] as const;
const mediaTypes = ["image", "video"] as const;
const supportedLocales = ["ar", "en", "tr"] as const;
const supportedDevices = ["desktop", "mobile"] as const;

type AdRow = {
  id: string;
  internal_name: string;
  advertiser_name: string;
  campaign_type: string;
  status: string;
  media_type: string;
  media_url: string;
  mobile_media_url: string | null;
  poster_url: string | null;
  eyebrow_ar: string;
  eyebrow_en: string;
  eyebrow_tr: string;
  title_ar: string;
  title_en: string;
  title_tr: string;
  accent_ar: string;
  accent_en: string;
  accent_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  cta_ar: string;
  cta_en: string;
  cta_tr: string;
  target_url: string;
  countries: string;
  cities: string;
  languages: string;
  devices: string;
  priority: number;
  weight: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
  impressions?: number;
  clicks?: number;
};
type CreativeRow = { id: string; campaign_id: string; media_type: string; media_url: string; mobile_media_url: string | null; poster_url: string | null; position: number; duration_seconds: number; status: string };

const adSelect = `
  SELECT a.id, a.internal_name, a.advertiser_name, a.campaign_type, a.status,
         a.media_type, a.media_url, a.mobile_media_url, a.poster_url,
         a.eyebrow_ar, a.eyebrow_en, a.eyebrow_tr,
         a.title_ar, a.title_en, a.title_tr,
         a.accent_ar, a.accent_en, a.accent_tr,
         a.description_ar, a.description_en, a.description_tr,
         a.cta_ar, a.cta_en, a.cta_tr, a.target_url,
         a.countries, a.cities, a.languages, a.devices,
         a.priority, a.weight, a.start_at, a.end_at, a.created_at, a.updated_at,
         COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
         COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
  FROM ad_campaigns a
  LEFT JOIN ad_events e ON e.campaign_id = a.id
`;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown, required = false) {
  const candidate = clean(value, 800);
  if (!candidate) return required ? "" : null;
  if (candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : required ? "" : null;
  } catch {
    return required ? "" : null;
  }
}

function cleanChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = clean(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function cleanList(value: unknown, pattern: RegExp, maxItems = 80) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => clean(item, 100).toLowerCase()).filter((item) => pattern.test(item)))].slice(0, maxItems);
}

function parseList(value: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function serialise(row: AdRow) {
  return {
    id: row.id,
    internalName: row.internal_name,
    advertiserName: row.advertiser_name,
    campaignType: row.campaign_type,
    status: row.status,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    mobileMediaUrl: row.mobile_media_url,
    posterUrl: row.poster_url,
    eyebrowAr: row.eyebrow_ar,
    eyebrowEn: row.eyebrow_en,
    eyebrowTr: row.eyebrow_tr,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    titleTr: row.title_tr,
    accentAr: row.accent_ar,
    accentEn: row.accent_en,
    accentTr: row.accent_tr,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    descriptionTr: row.description_tr,
    ctaAr: row.cta_ar,
    ctaEn: row.cta_en,
    ctaTr: row.cta_tr,
    targetUrl: row.target_url,
    countries: parseList(row.countries),
    cities: parseList(row.cities),
    languages: parseList(row.languages, ["ar", "en", "tr"]),
    devices: parseList(row.devices, ["desktop", "mobile"]),
    priority: Number(row.priority),
    weight: Number(row.weight),
    startAt: row.start_at,
    endAt: row.end_at,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachCreatives(db: D1Database, campaigns: ReturnType<typeof serialise>[]) {
  if (!campaigns.length) return campaigns;
  const ids = campaigns.map((campaign) => campaign.id);
  const placeholders = ids.map((_, index) => `?${index + 1}`).join(",");
  const rows = await db.prepare(`SELECT id, campaign_id, media_type, media_url, mobile_media_url, poster_url, position, duration_seconds, status FROM ad_creatives WHERE campaign_id IN (${placeholders}) ORDER BY position ASC`).bind(...ids).all<CreativeRow>();
  const grouped = new Map<string, CreativeRow[]>();
  rows.results.forEach((row) => grouped.set(row.campaign_id, [...(grouped.get(row.campaign_id) || []), row]));
  return campaigns.map((campaign) => ({ ...campaign, creatives: (grouped.get(campaign.id) || []).filter((creative) => creative.status === "active").map((creative) => ({ id: creative.id, mediaType: creative.media_type, mediaUrl: creative.media_url, mobileMediaUrl: creative.mobile_media_url, posterUrl: creative.poster_url, position: Number(creative.position), durationSeconds: Number(creative.duration_seconds) })) }));
}

function canManageTargets(identity: SponsorIdentity, countries: string[]) {
  if (identity.role === "super_admin" || identity.role === "ad_manager") return true;
  if (!identity.countryCode) return false;
  return countries.length === 1 && countries[0] === identity.countryCode.toLowerCase();
}

function campaignVisibleToCountry(identity: SponsorIdentity, campaign: ReturnType<typeof serialise>) {
  if (identity.role === "super_admin" || identity.role === "ad_manager") return true;
  const country = identity.countryCode?.toLowerCase();
  return Boolean(country && campaign.countries.includes(country));
}

function normalisePayload(body: Record<string, unknown>, identity: SponsorIdentity) {
  let countries = cleanList(body.countries, /^[a-z]{2}$/, 30);
  if (identity.countryCode && identity.role !== "super_admin" && identity.role !== "ad_manager") {
    countries = [identity.countryCode.toLowerCase()];
  }
  const creatives = Array.isArray(body.creatives) ? body.creatives.slice(0, 20).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const creative = item as Record<string, unknown>;
    const mediaUrl = cleanUrl(creative.mediaUrl, true);
    const mediaType = cleanChoice(creative.mediaType, mediaTypes, "image");
    return mediaUrl ? [{ id: clean(creative.id, 80) || crypto.randomUUID(), mediaUrl, mediaType, mobileMediaUrl: cleanUrl(creative.mobileMediaUrl), posterUrl: cleanUrl(creative.posterUrl), position: index + 1, durationSeconds: Math.max(3, Math.min(15, Number(creative.durationSeconds) || 6)) }] : [];
  }) : [];
  return {
    internalName: clean(body.internalName, 140),
    advertiserName: clean(body.advertiserName, 140),
    campaignType: cleanChoice(body.campaignType, campaignTypes, "platform"),
    status: cleanChoice(body.status, statuses, "draft"),
    mediaType: cleanChoice(body.mediaType, mediaTypes, "image"),
    mediaUrl: cleanUrl(body.mediaUrl, true) || "",
    mobileMediaUrl: cleanUrl(body.mobileMediaUrl),
    posterUrl: cleanUrl(body.posterUrl),
    eyebrowAr: clean(body.eyebrowAr, 100),
    eyebrowEn: clean(body.eyebrowEn, 100),
    eyebrowTr: clean(body.eyebrowTr, 100),
    titleAr: clean(body.titleAr, 180),
    titleEn: clean(body.titleEn, 180),
    titleTr: clean(body.titleTr, 180),
    accentAr: clean(body.accentAr, 180),
    accentEn: clean(body.accentEn, 180),
    accentTr: clean(body.accentTr, 180),
    descriptionAr: clean(body.descriptionAr, 320),
    descriptionEn: clean(body.descriptionEn, 320),
    descriptionTr: clean(body.descriptionTr, 320),
    ctaAr: clean(body.ctaAr, 70),
    ctaEn: clean(body.ctaEn, 70),
    ctaTr: clean(body.ctaTr, 70),
    targetUrl: cleanUrl(body.targetUrl, true) || "",
    countries,
    cities: cleanList(body.cities, /^[a-z0-9-]{2,100}$/, 120),
    languages: cleanList(body.languages, /^(?:ar|en|tr)$/, 3),
    devices: cleanList(body.devices, /^(?:desktop|mobile)$/, 2),
    priority: Math.max(1, Math.min(999, Number(body.priority) || 100)),
    weight: Math.max(1, Math.min(100, Number(body.weight) || 100)),
    startAt: clean(body.startAt, 40) || null,
    endAt: clean(body.endAt, 40) || null,
    creatives,
  };
}

function validatePayload(payload: ReturnType<typeof normalisePayload>) {
  return Boolean(
    payload.internalName &&
    payload.advertiserName &&
    payload.mediaUrl &&
    payload.eyebrowAr && payload.eyebrowEn && payload.eyebrowTr &&
    payload.titleAr && payload.titleEn && payload.titleTr &&
    payload.accentAr && payload.accentEn && payload.accentTr &&
    payload.descriptionAr && payload.descriptionEn && payload.descriptionTr &&
    payload.ctaAr && payload.ctaEn && payload.ctaTr &&
    payload.targetUrl &&
    payload.languages.length &&
    payload.devices.length
  );
}

async function writeAudit(db: D1Database, actor: string | null, action: string, campaignId: string, metadata: object) {
  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, ?3, 'ad_campaign', ?4, ?5)`,
  ).bind(crypto.randomUUID(), actor, action, campaignId, JSON.stringify(metadata)).run();
}

export async function GET(request: NextRequest) {
  const adminMode = request.nextUrl.searchParams.get("admin") === "1";
  const db = await getRuntimeDb();

  if (adminMode) {
    const identity = await getSponsorIdentity();
    if (!hasSponsorPermission(identity, PERMISSIONS.ADS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await db.prepare(
      `${adSelect}
       GROUP BY a.id
       ORDER BY CASE a.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
                a.priority ASC, a.updated_at DESC`,
    ).all<AdRow>();
    const campaigns = await attachCreatives(db, rows.results.map(serialise).filter((campaign) => campaignVisibleToCountry(identity, campaign)));
    return NextResponse.json({ identity, campaigns }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const country = clean(request.nextUrl.searchParams.get("country"), 2).toLowerCase() || "om";
  const city = clean(request.nextUrl.searchParams.get("city"), 100).toLowerCase();
  const locale = cleanChoice(request.nextUrl.searchParams.get("locale"), supportedLocales, "ar");
  const device = cleanChoice(request.nextUrl.searchParams.get("device"), supportedDevices, "desktop");
  try {
    const rows = await db.prepare(
      `${adSelect}
       WHERE a.status = 'active'
         AND (a.start_at IS NULL OR datetime(a.start_at) <= datetime('now'))
         AND (a.end_at IS NULL OR datetime(a.end_at) >= datetime('now'))
       GROUP BY a.id
       ORDER BY a.priority ASC, a.weight DESC, a.updated_at DESC
       LIMIT 60`,
    ).all<AdRow>();
    const campaigns = await attachCreatives(db, rows.results
      .map(serialise)
      .filter((campaign) =>
        (!campaign.countries.length || campaign.countries.includes(country)) &&
        (!campaign.cities.length || campaign.cities.includes(city)) &&
        campaign.languages.includes(locale) &&
        campaign.devices.includes(device)
      )
      .slice(0, 8));
    return NextResponse.json({ campaigns }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" } });
  } catch {
    return NextResponse.json({ campaigns: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const payload = normalisePayload(body, identity);
  if (!validatePayload(payload) || !canManageTargets(identity, payload.countries)) {
    return NextResponse.json({ error: "Invalid campaign data or targeting scope" }, { status: 400 });
  }
  if (payload.status === "active" && !hasSponsorPermission(identity, PERMISSIONS.ADS_PUBLISH)) {
    payload.status = "draft";
  }
  const id = crypto.randomUUID();
  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO ad_campaigns
      (id, internal_name, advertiser_name, campaign_type, status, media_type,
       media_url, mobile_media_url, poster_url,
       eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr,
       accent_ar, accent_en, accent_tr, description_ar, description_en, description_tr,
       cta_ar, cta_en, cta_tr, target_url, countries, cities, languages, devices,
       priority, weight, start_at, end_at, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
             ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28,
             ?29, ?30, ?31, ?32, ?33, ?34)`,
  ).bind(
    id, payload.internalName, payload.advertiserName, payload.campaignType, payload.status,
    payload.mediaType, payload.mediaUrl, payload.mobileMediaUrl, payload.posterUrl,
    payload.eyebrowAr, payload.eyebrowEn, payload.eyebrowTr,
    payload.titleAr, payload.titleEn, payload.titleTr,
    payload.accentAr, payload.accentEn, payload.accentTr,
    payload.descriptionAr, payload.descriptionEn, payload.descriptionTr,
    payload.ctaAr, payload.ctaEn, payload.ctaTr, payload.targetUrl,
    JSON.stringify(payload.countries), JSON.stringify(payload.cities),
    JSON.stringify(payload.languages), JSON.stringify(payload.devices),
    payload.priority, payload.weight, payload.startAt, payload.endAt, identity.email,
  ).run();
  if (payload.creatives.length) await db.batch(payload.creatives.map((creative) => db.prepare(`INSERT INTO ad_creatives (id, campaign_id, media_type, media_url, mobile_media_url, poster_url, position, duration_seconds) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`).bind(creative.id, id, creative.mediaType, creative.mediaUrl, creative.mobileMediaUrl, creative.posterUrl, creative.position, creative.durationSeconds)));
  await writeAudit(db, identity.email, "ad.created", id, { status: payload.status, countries: payload.countries });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const id = clean(body.id, 80);
  const payload = normalisePayload(body, identity);
  if (!id || !validatePayload(payload) || !canManageTargets(identity, payload.countries)) {
    return NextResponse.json({ error: "Invalid campaign data or targeting scope" }, { status: 400 });
  }
  if (payload.status === "active" && !hasSponsorPermission(identity, PERMISSIONS.ADS_PUBLISH)) {
    return NextResponse.json({ error: "Publishing permission required" }, { status: 403 });
  }
  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries FROM ad_campaigns WHERE id = ?1 LIMIT 1")
    .bind(id).first<{ id: string; countries: string }>();
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const existingCountries = parseList(existing.countries);
  if (!canManageTargets(identity, existingCountries) && identity.role !== "super_admin" && identity.role !== "ad_manager") {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  await db.prepare(
    `UPDATE ad_campaigns SET
       internal_name = ?2, advertiser_name = ?3, campaign_type = ?4, status = ?5,
       media_type = ?6, media_url = ?7, mobile_media_url = ?8, poster_url = ?9,
       eyebrow_ar = ?10, eyebrow_en = ?11, eyebrow_tr = ?12,
       title_ar = ?13, title_en = ?14, title_tr = ?15,
       accent_ar = ?16, accent_en = ?17, accent_tr = ?18,
       description_ar = ?19, description_en = ?20, description_tr = ?21,
       cta_ar = ?22, cta_en = ?23, cta_tr = ?24, target_url = ?25,
       countries = ?26, cities = ?27, languages = ?28, devices = ?29,
       priority = ?30, weight = ?31, start_at = ?32, end_at = ?33,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`,
  ).bind(
    id, payload.internalName, payload.advertiserName, payload.campaignType, payload.status,
    payload.mediaType, payload.mediaUrl, payload.mobileMediaUrl, payload.posterUrl,
    payload.eyebrowAr, payload.eyebrowEn, payload.eyebrowTr,
    payload.titleAr, payload.titleEn, payload.titleTr,
    payload.accentAr, payload.accentEn, payload.accentTr,
    payload.descriptionAr, payload.descriptionEn, payload.descriptionTr,
    payload.ctaAr, payload.ctaEn, payload.ctaTr, payload.targetUrl,
    JSON.stringify(payload.countries), JSON.stringify(payload.cities),
    JSON.stringify(payload.languages), JSON.stringify(payload.devices),
    payload.priority, payload.weight, payload.startAt, payload.endAt,
  ).run();
  await db.prepare("DELETE FROM ad_creatives WHERE campaign_id = ?1").bind(id).run();
  if (payload.creatives.length) await db.batch(payload.creatives.map((creative) => db.prepare(`INSERT INTO ad_creatives (id, campaign_id, media_type, media_url, mobile_media_url, poster_url, position, duration_seconds) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`).bind(creative.id, id, creative.mediaType, creative.mediaUrl, creative.mobileMediaUrl, creative.posterUrl, creative.position, creative.durationSeconds)));
  await writeAudit(db, identity.email, "ad.updated", id, { status: payload.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.ADS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = clean(request.nextUrl.searchParams.get("id"), 80);
  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id, countries FROM ad_campaigns WHERE id = ?1 LIMIT 1")
    .bind(id).first<{ id: string; countries: string }>();
  if (!existing || !canManageTargets(identity, parseList(existing.countries))) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  await db.prepare("UPDATE ad_campaigns SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?1").bind(id).run();
  await writeAudit(db, identity.email, "ad.archived", id, {});
  return NextResponse.json({ ok: true });
}
