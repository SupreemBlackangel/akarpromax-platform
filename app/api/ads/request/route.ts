import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";
import { ensureAdSchema } from "@/lib/ad-schema";
import { cleanUrl } from "@/lib/ads/admin";
import { AD_PLACEMENTS } from "@/src/constants/advertising";
import { STANDARD_PUBLIC_AD_LAYOUT_V1 } from "@/src/config/standard-public-ad-layout";

export const dynamic = "force-dynamic";

// Every placement of the standard public ad system (all families × all slots)
// is requestable, plus the two legacy home-rail codes kept for old links.
const REQUESTABLE_PLACEMENTS = new Set<string>(["side_left", "side_right"]);
for (const family of Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1)) {
  for (const slot of Object.values(family.placements)) {
    REQUESTABLE_PLACEMENTS.add(slot.placement);
  }
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanEmail(value: unknown): string {
  const candidate = clean(value, 255).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate) ? candidate : "";
}

function localizedText(message: string): { ar: string; en: string; tr: string } {
  const fallback = { ar: "نشاط تجاري", en: "Business", tr: "İşletme" };
  if (!message) return fallback;
  return { ar: message, en: message, tr: message };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const placement = clean(body.placement, 64);
  if (!REQUESTABLE_PLACEMENTS.has(placement)) {
    return NextResponse.json({ error: "Unsupported placement" }, { status: 400 });
  }

  // Optional slot context carried from the clicked frame.
  const canonical = clean(body.canonical, 32);
  const family = clean(body.family, 32).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const city = clean(body.city, 64);
  const region = clean(body.region, 64);
  const district = clean(body.district, 64);
  const pagePath = clean(body.path, 160);

  // Multi-country targeting: `countryCodes` (array, max 23) is preferred; the
  // legacy single `countryCode` field is still accepted as a fallback so older
  // callers (e.g. /advertise) keep working unchanged.
  const rawCodes = Array.isArray(body.countryCodes)
    ? body.countryCodes
    : [body.countryCode];
  const countryCodes = [...new Set(
    rawCodes
      .map((code) => clean(code, 8).toLowerCase())
      .filter((code) => /^[a-z]{2}$/.test(code)),
  )].slice(0, 23);
  if (!countryCodes.length) {
    return NextResponse.json({ error: "A valid country code is required" }, { status: 400 });
  }

  const advertiserName = clean(body.advertiserName, 140);
  const contactEmail = cleanEmail(body.contactEmail);
  const contactPhone = clean(body.contactPhone, 40);
  const targetUrl = cleanUrl(body.targetUrl, true) || "";
  const message = clean(body.message, 320);
  // Optional trilingual descriptions from the wizard; Arabic backfills the
  // other languages, and the legacy `message` field stays as the fallback.
  const descriptionAr = clean(body.descriptionAr, 320);
  const descriptionEn = clean(body.descriptionEn, 320);
  const descriptionTr = clean(body.descriptionTr, 320);
  const mediaUrl = cleanUrl(body.mediaUrl) ?? "";

  if (!advertiserName || !contactEmail || !targetUrl) {
    return NextResponse.json({ error: "Advertiser name, contact email and target URL are required" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  await ensureAdSchema(db);

  const duplicate = await db
    .prepare(
      `SELECT id FROM ad_campaigns
       WHERE created_by = ?1 AND campaign_type = 'request'
         AND placements = ?2 AND approval_status = 'pending' AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(contactEmail, JSON.stringify([placement]))
    .first<{ id: string }>();

  if (duplicate) {
    return NextResponse.json({ error: "You already have a pending request for this spot" }, { status: 409 });
  }

  const placementDisplay = canonical || placement;
  const placementLabel = AD_PLACEMENTS[placement]?.label ?? { ar: placementDisplay, en: placementDisplay, tr: placementDisplay };
  const id = crypto.randomUUID();
  const hasDescriptions = Boolean(descriptionAr || descriptionEn || descriptionTr);
  const descriptionBase = descriptionAr || descriptionEn || descriptionTr;
  const description = hasDescriptions
    ? {
        ar: descriptionAr || descriptionBase,
        en: descriptionEn || descriptionBase,
        tr: descriptionTr || descriptionBase,
      }
    : localizedText(message || (contactPhone ? `📞 ${contactPhone}` : ""));

  await db
    .prepare(
      `INSERT INTO ad_campaigns
        (id, internal_name, advertiser_name, campaign_type, status, media_type,
         media_url, mobile_media_url, tablet_media_url, poster_url,
         eyebrow_ar, eyebrow_en, eyebrow_tr, title_ar, title_en, title_tr,
         accent_ar, accent_en, accent_tr, description_ar, description_en, description_tr,
         cta_ar, cta_en, cta_tr, target_url, countries, cities, languages, devices,
         priority, weight, start_at, end_at,
         section_scopes, page_types, placements, region_ids, district_ids,
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
               ?61, ?62, ?63, ?64, ?65, ?66, ?67, ?68, ?69, ?70, ?71, ?72, ?73, ?74)`,
    )
    .bind(
      id,
      `${advertiserName} — ${placementDisplay}`,
      advertiserName,
      "request",
      "draft",
      mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") ? "video" : "image",
      mediaUrl || "/placeholder.svg",
      null,
      null,
      null,
      "طلب إعلان",
      "Ad request",
      "Reklam talebi",
      advertiserName,
      advertiserName,
      advertiserName,
      placementLabel.ar,
      placementLabel.en,
      placementLabel.tr,
      description.ar,
      description.en,
      description.tr,
      "اعرض إعلانك",
      "View ad",
      "Reklamı görüntüle",
      targetUrl,
      JSON.stringify(countryCodes),
      JSON.stringify(city ? [city] : []),
      JSON.stringify(["ar", "en", "tr"]),
      JSON.stringify(["desktop"]),
      100,
      100,
      null,
      null,
      JSON.stringify([family || "home"]),
      JSON.stringify([family || "home"]),
      JSON.stringify([placement]),
      JSON.stringify(region ? [region] : []),
      JSON.stringify(district ? [district] : []),
      null,
      null,
      null,
      0,
      0,
      0,
      0,
      null,
      "[]",
      "[]",
      "[]",
      "[]",
      "[]",
      "[]",
      "[]",
      null,
      null,
      "[]",
      null,
      "fixed",
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "pending",
      1,
      0,
      0,
      0,
      0,
      null,
      contactEmail,
    )
    .run();

  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
         VALUES (?1, ?2, ?3, 'ad_campaign', ?4, ?5)`,
      )
      .bind(crypto.randomUUID(), contactEmail, "ad.requested", id, JSON.stringify({ placement, canonical, family, countryCode: countryCodes[0], countryCodes, hasDescriptions, city, region, district, path: pagePath }))
      .run();
  } catch {
    // audit best-effort
  }

  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
