import { NextRequest, NextResponse } from "next/server";
import {
  canManageCountry,
  getSponsorIdentity,
  hasSponsorPermission,
  type SponsorIdentity,
} from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import { NEWS_TYPES, NEWS_SOURCE_TYPES, REVIEW_STATUSES, type NewsType, type NewsSourceType } from "@/lib/news/contracts";
import { safeLinkUrl } from "@/lib/news/security";

export const dynamic = "force-dynamic";

const scopes = ["global", "country", "city"] as const;
const statuses = ["draft", "active", "archived"] as const;

type NewsRow = {
  id: string;
  scope: string;
  country_code: string | null;
  city_id: string | null;
  title_ar: string;
  title_en: string;
  title_tr: string;
  link_url: string | null;
  status: string;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
  summary_ar: string | null;
  summary_en: string | null;
  summary_tr: string | null;
  body_ar: string | null;
  body_en: string | null;
  body_tr: string | null;
  category: string | null;
  tags: string | null;
  image_url: string | null;
  is_breaking: number | null;
  is_pinned: number | null;
  language: string | null;
  news_type: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  review_status: string | null;
};

const newsSelect = `
  SELECT n.id, n.scope, n.country_code, n.city_id, n.title_ar, n.title_en, n.title_tr,
         n.link_url, n.status, n.priority, n.start_at, n.end_at, n.created_at, n.updated_at,
         x.summary_ar, x.summary_en, x.summary_tr, x.body_ar, x.body_en, x.body_tr,
         x.category, x.tags, x.image_url, x.is_breaking, x.is_pinned, x.language,
         x.news_type, x.source_name, x.source_url, x.source_published_at, x.review_status
  FROM news n
  LEFT JOIN news_extended x ON x.news_id = n.id
`;

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serialise(row: NewsRow) {
  return {
    id: row.id,
    scope: row.scope,
    countryCode: row.country_code,
    cityId: row.city_id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    titleTr: row.title_tr,
    linkUrl: row.link_url,
    status: row.status,
    priority: Number(row.priority),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    summaryAr: row.summary_ar,
    summaryEn: row.summary_en,
    summaryTr: row.summary_tr,
    bodyAr: row.body_ar,
    bodyEn: row.body_en,
    bodyTr: row.body_tr,
    category: row.category ?? "GENERAL",
    tags: parseTags(row.tags),
    imageUrl: row.image_url,
    isBreaking: Boolean(row.is_breaking),
    isPinned: Boolean(row.is_pinned),
    language: row.language ?? "ar",
    newsType: row.news_type ?? "MANUAL",
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    reviewStatus: row.review_status ?? "APPROVED",
  };
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = clean(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function cleanUrl(value: unknown) {
  return safeLinkUrl(typeof value === "string" ? value : undefined);
}

function normaliseScope(body: Record<string, unknown>, identity: SponsorIdentity) {
  const scope = cleanChoice(body.scope, scopes, "global");
  const countryCode = clean(body.countryCode, 2).toLowerCase();
  const cityId = clean(body.cityId, 100).toLowerCase();
  if (scope === "global") return { scope, countryCode: null, cityId: null };
  if (!countryCode || !canManageCountry(identity, countryCode)) return null;
  if (scope === "city") {
    if (!cityId || !cityId.startsWith(`${countryCode}-`)) return null;
    return { scope, countryCode, cityId };
  }
  return { scope, countryCode, cityId: null };
}

function canPublishNews(identity: SponsorIdentity) {
  return hasSponsorPermission(identity, PERMISSIONS.NEWS_PUBLISH);
}

function visibleScopeFilter(identity: SponsorIdentity) {
  if (identity.role === "super_admin" || identity.role === "sponsor_admin" || identity.role === "ad_manager") {
    return { params: [] as string[], where: "" };
  }
  if (identity.countryCode) {
    return {
      params: [identity.countryCode.toLowerCase()] as string[],
      where: "WHERE (n.scope = 'global' OR lower(n.country_code) = ?1)",
    };
  }
  return { params: [] as string[], where: "WHERE n.scope = 'global'" };
}

function cleanTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim().slice(0, 60)).filter(Boolean).slice(0, 20);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((tag) => tag.trim().slice(0, 60)).filter(Boolean).slice(0, 20);
  }
  return [];
}

