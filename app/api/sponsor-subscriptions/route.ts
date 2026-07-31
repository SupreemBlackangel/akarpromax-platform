import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { SponsorSubscription } from "@/src/types/sponsor";

export const dynamic = "force-dynamic";

const allowedStatuses = ["trial", "active", "expired", "cancelled", "past_due"] as const;

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = normaliseText(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function serialise(row: Record<string, unknown>): SponsorSubscription {
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    planId: String(row.plan_id),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: String(row.status) as SponsorSubscription["status"],
    autoRenew: Boolean(row.auto_renew),
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    notes: row.notes ? String(row.notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getRuntimeDb();
  const id = request.nextUrl.searchParams.get("id");
  const sponsorId = request.nextUrl.searchParams.get("sponsorId");

  if (id) {
    const row = await db.prepare("SELECT * FROM sponsor_subscriptions WHERE id = ?1").bind(id).first();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialise(row));
  }

  let sql = "SELECT * FROM sponsor_subscriptions";
  const params: string[] = [];
  const conditions: string[] = [];

  if (sponsorId) {
    conditions.push("sponsor_id = ?1");
    params.push(sponsorId);
  }

  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const rows = await bound.all<Record<string, unknown>>();
  return NextResponse.json(rows.results.map(serialise));
}

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SPONSORS_CREATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const sponsorId = normaliseText(body.sponsorId, 80);
  const planId = normaliseText(body.planId, 80);
  const startDate = normaliseText(body.startDate, 30);
  const endDate = normaliseText(body.endDate, 30);

  if (!sponsorId || !planId || !startDate || !endDate) {
    return NextResponse.json({ error: "sponsorId, planId, startDate, endDate are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = await getRuntimeDb();
  await db.prepare(
    `INSERT INTO sponsor_subscriptions
      (id, sponsor_id, plan_id, start_date, end_date, status, auto_renew, payment_method, notes, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(
    id, sponsorId, planId, startDate, endDate,
    normaliseChoice(body.status, allowedStatuses, "trial"),
    body.autoRenew !== false ? 1 : 0,
    normaliseText(body.paymentMethod, 60) || null,
    normaliseText(body.notes, 1000) || null,
    identity.email,
  ).run();

  const created = await db.prepare("SELECT * FROM sponsor_subscriptions WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_subscriptions WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const updates: [string, unknown][] = [
    ["plan_id", normaliseText(body.planId, 80)],
    ["start_date", normaliseText(body.startDate, 30)],
    ["end_date", normaliseText(body.endDate, 30)],
    ["status", normaliseChoice(body.status, allowedStatuses, "active")],
    ["payment_method", normaliseText(body.paymentMethod, 60)],
    ["notes", normaliseText(body.notes, 1000)],
  ];

  if (body.autoRenew !== undefined) updates.push(["auto_renew", body.autoRenew ? 1 : 0]);

  for (const [col, val] of updates) {
    if (val !== undefined && val !== null && val !== "") {
      fields.push(`${col} = ?${idx++}`);
      params.push(val);
    }
  }

  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);
  await db.prepare(`UPDATE sponsor_subscriptions SET ${fields.join(", ")} WHERE id = ?${idx}`).bind(...params).run();
  const updated = await db.prepare("SELECT * FROM sponsor_subscriptions WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_subscriptions WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM sponsor_subscriptions WHERE id = ?1").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
