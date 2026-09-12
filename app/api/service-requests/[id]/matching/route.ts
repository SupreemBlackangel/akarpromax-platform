import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRequestFull, listRequestMatches, renewRequest } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }

  const isCustomer = String(existing.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  if (!isCustomer && !isAdmin) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const matches = await listRequestMatches(id);
  return NextResponse.json({ matches }, { headers: { "Cache-Control": "no-store" } });
}

/** Every refusal here is a rule, so each one says which rule, in words. */
const RENEWAL_MESSAGES: Record<string, string> = {
  OFFER_ON_TABLE: "لديك عرض سعر بانتظار ردّك. اقبله أو ارفضه أولاً، ثم يمكنك طلب مزودين آخرين.",
  WAVE_STILL_OPEN: "ما زال أحد المزودين يدرس طلبك. أمهله قليلاً، وسنتيح لك طلب غيرهم بعد ردّه.",
  RENEWALS_EXHAUSTED: "تواصلنا معك عبر تسعة مزودين دون اتفاق، ولا يمكن طلب المزيد لهذا الطلب.",
  REQUEST_STATUS_INVALID: "هذا الطلب غير منشور، فلا مجال لإرساله إلى مزودين آخرين.",
};

/**
 * "Send this request to another wave."
 *
 * This used to call `runMatching(id)` straight, with no wave number, no
 * `canRenew`, no renewal count and no block — so anybody who could reach it
 * could notify every eligible craftsman in the country, as many times as they
 * liked. That is the whole of the rule the marketplace promises a craftsman: a
 * request that reaches you is one of three, which is why it is worth answering.
 * Nothing in the application called it; it was an open door nobody had walked
 * through.
 *
 * It now does what its name means, through the same path as the renew route, so
 * there is one place where the rule lives. An administrator goes through it
 * too: the rule protects the craftsmen's afternoons, and an administrator is
 * not exempt from that by virtue of a permission.
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
  const isCustomer = String(existing.customer_user_id) === identity.email;
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  if (!isCustomer && !isAdmin) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }

  const result = await renewRequest(id, {
    userId: identity.email,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, message: RENEWAL_MESSAGES[result.reason], blockedUntil: result.blockedUntil ?? null },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, wave: result.wave, matched: result.notified });
}
