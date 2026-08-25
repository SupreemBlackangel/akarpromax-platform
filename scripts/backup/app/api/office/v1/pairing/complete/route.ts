import { NextRequest, NextResponse } from "next/server";
import { completePairing, pairingErrorToHttp } from "@/lib/integration/pairing";
import { checkProtocolVersion } from "@/lib/integration/constants";
import { logSecurityEvent } from "@/lib/security/audit";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rate = await enforceRateLimit("office_pairing_complete", clientIp(req), req.nextUrl.pathname);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const code = String(body.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const rawApp = String(body.appVersion ?? "");
  const rawProtocol = Number(body.protocolVersion ?? 1);
  const protocol = checkProtocolVersion(rawApp, rawProtocol);
  if (protocol.status === "BLOCKED") {
    return NextResponse.json({ error: "Device blocked", protocolStatus: protocol.status }, { status: 403 });
  }
  if (protocol.status === "UPDATE_REQUIRED") {
    return NextResponse.json({ error: "Protocol update required", protocolStatus: protocol.status }, { status: 409 });
  }

  try {
    const device = await completePairing({
      code,
      installationId: String(body.installationId ?? "").slice(0, 120),
      deviceName: String(body.deviceName ?? "").slice(0, 120),
      model: String(body.model ?? "").slice(0, 120),
      os: String(body.os ?? "").slice(0, 64),
      osVersion: String(body.osVersion ?? "").slice(0, 64),
      appVersion: String(body.appVersion ?? "").slice(0, 30),
      protocolVersion: rawProtocol,
      lastIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    });
    await logSecurityEvent("OFFICE_PAIRING_COMPLETED", { deviceId: device.deviceId, sponsorId: device.sponsorId });
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    const http = pairingErrorToHttp(error);
    return NextResponse.json({ error: http.message }, { status: http.status });
  }
}
