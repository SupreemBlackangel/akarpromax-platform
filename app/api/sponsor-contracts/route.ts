import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const allowedStatuses = ["draft", "sent", "signed", "active", "expired", "cancelled"] as const;

function normaliseText(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }
function normaliseChoice(v: unknown, c: readonly string[], f: string) { const t = normaliseText(v, 30); return c.includes(t) ? t : f; }
function normaliseNum(v: unknown, f: number) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : f; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const cid = req.nextUrl.searchParams.get("id");
  const sid = req.nextUrl.searchParams.get("sponsorId");
  if (cid) { const r = await db.prepare("SELECT * FROM sponsor_contracts WHERE id = ?1").bind(cid).first(); if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(r); }
  let sql = "SELECT * FROM sponsor_contracts"; const p: string[] = []; const w: string[] = [];
  if (sid) { w.push("sponsor_id = ?1"); p.push(sid); }
  if (w.length) sql += " WHERE " + w.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const s = db.prepare(sql); const b = p.length ? s.bind(...p) : s;
  const rows = await b.all(); return NextResponse.json(rows.results);
}

export async function POST(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_CREATE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const sponsorId = normaliseText(b.sponsorId, 80); const titleAr = normaliseText(b.titleAr, 200);
  const titleEn = normaliseText(b.titleEn, 200); const startDate = normaliseText(b.startDate, 30);
  const endDate = normaliseText(b.endDate, 30);
  if (!sponsorId || !titleAr || !titleEn || !startDate || !endDate) return NextResponse.json({ error: "sponsorId, titleAr, titleEn, startDate, endDate required" }, { status: 400 });
  const pk = crypto.randomUUID(); const num = `CT-${pk.slice(0, 8).toUpperCase()}`;
  const db = await getRuntimeDb();
  await db.prepare(`INSERT INTO sponsor_contracts(id,sponsor_id,contract_number,title_ar,title_en,file_url,signed_at,start_date,end_date,value,currency,status,notes,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`).bind(pk, sponsorId, num, titleAr, titleEn, normaliseText(b.fileUrl, 500) || null, normaliseText(b.signedAt, 30) || null, startDate, endDate, normaliseNum(b.value, 0), normaliseText(b.currency, 3) || "OMR", normaliseChoice(b.status, allowedStatuses, "draft"), normaliseText(b.notes, 1000) || null, id.email).run();
  const r = await db.prepare("SELECT * FROM sponsor_contracts WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_UPDATE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const pk = normaliseText(b.id, 80); if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_contracts WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f: string[] = []; const p: unknown[] = []; let i = 1;
  const u: [string, unknown][] = [["title_ar", normaliseText(b.titleAr, 200)], ["title_en", normaliseText(b.titleEn, 200)], ["file_url", normaliseText(b.fileUrl, 500)], ["signed_at", normaliseText(b.signedAt, 30)], ["start_date", normaliseText(b.startDate, 30)], ["end_date", normaliseText(b.endDate, 30)], ["value", normaliseNum(b.value, 0)], ["currency", normaliseText(b.currency, 3)], ["status", normaliseChoice(b.status, allowedStatuses, "draft")], ["notes", normaliseText(b.notes, 1000)]];
  for (const [c, v] of u) { if (v !== undefined && v !== null && v !== "") { f.push(`${c} = ?${i++}`); p.push(v); } }
  if (!f.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  f.push("updated_at = CURRENT_TIMESTAMP"); p.push(pk);
  await db.prepare(`UPDATE sponsor_contracts SET ${f.join(", ")} WHERE id = ?${i}`).bind(...p).run();
  const r = await db.prepare("SELECT * FROM sponsor_contracts WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r);
}

export async function DELETE(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_DELETE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pk = normaliseText(req.nextUrl.searchParams.get("id"), 80);
  if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_contracts WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM sponsor_contracts WHERE id = ?1").bind(pk).run();
  return new NextResponse(null, { status: 204 });
}
