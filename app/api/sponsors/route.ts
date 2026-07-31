import { NextRequest, NextResponse } from "next/server";
import {
  canManageCountry,
  getSponsorIdentity,
  hasSponsorPermission,
} from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const allowedStatuses = ["draft", "active", "paused", "expired"] as const;
const allowedTiers = ["exclusive", "gold", "standard"] as const;

type SponsorRow = {
  id: string;
  country_code: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  tier: string;
  status: string;
  website_url: string | null;
  logo_url: string | null;
  banner_url: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  placements: string;
  start_at: string | null;
  end_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  impressions?: number;
  clicks?: number;
};

const sponsorSelect = `
  SELECT s.id, s.country_code, s.name_ar, s.name_en, s.name_tr, s.tier, s.status,
         s.website_url, s.logo_url, s.banner_url, s.contact_name, s.contact_email,
         s.contact_phone, s.placements, s.start_at, s.end_at, s.priority,
         s.created_at, s.updated_at,
         COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0) AS impressions,
         COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks
  FROM sponsors s
  LEFT JOIN sponsor_events e ON e.sponsor_id = s.id
`;

function serialiseSponsor(row: SponsorRow) {
  let placements: string[] = [];
  try {
    placements = JSON.parse(row.placements);
  } catch {
    placements = ["header", "content", "footer"];
  }

  return {
    id: row.id,
    countryCode: row.country_code.toLowerCase(),
    nameAr: row.name_ar,
    nameEn: row.name_en,
    nameTr: row.name_tr,
    tier: row.tier,
    status: row.status,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    placements,
    startAt: row.start_at,
    endAt: row.end_at,
    priority: Number(row.priority),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseUrl(value: unknown) {
  const candidate = normaliseText(value, 500);
  if (!candidate) return null;
  if (candidate.startsWith("/")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normaliseChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = normaliseText(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

async function writeAudit(db: D1Database, actor: string | null, action: string, sponsorId: string, metadata: object) {
  await db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata)
     VALUES (?1, ?2, ?3, 'sponsor', ?4, ?5)`,
  )
    .bind(crypto.randomUUID(), actor, action, sponsorId, JSON.stringify(metadata))
    .run();
}

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "om").toLowerCase();
  const adminMode = request.nextUrl.searchParams.get("admin") === "1";

  if (!adminMode) {
    try {
      const db = await getRuntimeDb();
      const rows = await db.prepare(
        `${sponsorSelect}
         WHERE lower(s.country_code) = ?1
           AND s.status = 'active'
           AND (s.start_at IS NULL OR date(s.start_at) <= date('now'))
           AND (s.end_at IS NULL OR date(s.end_at) >= date('now'))
         GROUP BY s.id
         ORDER BY s.priority ASC, s.updated_at DESC
         LIMIT 1`,
      )
        .bind(country)
        .all<SponsorRow>();
      return NextResponse.json({ sponsors: rows.results.map(serialiseSponsor) });
    } catch {
      return NextResponse.json({ sponsors: [] });
    }
  }

  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params: string[] = [];
  let where = "";
  if (identity.countryCode && identity.role !== "sponsor_admin" && identity.role !== "super_admin") {
    params.push(identity.countryCode.toLowerCase());
    where = "WHERE lower(s.country_code) = ?1";
  }

  const db = await getRuntimeDb();
  const rows = await db.prepare(
    `${sponsorSelect}
     ${where}
     GROUP BY s.id
     ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
              s.priority ASC, s.updated_at DESC`,
  )
    .bind(...params)
    .all<SponsorRow>();

  return NextResponse.json({
    identity,
    sponsors: rows.results.map(serialiseSponsor),
  });
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const countryCode = normaliseText(body.countryCode, 2).toLowerCase();
  const nameAr = normaliseText(body.nameAr, 120);
  const nameEn = normaliseText(body.nameEn, 120);
  const nameTr = normaliseText(body.nameTr, 120);
  if (!countryCode || !nameAr || !nameEn || !nameTr || !canManageCountry(identity, countryCode)) {
    return NextResponse.json({ error: "Invalid sponsor data or country scope" }, { status: 400 });
  }

  const requestedStatus = normaliseChoice(body.status, allowedStatuses, "draft");
  const status =
    requestedStatus === "active" && !hasSponsorPermission(identity, PERMISSIONS.SPONSORS_APPROVE)
      ? "draft"
      : requestedStatus;
  const id = crypto.randomUUID();
  const placements = Array.isArray(body.placements)
    ? body.placements.filter((value: unknown): value is string => ["header", "content", "footer"].includes(String(value)))
    : ["header", "content", "footer"];

  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO sponsors
      (id, country_code, name_ar, name_en, name_tr, tier, status, website_url,
       logo_url, banner_url, contact_name, contact_email, contact_phone,
       placements, start_at, end_at, priority, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`,
  )
    .bind(
      id,
      countryCode,
      nameAr,
      nameEn,
      nameTr,
      normaliseChoice(body.tier, allowedTiers, "exclusive"),
      status,
      normaliseUrl(body.websiteUrl),
      normaliseUrl(body.logoUrl),
      normaliseUrl(body.bannerUrl) || "/sponsors/arab-blue.webp",
      normaliseText(body.contactName, 120) || null,
      normaliseText(body.contactEmail, 160) || null,
      normaliseText(body.contactPhone, 40) || null,
      JSON.stringify(placements.length ? placements : ["header", "content", "footer"]),
      normaliseText(body.startAt, 40) || null,
      normaliseText(body.endAt, 40) || null,
      Math.max(1, Math.min(999, Number(body.priority) || 100)),
      identity.email,
    )
    .run();

  await writeAudit(db, identity.email, "sponsor.created", id, { countryCode, status });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = normaliseText(body.id, 80);
  const nameAr = normaliseText(body.nameAr, 120);
  const nameEn = normaliseText(body.nameEn, 120);
  const nameTr = normaliseText(body.nameTr, 120);
  if (!id || !nameAr || !nameEn || !nameTr) {
    return NextResponse.json({ error: "Sponsor names are required" }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, country_code FROM sponsors WHERE id = ?1 LIMIT 1",
  )
    .bind(id)
    .first<{ id: string; country_code: string }>();
  if (!existing || !canManageCountry(identity, existing.country_code)) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const requestedStatus = normaliseChoice(body.status, allowedStatuses, "draft");
  if (requestedStatus === "active" && !hasSponsorPermission(identity, PERMISSIONS.SPONSORS_APPROVE)) {
    return NextResponse.json({ error: "Publishing permission required" }, { status: 403 });
  }
  const placements = Array.isArray(body.placements)
    ? body.placements.filter((value: unknown): value is string => ["header", "content", "footer"].includes(String(value)))
    : ["header", "content", "footer"];

  await db.prepare(
    `UPDATE sponsors SET
       name_ar = ?2, name_en = ?3, name_tr = ?4, tier = ?5, status = ?6,
       website_url = ?7, logo_url = ?8, banner_url = ?9, contact_name = ?10,
       contact_email = ?11, contact_phone = ?12, placements = ?13,
       start_at = ?14, end_at = ?15, priority = ?16, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?1`,
  )
    .bind(
      id,
      nameAr,
      nameEn,
      nameTr,
      normaliseChoice(body.tier, allowedTiers, "exclusive"),
      requestedStatus,
      normaliseUrl(body.websiteUrl),
      normaliseUrl(body.logoUrl),
      normaliseUrl(body.bannerUrl) || "/sponsors/arab-blue.webp",
      normaliseText(body.contactName, 120) || null,
      normaliseText(body.contactEmail, 160) || null,
      normaliseText(body.contactPhone, 40) || null,
      JSON.stringify(placements.length ? placements : ["header", "content", "footer"]),
      normaliseText(body.startAt, 40) || null,
      normaliseText(body.endAt, 40) || null,
      Math.max(1, Math.min(999, Number(body.priority) || 100)),
    )
    .run();

  await writeAudit(db, identity.email, "sponsor.updated", id, { status: requestedStatus });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = normaliseText(request.nextUrl.searchParams.get("id"), 80);
  const db = await getRuntimeDb();
  const existing = await db.prepare(
    "SELECT id, country_code FROM sponsors WHERE id = ?1 LIMIT 1",
  )
    .bind(id)
    .first<{ id: string; country_code: string }>();
  if (!existing || !canManageCountry(identity, existing.country_code)) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  await db.prepare(
    "UPDATE sponsors SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
  )
    .bind(id)
    .run();
  await writeAudit(db, identity.email, "sponsor.archived", id, {});
  return NextResponse.json({ ok: true });
}
