import { NextRequest, NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { getSession } from "@/lib/auth/session";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getOrganizationById, getOrganizationMembers, addOrganizationMember, isOrganizationMember, getOrganizationMemberRole } from "@/lib/amrs/organization";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const org = await getOrganizationById(id);
  if (!org) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const members = await getOrganizationMembers(id);
  if (!canAccessAmrsAdmin(identity) && org.status !== "active") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!canAccessAmrsAdmin(identity)) {
    return NextResponse.json({ organization: org, memberCount: members.length, members: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ organization: org, members, memberCount: members.length }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const session = await getSession();
  if (!identity.authenticated || !identity.email || !session?.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const userId = body.userId as string;
  const role = body.role as string;

  if (!userId || !role) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (!["admin", "manager", "agent", "member"].includes(role)) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const org = await getOrganizationById(id);
  if (!org) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const inviterRole = await getOrganizationMemberRole(id, session.userId);
  if (!inviterRole || !["owner", "admin"].includes(inviterRole)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const alreadyMember = await isOrganizationMember(id, userId);
  if (alreadyMember) {
    return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });
  }

  const membership = await addOrganizationMember(id, userId, role as "admin" | "manager" | "agent" | "member", session.userId);
  return NextResponse.json({ ok: true, membership }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