function extendedPayload(body: Record<string, unknown>) {
  return {
    summaryAr: clean(body.summaryAr, 800) || null,
    summaryEn: clean(body.summaryEn, 800) || null,
    summaryTr: clean(body.summaryTr, 800) || null,
    bodyAr: clean(body.bodyAr, 20000) || null,
    bodyEn: clean(body.bodyEn, 20000) || null,
    bodyTr: clean(body.bodyTr, 20000) || null,
    category: cleanChoice(body.category, NEWS_TYPES, "GENERAL") as NewsType,
    tags: cleanTags(body.tags),
    imageUrl: safeLinkUrl(typeof body.imageUrl === "string" ? body.imageUrl : undefined),
    isBreaking: body.isBreaking === true || body.isBreaking === 1 || body.isBreaking === "1",
    isPinned: body.isPinned === true || body.isPinned === 1 || body.isPinned === "1",
    language: clean(body.language, 8).toLowerCase() || "ar",
    newsType: cleanChoice(body.newsType, NEWS_SOURCE_TYPES, "MANUAL") as NewsSourceType,
    sourceName: clean(body.sourceName, 160) || null,
    sourceUrl: safeLinkUrl(typeof body.sourceUrl === "string" ? body.sourceUrl : undefined),
    sourcePublishedAt: clean(body.sourcePublishedAt, 40) || null,
    reviewStatus: cleanChoice(body.reviewStatus, REVIEW_STATUSES, "APPROVED"),
  };
}

async function writeExtended(db: D1Database, newsId: string, ext: ReturnType<typeof extendedPayload>) {
  const existing = await db.prepare("SELECT news_id FROM news_extended WHERE news_id = ?1 LIMIT 1").bind(newsId).first<{ news_id: string }>();
  if (existing) {
    await db.prepare(
      `UPDATE news_extended SET
         summary_ar = ?2, summary_en = ?3, summary_tr = ?4,
         body_ar = ?5, body_en = ?6, body_tr = ?7,
         category = ?8, tags = ?9, image_url = ?10, is_breaking = ?11, is_pinned = ?12,
         language = ?13, news_type = ?14, source_name = ?15, source_url = ?16,
         source_published_at = ?17, review_status = ?18, updated_at = CURRENT_TIMESTAMP
       WHERE news_id = ?1`,
    ).bind(
      newsId,
      ext.summaryAr,
      ext.summaryEn,
      ext.summaryTr,
      ext.bodyAr,
      ext.bodyEn,
      ext.bodyTr,
      ext.category,
      JSON.stringify(ext.tags),
      ext.imageUrl,
      ext.isBreaking ? 1 : 0,
      ext.isPinned ? 1 : 0,
      ext.language,
      ext.newsType,
      ext.sourceName,
      ext.sourceUrl,
      ext.sourcePublishedAt,
      ext.reviewStatus,
    ).run();
    return;
  }
  await db.prepare(
    `INSERT INTO news_extended
      (news_id, summary_ar, summary_en, summary_tr, body_ar, body_en, body_tr,
       category, tags, image_url, is_breaking, is_pinned, language, news_type,
       source_name, source_url, source_published_at, review_status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19)`,
  ).bind(
    newsId,
    ext.summaryAr,
    ext.summaryEn,
    ext.summaryTr,
    ext.bodyAr,
    ext.bodyEn,
    ext.bodyTr,
    ext.category,
    JSON.stringify(ext.tags),
    ext.imageUrl,
    ext.isBreaking ? 1 : 0,
    ext.isPinned ? 1 : 0,
    ext.language,
    ext.newsType,
    ext.sourceName,
    ext.sourceUrl,
    ext.sourcePublishedAt,
    ext.reviewStatus,
    new Date().toISOString().slice(0, 19).replace("T", " "),
  ).run();
}

