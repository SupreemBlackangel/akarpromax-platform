import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";
import type { AdvertiserUser } from "@/src/types/advertiser";

export const dynamic = "force-dynamic";

const allowedRoles = ["viewer", "editor", "manager", "admin"] as const;
const allowedStatuses = ["active", "inactive", "suspended"] as const;

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseChoice(value: unknown, choices: readonly string[], fallback: string) {
  const candidate = normaliseText(value, 30);
  return choices.includes(candidate) ? candidate : fallback;
}

function serialise(row: Record<string, unknown>): AdvertiserUser {
  return {
    id: String(row.id),
    advertiserId: String(row.sponsor_id),
    userId: row.user_id ? String(row.user_id) : null,
    email: String(row.email),
    displayName: row.display_name ? String(row.display_name) : null,
    role: String(row.role),
    phone: row.phone ? String(row.phone) : null,
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
    const row = await db.prepare("SELECT * FROM sponsor_users WHERE id = ?1").bind(id).first();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialise(row));
  }

  let sql = "SELECT * FROM sponsor_users";
  const params: string[] = [];
  const conditions: string[] = [];

  if (advertiserId) {
    conditions.push("sponsor_id = ?1");
    params.push(advertiserId);
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
  const advertiserId = normaliseText(body.advertiserId, 80);
  const email = normaliseText(body.email, 200);
  const displayName = normaliseText(body.displayName, 120);

  if (!advertiserId || !email) {
    return NextResponse.json({ error: "advertiserId and email are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const db = await getRuntimeDb();

  const existing = await db.prepare(
    "SELECT id FROM sponsor_users WHERE sponsor_id = ?1 AND email = ?2"
  ).bind(advertiserId, email).first();
  if (existing) {
    return NextResponse.json({ error: "User with this email already exists for this advertiser" }, { status: 409 });
  }

  await db.prepare(
    `INSERT INTO sponsor_users
      (id, sponsor_id, user_id, email, display_name, role, phone, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(
    id, advertiserId,
    normaliseText(body.userId, 80) || null,
    email, displayName || null,
    normaliseChoice(body.role, allowedRoles, "viewer"),
    normaliseText(body.phone, 30) || null,
    normaliseChoice(body.status, allowedStatuses, "active"),
  ).run();

  const created = await db.prepare("SELECT * FROM sponsor_users WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_users WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const updates: [string, unknown][] = [
    ["display_name", normaliseText(body.displayName, 120)],
    ["role", normaliseChoice(body.role, allowedRoles, "viewer")],
    ["phone", normaliseText(body.phone, 30)],
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
  await db.prepare(`UPDATE sponsor_users SET ${fields.join(", ")} WHERE id = ?${idx}`).bind(...params).run();
  const updated = await db.prepare("SELECT * FROM sponsor_users WHERE id = ?1").bind(id).first();
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
  const existing = await db.prepare("SELECT id FROM sponsor_users WHERE id = ?1").bind(id).first();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.prepare("DELETE FROM sponsor_users WHERE id = ?1").bind(id).run();
  return new NextResponse(null, { status: 204 });
}
