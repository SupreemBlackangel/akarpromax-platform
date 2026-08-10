import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { AdvertiserBranch } from "@/src/types/advertiser";

export const dynamic = "force-dynamic";

const allowedStatuses = ["active", "inactive"] as const;

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = normaliseText(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function serialise(row: Record<string, unknown>): AdvertiserBranch {
  return {
    id: String(row.id),
    advertiserId: String(row.sponsor_id),
    nameAr: String(row.name_ar),
    nameEn: String(row.name_en),
    countryCode: String(row.country_code),
    cityId: String(row.city_id),
    districtId: row.district_id ? String(row.district_id) : null,
    governorate: row.governorate ? String(row.governorate) : null,
    village: row.village ? String(row.village) : null,
    street: row.street ? String(row.street) : null,
    addressAr: row.address_ar ? String(row.address_ar) : null,
    addressEn: row.address_en ? String(row.address_en) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    lat: row.lat ? Number(row.lat) : null,
    lng: row.lng ? Number(row.lng) : null,
    status: String(row.status),
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
  const advertiserId = request.nextUrl.searchParams.get("advertiserId");

  if (id) {
    const row = await db.prepare("SELECT * FROM sponsor_branches WHERE id = ?1").bind(id).first();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialise(row));
  }

  let sql = "SELECT * FROM sponsor_branches";
  const params: string[] = [];
  const conditions: string[] = [];

  if (advertiserId) {
    conditions.push("sponsor_id = ?1");
    params.push(advertiserId);
  }

  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY name_ar ASC";

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
  const advertiserId = normaliseText(body.advertiserId, 80);
  const nameAr = normaliseText(body.nameAr, 120);
  const nameEn = normaliseText(body.nameEn, 120);
  const countryCode = normaliseText(body.countryCode, 2).toLowerCase();
  const cityId = normaliseText(body.cityId, 80);

  if (!advertiserId || !nameAr || !nameEn || !countryCode || !cityId) {
    return NextResponse.json({ error: "advertiserId, nameAr, nameEn, countryCode, cityId are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO sponsor_branches
      (id, sponsor_id, name_ar, name_en, country_code, city_id, district_id,
       governorate, village, street,
       address_ar, address_en, phone, email, lat, lng, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`
  ).bind(
    id, advertiserId, nameAr, nameEn, countryCode, cityId,
    normaliseText(body.districtId, 80) || null,
    normaliseText(body.governorate, 120) || null,
    normaliseText(body.village, 120) || null,
    normaliseText(body.street, 200) || null,
    normaliseText(body.addressAr, 500) || null,
    normaliseText(body.addressEn, 500) || null,
    normaliseText(body.phone, 30) || null,
    normaliseText(body.email, 200) || null,
    body.lat ? String(body.lat) : null,
    body.lng ? String(body.lng) : null,
    normaliseChoice(body.status, allowedStatuses, "active"),
  ).run();

  const created = await db.prepare("SELECT * FROM sponsor_branches WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_branches WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const updates: [string, unknown][] = [
    ["name_ar", normaliseText(body.nameAr, 120)],
    ["name_en", normaliseText(body.nameEn, 120)],
    ["country_code", normaliseText(body.countryCode, 2)?.toLowerCase()],
    ["city_id", normaliseText(body.cityId, 80)],
    ["district_id", normaliseText(body.districtId, 80)],
    ["governorate", normaliseText(body.governorate, 120)],
    ["village", normaliseText(body.village, 120)],
    ["street", normaliseText(body.street, 200)],
    ["address_ar", normaliseText(body.addressAr, 500)],
    ["address_en", normaliseText(body.addressEn, 500)],
    ["phone", normaliseText(body.phone, 30)],
    ["email", normaliseText(body.email, 200)],
    ["lat", body.lat ? String(body.lat) : null],
    ["lng", body.lng ? String(body.lng) : null],
    ["status", normaliseChoice(body.status, allowedStatuses, "active")],
  ];

  for (const [col, val] of updates) {
    if (val !== undefined && val !== null && val !== "") {
      fields.push(`${col} = ?${idx++}`);
      params.push(val);
    }
  }

  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  await db.prepare(`UPDATE sponsor_branches SET ${fields.join(", ")} WHERE id = ?${idx}`).bind(...params).run();
  const updated = await db.prepare("SELECT * FROM sponsor_branches WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_branches WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM sponsor_branches WHERE id = ?1").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