async function writeAudit(db: D1Database, actor: string | null, action: string, newsId: string, metadata: object) {
  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, ?3, 'news', ?4, ?5)`,
  )
    .bind(crypto.randomUUID(), actor, action, newsId, JSON.stringify(metadata))
    .run();
}

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "om").toLowerCase();
  const city = request.nextUrl.searchParams.get("city")?.toLowerCase() || "";
  const adminMode = request.nextUrl.searchParams.get("admin") === "1";

  if (!adminMode) {
    const params: string[] = [country];
    let cityClause = "";
    if (city) {
      params.push(city);
      cityClause = "OR (n.scope = 'city' AND lower(n.city_id) = ?2)";
    }
    try {
      const db = await getRuntimeDb();
      const rows = await db.prepare(
        `${newsSelect}
         WHERE n.status = 'active'
           AND (n.scope = 'global' OR (n.scope = 'country' AND lower(n.country_code) = ?1) ${cityClause})
           AND (n.start_at IS NULL OR date(n.start_at) <= date('now'))
           AND (n.end_at IS NULL OR date(n.end_at) >= date('now'))
         ORDER BY CASE n.scope WHEN 'city' THEN 0 WHEN 'country' THEN 1 ELSE 2 END,
                  n.priority ASC, n.updated_at DESC
         LIMIT 40`,
      )
        .bind(...params)
        .all<NewsRow>();
      return NextResponse.json({ news: rows.results.map(serialise) });
    } catch {
      return NextResponse.json({ news: [] });
    }
  }

  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const visible = visibleScopeFilter(identity);
  const db = await getRuntimeDb();
  const rows = await db.prepare(
    `${newsSelect}
     ${visible.where}
     ORDER BY CASE n.scope WHEN 'global' THEN 0 WHEN 'country' THEN 1 ELSE 2 END,
              CASE n.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
              n.priority ASC, n.updated_at DESC`,
  )
    .bind(...visible.params)
    .all<NewsRow>();

  return NextResponse.json({
    identity,
    news: rows.results.map(serialise),
  });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const scopeInfo = normaliseScope(body, identity);
  if (!scopeInfo) {
    return NextResponse.json({ error: "Invalid news scope or country" }, { status: 400 });
  }
  const titleAr = clean(body.titleAr, 255);
  const titleEn = clean(body.titleEn, 255);
  const titleTr = clean(body.titleTr, 255);
  if (!titleAr || !titleEn || !titleTr) {
    return NextResponse.json({ error: "News titles are required in all languages" }, { status: 400 });
  }

  const requestedStatus = cleanChoice(body.status, statuses, "draft");
  const status =
    requestedStatus === "active" && !canPublishNews(identity)
      ? "draft"
      : requestedStatus;
  const id = crypto.randomUUID();

  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO news
      (id, scope, country_code, city_id, title_ar, title_en, title_tr,
       link_url, status, priority, start_at, end_at, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
  )
    .bind(
      id,
      scopeInfo.scope,
      scopeInfo.countryCode,
      scopeInfo.cityId,
      titleAr,
      titleEn,
      titleTr,
      cleanUrl(body.linkUrl),
      status,
      Math.max(1, Math.min(999, Number(body.priority) || 100)),
      clean(body.startAt, 40) || null,
      clean(body.endAt, 40) || null,
      identity.email,
    )
    .run();

  const ext = extendedPayload(body);
  await writeExtended(db, id, ext);

  await writeAudit(db, identity.email, "news.created", id, { scope: scopeInfo.scope, status, category: ext.category });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = clean(body.id, 80);
  const titleAr = clean(body.titleAr, 255);
  const titleEn = clean(body.titleEn, 255);
  const titleTr = clean(body.titleTr, 255);
  if (!id || !titleAr || !titleEn || !titleTr) {
    return NextResponse.json({ error: "News id and titles are required" }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, country_code FROM news WHERE id = ?1 LIMIT 1",
  )
    .bind(id)
    .first<{ id: string; country_code: string | null }>();
  if (!existing) {
    return NextResponse.json({ error: "News item not found" }, { status: 404 });
  }
  if (existing.country_code && !canManageCountry(identity, existing.country_code)) {
    return NextResponse.json({ error: "Country scope not allowed" }, { status: 403 });
  }

  const scopeInfo = normaliseScope(body, identity);
  if (!scopeInfo) {
    return NextResponse.json({ error: "Invalid news scope or country" }, { status: 400 });
  }
  const requestedStatus = cleanChoice(body.status, statuses, "draft");
  if (requestedStatus === "active" && !canPublishNews(identity)) {
    return NextResponse.json({ error: "Publishing permission required" }, { status: 403 });
  }

  await db.prepare(
    `UPDATE news SET
       scope = ?2, country_code = ?3, city_id = ?4,
       title_ar = ?5, title_en = ?6, title_tr = ?7, link_url = ?8,
       status = ?9, priority = ?10, start_at = ?11, end_at = ?12,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`,
  )
    .bind(
      id,
      scopeInfo.scope,
      scopeInfo.countryCode,
      scopeInfo.cityId,
      titleAr,
      titleEn,
      titleTr,
      cleanUrl(body.linkUrl),
      requestedStatus,
      Math.max(1, Math.min(999, Number(body.priority) || 100)),
      clean(body.startAt, 40) || null,
      clean(body.endAt, 40) || null,
    )
    .run();

  const ext = extendedPayload(body);
  await writeExtended(db, id, ext);

  await writeAudit(db, identity.email, "news.updated", id, { scope: scopeInfo.scope, status: requestedStatus, category: ext.category });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = clean(request.nextUrl.searchParams.get("id"), 80);
  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, country_code FROM news WHERE id = ?1 LIMIT 1",
  )
    .bind(id)
    .first<{ id: string; country_code: string | null }>();
  if (!existing) {
    return NextResponse.json({ error: "News item not found" }, { status: 404 });
  }
  if (existing.country_code && !canManageCountry(identity, existing.country_code)) {
    return NextResponse.json({ error: "Country scope not allowed" }, { status: 403 });
  }

  await db.prepare(
    "UPDATE news SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
  )
    .bind(id)
    .run();
  await writeAudit(db, identity.email, "news.archived", id, {});
  return NextResponse.json({ ok: true });
}
