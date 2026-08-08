import { NextRequest, NextResponse } from "next/server";
import { getOrganizationById, getOrganizationMembers, addOrganizationMember, isOrganizationMember, getOrganizationMemberRole } from "@/lib/amrs/organization";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const org = await getOrganizationById(params.id);
  if (!org) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const members = await getOrganizationMembers(params.id);
  return NextResponse.json({ organization: org, members }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const userId = body.userId as string;
  const role = body.role as string;
  const invitedBy = body.invitedBy as string;

  if (!userId || !role || !invitedBy) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (!["admin", "manager", "agent", "member"].includes(role)) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const org = await getOrganizationById(params.id);
  if (!org) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const inviterRole = await getOrganizationMemberRole(params.id, invitedBy);
  if (!inviterRole || !["owner", "admin"].includes(inviterRole)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const alreadyMember = await isOrganizationMember(params.id, userId);
  if (alreadyMember) {
    return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });
  }

  const membership = await addOrganizationMember(params.id, userId, role as "admin" | "manager" | "agent" | "member", invitedBy);
  return NextResponse.json({ ok: true, membership }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
