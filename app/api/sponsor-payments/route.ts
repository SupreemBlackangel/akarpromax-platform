import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const statuses = ["pending", "completed", "failed", "refunded"] as const;
function n(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }
function nc(v: unknown, c: readonly string[], f: string) { const t = n(v, 30); return c.includes(t) ? t : f; }
function nn(v: unknown, f: number) { const x = Number(v); return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : f; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const pid = req.nextUrl.searchParams.get("id"); const sid = req.nextUrl.searchParams.get("sponsorId");
  if (pid) { const r = await db.prepare("SELECT * FROM sponsor_payments WHERE id = ?1").bind(pid).first(); if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(r); }
  let sql = "SELECT * FROM sponsor_payments"; const p: string[] = []; const w: string[] = [];
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
  const sponsorId = n(b.sponsorId, 80); const method = n(b.method, 60); const amount = nn(b.amount, 0);
  if (!sponsorId || !method || !amount) return NextResponse.json({ error: "sponsorId, method, amount required" }, { status: 400 });
  const pk = crypto.randomUUID(); const db = await getRuntimeDb();
  await db.prepare(`INSERT INTO sponsor_payments(id,sponsor_id,subscription_id,invoice_id,amount,currency,method,reference_number,status,paid_at,notes,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`).bind(pk, sponsorId, n(b.subscriptionId, 80) || null, n(b.invoiceId, 80) || null, amount, n(b.currency, 3) || "OMR", method, n(b.referenceNumber, 100) || null, nc(b.status, statuses, "pending"), n(b.paidAt, 30) || null, n(b.notes, 1000) || null, id.email).run();
  const r = await db.prepare("SELECT * FROM sponsor_payments WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_UPDATE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const pk = n(b.id, 80); if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_payments WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f: string[] = []; const p: unknown[] = []; let i = 1;
  const u: [string, unknown][] = [["amount", nn(b.amount, 0)], ["currency", n(b.currency, 3)], ["method", n(b.method, 60)], ["reference_number", n(b.referenceNumber, 100)], ["status", nc(b.status, statuses, "pending")], ["paid_at", n(b.paidAt, 30)], ["notes", n(b.notes, 1000)]];
  for (const [c, v] of u) { if (v !== undefined && v !== null && v !== "") { f.push(`${c} = ?${i++}`); p.push(v); } }
  if (!f.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  p.push(pk); await db.prepare(`UPDATE sponsor_payments SET ${f.join(", ")} WHERE id = ?${i}`).bind(...p).run();
  const r = await db.prepare("SELECT * FROM sponsor_payments WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r);
}

export async function DELETE(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_DELETE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pk = n(req.nextUrl.searchParams.get("id"), 80);
  if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_payments WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM sponsor_payments WHERE id = ?1").bind(pk).run();
  return new NextResponse(null, { status: 204 });
}
