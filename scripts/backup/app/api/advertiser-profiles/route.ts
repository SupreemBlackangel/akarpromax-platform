import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { AdvertiserProfile } from "@/src/types/advertiser";

export const dynamic = "force-dynamic";

const allowedStatuses = ["draft", "pending", "under_review", "approved", "active", "suspended", "expired", "rejected", "archived"] as const;

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = normaliseText(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function serialise(row: Record<string, unknown>): AdvertiserProfile {
  return {
    id: String(row.id),
    advertiserCode: String(row.sponsor_code),
    companyNameAr: String(row.company_name_ar),
    companyNameEn: String(row.company_name_en),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    commercialRegistration: row.commercial_registration ? String(row.commercial_registration) : null,
    taxNumber: row.tax_number ? String(row.tax_number) : null,
    countryCode: String(row.country_code),
    cityId: row.city_id ? String(row.city_id) : null,
    districtId: row.district_id ? String(row.district_id) : null,
    governorate: row.governorate ? String(row.governorate) : null,
    village: row.village ? String(row.village) : null,
    street: row.street ? String(row.street) : null,
    addressAr: row.address_ar ? String(row.address_ar) : null,
    addressEn: row.address_en ? String(row.address_en) : null,
    contactName: row.contact_name ? String(row.contact_name) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    website: row.website ? String(row.website) : null,
    status: String(row.status) as AdvertiserProfile["status"],
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    suspendedAt: row.suspended_at ? String(row.suspended_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ADVERTISERS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const id = request.nextUrl.searchParams.get("id");
  const status = request.nextUrl.searchParams.get("status");

  if (id) {
    const row = await db.prepare("SELECT * FROM sponsor_profiles WHERE id = ?1").bind(id).first();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialise(row));
  }

  let sql = "SELECT * FROM sponsor_profiles";
  const params: string[] = [];
  const conditions: string[] = [];

  if (status && allowedStatuses.includes(status as typeof allowedStatuses[number])) {
    conditions.push("status = ?1");
    params.push(status);
  }

  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const rows = await bound.all<Record<string, unknown>>();
  return NextResponse.json(rows.results.map(serialise));
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ADVERTISERS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const companyNameAr = normaliseText(body.companyNameAr, 120);
  const companyNameEn = normaliseText(body.companyNameEn, 120);
  const countryCode = normaliseText(body.countryCode, 2).toLowerCase();
  const email = normaliseText(body.email, 200);
  const phone = normaliseText(body.phone, 30);

  if (!companyNameAr || !companyNameEn || !countryCode) {
    return NextResponse.json({ error: "companyNameAr, companyNameEn, countryCode are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const advertiserCode = `AD-${id.slice(0, 8).toUpperCase()}`;
  const requestedStatus = normaliseChoice(body.status, allowedStatuses, "draft");
  const status = requestedStatus === "active" && !hasPermission(identity, PERMISSIONS.ADVERTISERS_APPROVE) ? "draft" : requestedStatus;

  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO sponsor_profiles
      (id, sponsor_code, company_name_ar, company_name_en, logo_url, cover_url,
       commercial_registration, tax_number, country_code, city_id, district_id,
       governorate, village, street,
       address_ar, address_en, contact_name, email, phone, website, status,
       created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`
  ).bind(
    id, advertiserCode,
    companyNameAr, companyNameEn,
    normaliseText(body.logoUrl, 500) || null,
    normaliseText(body.coverUrl, 500) || null,
    normaliseText(body.commercialRegistration, 100) || null,
    normaliseText(body.taxNumber, 50) || null,
    countryCode,
    normaliseText(body.cityId, 80) || null,
    normaliseText(body.districtId, 80) || null,
    normaliseText(body.governorate, 120) || null,
    normaliseText(body.village, 120) || null,
    normaliseText(body.street, 200) || null,
    normaliseText(body.addressAr, 500) || null,
    normaliseText(body.addressEn, 500) || null,
    normaliseText(body.contactName, 120) || null,
    email || null,
    phone || null,
    normaliseText(body.website, 500) || null,
    status,
    identity.email,
  ).run();

  const created = await db.prepare("SELECT * FROM sponsor_profiles WHERE id = ?1").bind(id).first();
  return NextResponse.json(serialise(created!), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ADVERTISERS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = normaliseText(body.id, 80);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT * FROM sponsor_profiles WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requestedStatus = body.status ? normaliseChoice(body.status, allowedStatuses, "draft") : null;
  const status = requestedStatus === "active" && !hasPermission(identity, PERMISSIONS.ADVERTISERS_APPROVE)
    ? "draft" : requestedStatus;

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const updates: [string, unknown][] = [
    ["company_name_ar", normaliseText(body.companyNameAr, 120)],
    ["company_name_en", normaliseText(body.companyNameEn, 120)],
    ["logo_url", normaliseText(body.logoUrl, 500)],
    ["cover_url", normaliseText(body.coverUrl, 500)],
    ["commercial_registration", normaliseText(body.commercialRegistration, 100)],
    ["tax_number", normaliseText(body.taxNumber, 50)],
    ["country_code", normaliseText(body.countryCode, 2)?.toLowerCase()],
    ["city_id", normaliseText(body.cityId, 80)],
    ["district_id", normaliseText(body.districtId, 80)],
    ["governorate", normaliseText(body.governorate, 120)],
    ["village", normaliseText(body.village, 120)],
    ["street", normaliseText(body.street, 200)],
    ["address_ar", normaliseText(body.addressAr, 500)],
    ["address_en", normaliseText(body.addressEn, 500)],
    ["contact_name", normaliseText(body.contactName, 120)],
    ["email", normaliseText(body.email, 200)],
    ["phone", normaliseText(body.phone, 30)],
    ["website", normaliseText(body.website, 500)],
  ];

  if (status) updates.push(["status", status]);

  for (const [col, val] of updates) {
    if (val !== undefined && val !== null && val !== "") {
      fields.push(`${col} = ?${idx++}`);
      params.push(val);
    }
  }

  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  await db.prepare(`UPDATE sponsor_profiles SET ${fields.join(", ")} WHERE id = ?${idx}`).bind(...params).run();
  const updated = await db.prepare("SELECT * FROM sponsor_profiles WHERE id = ?1").bind(id).first();
  return NextResponse.json(serialise(updated!));
}

export async function DELETE(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!hasPermission(identity, PERMISSIONS.ADVERTISERS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = normaliseText(request.nextUrl.searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id FROM sponsor_profiles WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM sponsor_profiles WHERE id = ?1").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
