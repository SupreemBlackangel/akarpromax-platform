import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRequestDetail, getRequestFull, renewRequest } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * "Send my request to three others."
 *
 * Only the customer who filed it, and only when the current three are finished
 * with it. Every refusal here is a rule, not a failure, so each carries its own
 * reason and a sentence the customer can act on — a 409 that says "someone is
 * still deciding" is useful; a bare 409 is not.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  if (String(existing.customer_user_id) !== identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const result = await renewRequest(id, {
    userId: identity.email,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      OFFER_ON_TABLE: "لديك عرض سعر بانتظار ردّك. اقبله أو ارفضه أولاً، ثم يمكنك طلب مزودين آخرين.",
      WAVE_STILL_OPEN: "ما زال أحد المزودين يدرس طلبك. أمهله قليلاً، وسنتيح لك طلب غيرهم بعد ردّه.",
      RENEWALS_EXHAUSTED: "تواصلنا معك عبر تسعة مزودين دون اتفاق، ولا يمكن طلب المزيد لهذا الطلب.",
      REQUEST_STATUS_INVALID: "هذا الطلب غير منشور، فلا مجال لإرساله إلى مزودين آخرين.",
    };
    return NextResponse.json(
      { error: result.reason, message: messages[result.reason], blockedUntil: result.blockedUntil ?? null },
      { status: 409 },
    );
  }

  const detail = await getRequestDetail(id);
  return NextResponse.json({
    ok: true,
    wave: result.wave,
    notified: result.notified,
    // Zero is not an error, and it must not read as one: the trade may simply
    // have nobody else nearby.
    message: result.notified > 0
      ? `أرسلنا طلبك إلى ${result.notified} مزودين آخرين.`
      : "لا يوجد مزودون آخرون في هذا التخصص قريبون منك حالياً.",
    request: detail,
  });
}
