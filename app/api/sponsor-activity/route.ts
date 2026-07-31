import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

function n(v: unknown, m: number) { return typeof v === "string" ? v.trim().slice(0, m) : ""; }

export async function GET(req: NextRequest) {
  const id = await getSponsorIdentity();
  if (!hasSponsorPermission(id, PERMISSIONS.SPONSORS_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getRuntimeDb();
  const sid = n(req.nextUrl.searchParams.get("sponsorId"), 80);
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50), 200);
  let sql = "SELECT * FROM sponsor_activity_logs"; const p: string[] = []; const w: string[] = [];
  if (sid) { w.push("sponsor_id = ?1"); p.push(sid); }
  if (w.length) sql += " WHERE " + w.join(" AND ");
  sql += " ORDER BY created_at DESC LIMIT ?" + (p.length + 1);
  const stmt = db.prepare(sql); const bound = p.length ? stmt.bind(...p, limit) : stmt.bind(limit);
  const rows = await bound.all(); return NextResponse.json(rows.results);
}
