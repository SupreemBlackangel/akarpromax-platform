import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest } from "@/lib/integration/office-auth";
import { rotateDeviceToken, heartbeatDevice } from "@/lib/integration/device";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "rotate") {
    const raw = (req.headers.get("authorization") ?? "").slice(7).trim();
    try {
      const { token, tokenPrefix, expiresAt } = await rotateDeviceToken(raw);
      await logSecurityEvent("OFFICE_CREDENTIAL_ROTATED", { deviceId: auth.device.deviceId });
      return NextResponse.json({ token, tokenPrefix, expiresAt });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const lastIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await heartbeatDevice(auth.device.deviceId, lastIp);
  return NextResponse.json({ ok: true });
}
