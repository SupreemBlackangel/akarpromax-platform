import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

function normaliseText(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }
function normaliseNum(v: unknown, f: number) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : f; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const did = req.nextUrl.searchParams.get("id"); const sid = req.nextUrl.searchParams.get("sponsorId"); const typ = req.nextUrl.searchParams.get("type");
  if (did) { const r = await db.prepare("SELECT * FROM sponsor_documents WHERE id = ?1").bind(did).first(); if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(r); }
  let sql = "SELECT * FROM sponsor_documents"; const p: string[] = []; const w: string[] = [];
  if (sid) { w.push("sponsor_id = ?1"); p.push(sid); }
  if (typ) { w.push("type = ?2"); p.push(typ); }
  if (w.length) sql += " WHERE " + w.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const s = db.prepare(sql); const b = p.length ? s.bind(...p) : s;
  const rows = await b.all(); return NextResponse.json(rows.results);
}

export async function POST(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_CREATE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const sponsorId = normaliseText(b.sponsorId, 80); const type = normaliseText(b.type, 60);
  const fileName = normaliseText(b.fileName, 200); const fileUrl = normaliseText(b.fileUrl, 500);
  const mimeType = normaliseText(b.mimeType, 100);
  if (!sponsorId || !type || !fileName || !fileUrl || !mimeType) return NextResponse.json({ error: "sponsorId, type, fileName, fileUrl, mimeType required" }, { status: 400 });
  const pk = crypto.randomUUID(); const db = await getRuntimeDb();
  await db.prepare(`INSERT INTO sponsor_documents(id,sponsor_id,type,file_name,file_url,file_size,mime_type,notes,uploaded_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(pk, sponsorId, type, fileName, fileUrl, normaliseNum(b.fileSize, 0), mimeType, normaliseText(b.notes, 1000) || null, id.email).run();
  const r = await db.prepare("SELECT * FROM sponsor_documents WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_DELETE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pk = normaliseText(req.nextUrl.searchParams.get("id"), 80);
  if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_documents WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM sponsor_documents WHERE id = ?1").bind(pk).run();
  return new NextResponse(null, { status: 204 });
}
