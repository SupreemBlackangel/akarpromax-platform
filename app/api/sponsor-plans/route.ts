import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { SponsorPlanType } from "@/src/types/sponsor";

export const dynamic = "force-dynamic";

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseNum(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function serialise(row: Record<string, unknown>): SponsorPlanType {
  let features: string[] = [];
  try {
    features = JSON.parse(String(row.features));
  } catch { features = []; }

  return {
    id: String(row.id),
    nameAr: String(row.name_ar),
    nameEn: String(row.name_en),
    code: String(row.code),
    priceMonthly: Number(row.price_monthly),
    priceYearly: Number(row.price_yearly),
    currency: String(row.currency),
    maxBranches: Number(row.max_branches),
    maxUsers: Number(row.max_users),
    maxProperties: Number(row.max_properties),
    maxAds: Number(row.max_ads),
    features,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

export async function GET(request: NextRequest) {
  const db = await getRuntimeDb();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const row = await db.prepare("SELECT * FROM sponsor_plans WHERE id = ?1").bind(id).first();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialise(row));
  }

  const rows = await db.prepare("SELECT * FROM sponsor_plans ORDER BY sort_order ASC, price_monthly ASC").all();
  return NextResponse.json(rows.results.map(serialise));
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const nameAr = normaliseText(body.nameAr, 120);
  const nameEn = normaliseText(body.nameEn, 120);
  const code = normaliseText(body.code, 60);

  if (!nameAr || !nameEn || !code) {
    return NextResponse.json({ error: "nameAr, nameEn, code are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO sponsor_plans
      (id, name_ar, name_en, code, price_monthly, price_yearly, currency,
       max_branches, max_users, max_properties, max_ads, features, is_active, sort_order)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
  ).bind(
    id, nameAr, nameEn, code,
    normaliseNum(body.priceMonthly, 0),
    normaliseNum(body.priceYearly, 0),
    normaliseText(body.currency, 3) || "OMR",
    normaliseNum(body.maxBranches, 0),
    normaliseNum(body.maxUsers, 0),
    normaliseNum(body.maxProperties, 0),
    normaliseNum(body.maxAds, 0),
    JSON.stringify(Array.isArray(body.features) ? body.features : []),
    body.isActive !== false ? 1 : 0,
    normaliseNum(body.sortOrder, 0),
  ).run();

  const created = await db.prepare("SELECT * FROM sponsor_plans WHERE id = ?1").bind(id).first();
  return NextResponse.json(serialise(created!), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = normaliseText(body.id, 80);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id FROM sponsor_plans WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const updates: [string, unknown][] = [
    ["name_ar", normaliseText(body.nameAr, 120)],
    ["name_en", normaliseText(body.nameEn, 120)],
    ["code", normaliseText(body.code, 60)],
    ["price_monthly", normaliseNum(body.priceMonthly, 0)],
    ["price_yearly", normaliseNum(body.priceYearly, 0)],
    ["currency", normaliseText(body.currency, 3)],
    ["max_branches", normaliseNum(body.maxBranches, 0)],
    ["max_users", normaliseNum(body.maxUsers, 0)],
    ["max_properties", normaliseNum(body.maxProperties, 0)],
    ["max_ads", normaliseNum(body.maxAds, 0)],
    ["features", JSON.stringify(Array.isArray(body.features) ? body.features : [])],
    ["sort_order", normaliseNum(body.sortOrder, 0)],
  ];

  if (body.isActive !== undefined) updates.push(["is_active", body.isActive ? 1 : 0]);

  for (const [col, val] of updates) {
    if (val !== undefined && val !== null && val !== "") {
      fields.push(`${col} = ?${idx++}`);
      params.push(val);
    }
  }

  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  params.push(id);
  await db.prepare(`UPDATE sponsor_plans SET ${fields.join(", ")} WHERE id = ?${idx}`).bind(...params).run();
  const updated = await db.prepare("SELECT * FROM sponsor_plans WHERE id = ?1").bind(id).first();
  return NextResponse.json(serialise(updated!));
}

export async function DELETE(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_DELETE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = normaliseText(request.nextUrl.searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = await getRuntimeDb();
  const existing = await db.prepare("SELECT id FROM sponsor_plans WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM sponsor_plans WHERE id = ?1").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
