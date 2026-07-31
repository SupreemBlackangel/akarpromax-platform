import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const statuses = ["active", "inactive", "revoked"] as const;
function n(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }
function nc(v: unknown, c: readonly string[], f: string) { const t = n(v, 30); return c.includes(t) ? t : f; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const lid = req.nextUrl.searchParams.get("id"); const sid = req.nextUrl.searchParams.get("sponsorId");
  if (lid) { const r = await db.prepare("SELECT * FROM office_links WHERE id = ?1").bind(lid).first(); if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(r); }
  let sql = "SELECT * FROM office_links"; const p: string[] = []; const w: string[] = [];
  if (sid) { w.push("sponsor_id = ?1"); p.push(sid); }
  if (w.length) sql += " WHERE " + w.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const s = db.prepare(sql); const b = p.length ? s.bind(...p) : s;
  const rows = await b.all(); return NextResponse.json(rows.results);
}

export async function POST(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.OFFICE_LINK)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const sponsorId = n(b.sponsorId, 80); const licenseKey = n(b.licenseKey, 100);
  if (!sponsorId || !licenseKey) return NextResponse.json({ error: "sponsorId, licenseKey required" }, { status: 400 });
  const pk = crypto.randomUUID(); const db = await getRuntimeDb();
  await db.prepare(`INSERT INTO office_links(id,sponsor_id,office_id,device_id,license_key,application_version,last_ip,status,activated_at,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`).bind(pk, sponsorId, n(b.officeId, 80) || null, n(b.deviceId, 80) || null, licenseKey, n(b.applicationVersion, 30) || null, n(b.lastIp, 45) || null, nc(b.status, statuses, "active"), new Date().toISOString(), id.email).run();
  const r = await db.prepare("SELECT * FROM office_links WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.OFFICE_UNLINK)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const pk = n(b.id, 80); if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM office_links WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f: string[] = []; const p: unknown[] = []; let i = 1;
  const u: [string, unknown][] = [["office_id", n(b.officeId, 80)], ["device_id", n(b.deviceId, 80)], ["application_version", n(b.applicationVersion, 30)], ["last_sync_at", n(b.lastSyncAt, 30)], ["last_ip", n(b.lastIp, 45)], ["status", nc(b.status, statuses, "active")], ["revoked_at", b.status === "revoked" ? new Date().toISOString() : null]];
  for (const [c, v] of u) { if (v !== undefined && v !== null && v !== "") { f.push(`${c} = ?${i++}`); p.push(v); } }
  if (!f.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  f.push("updated_at = CURRENT_TIMESTAMP"); p.push(pk);
  await db.prepare(`UPDATE office_links SET ${f.join(", ")} WHERE id = ?${i}`).bind(...p).run();
  const r = await db.prepare("SELECT * FROM office_links WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r);
}

export async function DELETE(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.OFFICE_UNLINK)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pk = n(req.nextUrl.searchParams.get("id"), 80);
  if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM office_links WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM office_links WHERE id = ?1").bind(pk).run();
  return new NextResponse(null, { status: 204 });
}
