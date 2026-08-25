import { NextResponse } from "next/server";
import { authenticateDeviceTokenResult, type AuthenticatedDevice, type DeviceAuthErrorReason } from "@/lib/integration/device";
import { checkProtocolVersion, type OfficeScope } from "@/lib/integration/constants";

export async function authenticateOfficeRequest(req: Request): Promise<{ device: AuthenticatedDevice } | { error: NextResponse }> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized", reason: "MISSING" }, { status: 401 }) };
  }
  const result = await authenticateDeviceTokenResult(token);
  if ("error" in result) {
    return { error: authErrorResponse(result.error.reason) };
  }
  const device = result.device;

  const rawProtocol = Number(req.headers.get("x-protocol-version") ?? device.protocolVersion);
  const rawApp = req.headers.get("x-app-version") ?? "";
  const protocol = checkProtocolVersion(rawApp, rawProtocol);
  if (protocol.status === "BLOCKED" || protocol.status === "UPDATE_REQUIRED") {
    return {
      error: NextResponse.json(
        {
          error: "Protocol update required",
          protocolStatus: protocol.status,
          currentApp: protocol.currentApp,
        },
        { status: 409 },
      ),
    };
  }

  return { device };
}

function authErrorResponse(reason: DeviceAuthErrorReason): NextResponse {
  return NextResponse.json({ error: "Unauthorized", reason }, { status: 401 });
}

export function requireScope(device: AuthenticatedDevice, scope: OfficeScope): NextResponse | null {
  if (!device.scopes.includes(scope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
