import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

const statuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
function n(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }
function nc(v: unknown, c: readonly string[], f: string) { const t = n(v, 30); return c.includes(t) ? t : f; }
function nn(v: unknown, f: number) { const x = Number(v); return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : f; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const iid = req.nextUrl.searchParams.get("id"); const sid = req.nextUrl.searchParams.get("sponsorId");
  if (iid) { const r = await db.prepare("SELECT * FROM sponsor_invoices WHERE id = ?1").bind(iid).first(); if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(r); }
  let sql = "SELECT * FROM sponsor_invoices"; const p: string[] = []; const w: string[] = [];
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
  const sponsorId = n(b.sponsorId, 80); const dueDate = n(b.dueDate, 30); const totalAmount = nn(b.totalAmount, 0);
  if (!sponsorId || !dueDate || !totalAmount) return NextResponse.json({ error: "sponsorId, dueDate, totalAmount required" }, { status: 400 });
  const pk = crypto.randomUUID(); const invNum = `INV-${pk.slice(0, 8).toUpperCase()}`;
  const db = await getRuntimeDb();
  await db.prepare(`INSERT INTO sponsor_invoices(id,sponsor_id,invoice_number,subscription_id,contract_id,amount,tax_amount,total_amount,currency,status,due_date,paid_at,file_url,notes,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`).bind(pk, sponsorId, invNum, n(b.subscriptionId, 80) || null, n(b.contractId, 80) || null, nn(b.amount, 0), nn(b.taxAmount, 0), totalAmount, n(b.currency, 3) || "OMR", nc(b.status, statuses, "draft"), dueDate, n(b.paidAt, 30) || null, n(b.fileUrl, 500) || null, n(b.notes, 1000) || null, id.email).run();
  const r = await db.prepare("SELECT * FROM sponsor_invoices WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_UPDATE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json()) as Record<string, unknown>;
  const pk = n(b.id, 80); if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_invoices WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f: string[] = []; const p: unknown[] = []; let i = 1;
  const u: [string, unknown][] = [["amount", nn(b.amount, 0)], ["tax_amount", nn(b.taxAmount, 0)], ["total_amount", nn(b.totalAmount, 0)], ["currency", n(b.currency, 3)], ["status", nc(b.status, statuses, "draft")], ["due_date", n(b.dueDate, 30)], ["paid_at", n(b.paidAt, 30)], ["file_url", n(b.fileUrl, 500)], ["notes", n(b.notes, 1000)]];
  for (const [c, v] of u) { if (v !== undefined && v !== null && v !== "") { f.push(`${c} = ?${i++}`); p.push(v); } }
  if (!f.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  f.push("updated_at = CURRENT_TIMESTAMP"); p.push(pk);
  await db.prepare(`UPDATE sponsor_invoices SET ${f.join(", ")} WHERE id = ?${i}`).bind(...p).run();
  const r = await db.prepare("SELECT * FROM sponsor_invoices WHERE id = ?1").bind(pk).first();
  return NextResponse.json(r);
}

export async function DELETE(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_DELETE)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pk = n(req.nextUrl.searchParams.get("id"), 80);
  if (!pk) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = await getRuntimeDb();
  const ex = await db.prepare("SELECT id FROM sponsor_invoices WHERE id = ?1").bind(pk).first();
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM sponsor_invoices WHERE id = ?1").bind(pk).run();
  return new NextResponse(null, { status: 204 });
}
