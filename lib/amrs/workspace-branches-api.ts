// ORGANIZATIONS_F3_WORKSPACE
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { organizationBranches } from "@/lib/db/schema";
import { canManageOrganization, resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";

const FIELDS = ["nameAr","nameEn","countryCode","cityId","districtId","governorate","village","street","addressAr","addressEn","phone","email","latitude","longitude","status","workingHours","serviceAreas"] as const;
function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of FIELDS) if (body[key] !== undefined) out[key] = body[key];
  if (out.status !== undefined && out.status !== "active" && out.status !== "inactive") delete out.status;
  return out;
}
async function context(req: NextRequest, kind: "office" | "company", bodyOrg?: unknown) {
  const session = await getSession(req.headers.get("cookie") ?? undefined);
  if (!session?.userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const requested = typeof bodyOrg === "string" ? bodyOrg : req.nextUrl.searchParams.get("org");
  const ctx = await resolveUserOrganizationWorkspace(session.userId, kind, requested);
  if (!ctx) return { error: NextResponse.json({ error: "Organization not found for this membership" }, { status: 404 }) };
  return { ctx };
}
export async function listBranches(req: NextRequest, kind: "office" | "company") {
  const r = await context(req, kind); if ("error" in r) return r.error;
  const { db, end } = getDb();
  try {
    const data = await db.select().from(organizationBranches).where(eq(organizationBranches.organizationId, r.ctx.organization.id));
    return NextResponse.json({ success: true, data, membership: { role: r.ctx.membership.role } });
  } finally { await end(); }
}
export async function createBranch(req: NextRequest, kind: "office" | "company") {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const r = await context(req, kind, body.organizationId); if ("error" in r) return r.error;
  if (!canManageOrganization(r.ctx.membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!body.nameAr && !body.nameEn) return NextResponse.json({ error: "nameAr or nameEn required" }, { status: 400 });
  const values = pick(body);
  const { db, end } = getDb();
  try {
    const [data] = await db.insert(organizationBranches).values({ organizationId: r.ctx.organization.id, countryCode: String(values.countryCode ?? r.ctx.organization.countryCode ?? "SA"), ...values }).returning();
    return NextResponse.json({ success: true, data }, { status: 201 });
  } finally { await end(); }
}
export async function updateBranch(req: NextRequest, kind: "office" | "company") {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const r = await context(req, kind, body.organizationId); if ("error" in r) return r.error;
  if (!canManageOrganization(r.ctx.membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const update = pick(body);
  const { db, end } = getDb();
  try {
    const [data] = await db.update(organizationBranches).set({ ...update, updatedAt: new Date() }).where(and(eq(organizationBranches.id, body.id), eq(organizationBranches.organizationId, r.ctx.organization.id))).returning();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } finally { await end(); }
}
export async function deleteBranch(req: NextRequest, kind: "office" | "company") {
  const r = await context(req, kind); if ("error" in r) return r.error;
  if (!canManageOrganization(r.ctx.membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { db, end } = getDb();
  try {
    const deleted = await db.delete(organizationBranches).where(and(eq(organizationBranches.id, id), eq(organizationBranches.organizationId, r.ctx.organization.id))).returning({ id: organizationBranches.id });
    if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } finally { await end(); }
}
