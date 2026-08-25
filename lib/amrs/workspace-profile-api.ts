// ORGANIZATIONS_F3_WORKSPACE
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { canManageOrganization, resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";

const ALLOWED = ["nameAr","nameEn","nameTr","descriptionAr","descriptionEn","descriptionTr","countryCode","cityId","districtId","contactPhone","contactEmail","websiteUrl","logoUrl","coverUrl"] as const;

export async function getProfile(req: NextRequest, kind: "office" | "company") {
  const session = await getSession(req.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveUserOrganizationWorkspace(session.userId, kind, req.nextUrl.searchParams.get("org"));
  if (!ctx) return NextResponse.json({ error: "Organization not found for this membership" }, { status: 404 });
  return NextResponse.json({ success: true, data: ctx.organization, membership: { role: ctx.membership.role, status: ctx.membership.status } });
}

export async function patchProfile(req: NextRequest, kind: "office" | "company") {
  const session = await getSession(req.headers.get("cookie") ?? undefined);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const requested = typeof body.organizationId === "string" ? body.organizationId : req.nextUrl.searchParams.get("org");
  const ctx = await resolveUserOrganizationWorkspace(session.userId, kind, requested);
  if (!ctx) return NextResponse.json({ error: "Organization not found for this membership" }, { status: 404 });
  if (!canManageOrganization(ctx.membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updateData: Record<string, unknown> = {};
  for (const key of ALLOWED) if (body[key] !== undefined) updateData[key] = body[key];
  if (!Object.keys(updateData).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  const { db, end } = getDb();
  try {
    const [updated] = await db.update(organizations).set({ ...updateData, updatedAt: new Date() }).where(eq(organizations.id, ctx.organization.id)).returning();
    return NextResponse.json({ success: true, data: updated, membership: { role: ctx.membership.role } });
  } finally { await end(); }
}
