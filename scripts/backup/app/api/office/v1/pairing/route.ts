import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { startPairing, listPairingCodes, revokePairingCode } from "@/lib/integration/pairing";
import { getIntegrationDb } from "@/lib/integration/db";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_INTEGRATION_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sponsorId = identity.email ?? "unknown";
  const codes = await listPairingCodes(sponsorId);
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_PAIRING_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const officeId = typeof body.officeId === "string" ? body.officeId.slice(0, 80) : undefined;
  const sponsorId = identity.email ?? "unknown";
  const result = await startPairing({
    sponsorId,
    officeId,
    createdBy: identity.email ?? undefined,
  });
  await logSecurityEvent("OFFICE_PAIRING_STARTED", { sponsorId });
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_PAIRING_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = (req.nextUrl.searchParams.get("id") ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await revokePairingCode(id);
  return NextResponse.json({ ok: true });
}
