import { NextResponse } from "next/server";
import { authenticateDesktop, publishDesktopProperty, deleteDesktopProperty, CORS_HEADERS, type DesktopPropertyBody } from "@/lib/integration/desktop-property-publish";

export const dynamic = "force-dynamic";

/** Desktop property-publish bridge (update an existing publish). */

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const identity = await authenticateDesktop(request);
  if (!identity) return json({ ok: false, message: "غير مصرح، سجّل الدخول من التطبيق" }, 401);

  let body: DesktopPropertyBody;
  try {
    body = (await request.json()) as DesktopPropertyBody;
  } catch {
    return json({ ok: false, message: "بيانات غير صالحة" }, 400);
  }

  const result = await publishDesktopProperty(identity.userId, body, id);
  return json(result.body, result.status);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const identity = await authenticateDesktop(request);
  if (!identity) return json({ ok: false, message: "غير مصرح، سجّل الدخول من التطبيق" }, 401);

  const result = await deleteDesktopProperty(identity.userId, id);
  return json(result.body, result.status);
}
