import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listDevices, revokeDevice, getDevice } from "@/lib/integration/device";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_DEVICES_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sponsorId = identity.email ?? "unknown";
  const status = (req.nextUrl.searchParams.get("status") ?? "") as "active" | "revoked" | "pending" | "expired" | "suspended";
  const devices = await listDevices(sponsorId, status && status.length ? status : undefined);
  return NextResponse.json({ devices });
}

export async function PATCH(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_DEVICES_REVOKE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const deviceId = String(body.deviceId ?? "").slice(0, 80);
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const device = await getDevice(deviceId);
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sponsorId = identity.email ?? "unknown";
  if (String(device.sponsor_id) !== sponsorId && identity.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.action === "revoke") {
    await revokeDevice(deviceId, String(body.reason ?? "manual").slice(0, 255));
    await logSecurityEvent("OFFICE_DEVICE_REVOKED", { deviceId, sponsorId });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
