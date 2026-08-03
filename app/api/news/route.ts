import { NextRequest, NextResponse } from "next/server";
import {
  canManageCountry,
  getSponsorIdentity,
  hasSponsorPermission,
  type SponsorIdentity,
} from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

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
};

const newsSelect = `
  SELECT id, scope, country_code, city_id, title_ar, title_en, title_tr,
         link_url, status, priority, start_at, end_at, created_at, updated_at
  FROM news
`;

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
  };
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown) {
  const candidate = clean(value, 800);
  if (!candidate) return null;
  if (candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = clean(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
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
      where: "WHERE (scope = 'global' OR lower(country_code) = ?1)",
    };
  }
  return { params: [] as string[], where: "WHERE scope = 'global'" };
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
      cityClause = "OR (scope = 'city' AND lower(city_id) = ?2)";
    }
    try {
      const db = await getRuntimeDb();
      const rows = await db.prepare(
        `${newsSelect}
         WHERE status = 'active'
           AND (scope = 'global' OR (scope = 'country' AND lower(country_code) = ?1) ${cityClause})
           AND (start_at IS NULL OR date(start_at) <= date('now'))
           AND (end_at IS NULL OR date(end_at) >= date('now'))
         ORDER BY CASE scope WHEN 'city' THEN 0 WHEN 'country' THEN 1 ELSE 2 END,
                  priority ASC, updated_at DESC
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
     ORDER BY CASE scope WHEN 'global' THEN 0 WHEN 'country' THEN 1 ELSE 2 END,
              CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
              priority ASC, updated_at DESC`,
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

  await writeAudit(db, identity.email, "news.created", id, { scope: scopeInfo.scope, status });
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

  await writeAudit(db, identity.email, "news.updated", id, { scope: scopeInfo.scope, status: requestedStatus });
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
