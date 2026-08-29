import { NextResponse } from "next/server";
import { authenticateDesktop, publishDesktopProperty, CORS_HEADERS, type DesktopPropertyBody } from "@/lib/integration/desktop-property-publish";

export const dynamic = "force-dynamic";

/**
 * Desktop property-publish bridge (create). See
 * lib/integration/desktop-property-publish.ts for the field mapping and
 * lib/integration/desktop-property-publish.ts's doc comment for why this is
 * a separate route from the session-cookie /api/properties.
 */

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const identity = await authenticateDesktop(request);
  if (!identity) return json({ ok: false, message: "غير مصرح، سجّل الدخول من التطبيق" }, 401);

  let body: DesktopPropertyBody;
  try {
    body = (await request.json()) as DesktopPropertyBody;
  } catch {
    return json({ ok: false, message: "بيانات غير صالحة" }, 400);
  }

  const result = await publishDesktopProperty(identity.userId, body, null);
  return json(result.body, result.status);
}
