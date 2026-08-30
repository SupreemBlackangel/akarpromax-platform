import { getIntegrationDb } from "@/lib/integration/db";
import { OFFICE_AD_PLACEMENTS, type OfficeAdPlacement } from "@/lib/integration/constants";

export type OfficeAdFilter = {
  countryCode: string;
  placement: OfficeAdPlacement;
  limit?: number;
  device?: "desktop" | "mobile" | "tablet";
};

export type OfficeAd = {
  id: string;
  placement: string;
  mediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  eyebrowAr: string;
  eyebrowEn: string;
  eyebrowTr: string;
  accentAr: string;
  accentEn: string;
  accentTr: string;
  descriptionAr: string;
  descriptionEn: string;
  descriptionTr: string;
  ctaAr: string;
  ctaEn: string;
  ctaTr: string;
  targetUrl: string;
};

export async function listOfficeAds(input: OfficeAdFilter): Promise<OfficeAd[]> {
  const db = await getIntegrationDb();
  const country = String(input.countryCode).toUpperCase();
  const device = input.device ?? "desktop";

  const rows = await db
    .prepare(
      `SELECT id, media_url, mobile_media_url, poster_url,
              title_ar, title_en, title_tr,
              eyebrow_ar, eyebrow_en, eyebrow_tr,
              accent_ar, accent_en, accent_tr,
              description_ar, description_en, description_tr,
              cta_ar, cta_en, cta_tr, target_url
       FROM ad_campaigns
       WHERE status = 'active'
         AND is_active = 1
         AND approval_status = 'approved'
         AND deleted_at IS NULL
         AND (is_global = 1 OR lower(countries) LIKE ?1)
         AND (start_at IS NULL OR date(start_at) <= date('now'))
         AND (end_at IS NULL OR date(end_at) >= date('now'))
         AND (office_types IS NULL OR office_types = '' OR lower(office_types) LIKE ?2)
       ORDER BY is_fallback ASC, priority ASC, weight DESC
       LIMIT ?3`,
    )
    .bind(`%"${country.toLowerCase()}"%`, `%"${country.toLowerCase()}"%`, input.limit ?? 5)
    .all<Record<string, unknown>>();

  const placements = JSON.stringify(OFFICE_AD_PLACEMENTS);
  void placements;

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    placement: input.placement,
    mediaUrl: String(row.media_url),
    mobileMediaUrl: row.mobile_media_url ? String(row.mobile_media_url) : null,
    posterUrl: row.poster_url ? String(row.poster_url) : null,
    titleAr: String(row.title_ar),
    titleEn: String(row.title_en),
    titleTr: String(row.title_tr),
    eyebrowAr: String(row.eyebrow_ar),
    eyebrowEn: String(row.eyebrow_en),
    eyebrowTr: String(row.eyebrow_tr),
    accentAr: String(row.accent_ar),
    accentEn: String(row.accent_en),
    accentTr: String(row.accent_tr),
    descriptionAr: String(row.description_ar),
    descriptionEn: String(row.description_en),
    descriptionTr: String(row.description_tr),
    ctaAr: String(row.cta_ar),
    ctaEn: String(row.cta_en),
    ctaTr: String(row.cta_tr),
    targetUrl: String(row.target_url),
  }));
}

export async function recordAdEvent(input: {
  campaignId: string;
  eventType: "impression" | "click";
  countryCode: string;
  device: string;
  placement: string;
  officeDeviceId?: string;
  dedupKey?: string;
}): Promise<{ recorded: boolean }> {
  const db = await getIntegrationDb();
  if (input.eventType === "impression") {
    const key = input.dedupKey ?? `${input.campaignId}|${input.officeDeviceId ?? ""}|${input.placement}`;
    const existing = await db
      .prepare("SELECT id FROM ad_events WHERE campaign_id = ?1 AND city_id = ?2 LIMIT 1")
      .bind(input.campaignId, key.slice(0, 100))
      .first<{ id: string }>();
    if (existing) return { recorded: false };
    await db
      .prepare(
        `INSERT INTO ad_events (id, campaign_id, event_type, country_code, city_id, locale, device, occurred_at)
         VALUES (?1, ?2, 'impression', ?3, ?4, 'ar', ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        input.campaignId,
        String(input.countryCode).toLowerCase(),
        key.slice(0, 100),
        String(input.device),
        new Date().toISOString().slice(0, 19).replace("T", " "),
      )
      .run();
    return { recorded: true };
  }
  await db
    .prepare(
      `INSERT INTO ad_events (id, campaign_id, event_type, country_code, city_id, locale, device, occurred_at)
       VALUES (?1, ?2, 'click', ?3, ?4, 'ar', ?5, ?6)`,
    )
    .bind(
      crypto.randomUUID(),
      input.campaignId,
      String(input.countryCode).toLowerCase(),
      (input.dedupKey ?? `${input.campaignId}|${input.officeDeviceId ?? ""}|${input.placement}|click`).slice(0, 100),
      String(input.device),
      new Date().toISOString().slice(0, 19).replace("T", " "),
    )
    .run();
  return { recorded: true };
}
