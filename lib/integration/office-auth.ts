import { NextResponse } from "next/server";
import { authenticateDeviceToken, type AuthenticatedDevice } from "@/lib/integration/device";
import { checkProtocolVersion, type OfficeScope } from "@/lib/integration/constants";

export async function authenticateOfficeRequest(req: Request): Promise<{ device: AuthenticatedDevice } | { error: NextResponse }> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const device = await authenticateDeviceToken(token);
  if (!device) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

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

export function requireScope(device: AuthenticatedDevice, scope: OfficeScope): NextResponse | null {
  if (!device.scopes.includes(scope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
