import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { logSecurityEvent } from "@/lib/security/audit";
import { notifyOffice } from "@/lib/integration/office-notify";

const STATUS_WORDS: Record<string, string> = { trial: "تجريبي", active: "فعال", expired: "منتهي", suspended: "معلّق", cancelled: "ملغى" };

/** Tells the office what its subscription became. Fire-and-forget. */
function announceSubscription(sub: { sponsorId: string; status: string; endDate: string | null; updatedAt?: string | null; id: string }): void {
  const word = STATUS_WORDS[sub.status] ?? sub.status;
  const until = sub.endDate ? ` حتى ${sub.endDate}` : "";
  void notifyOffice({
    sponsorEmail: sub.sponsorId,
    eventType: "subscription.updated",
    eventId: `subscription:${sub.id}:${sub.status}:${sub.endDate ?? ""}`,
    title: "تحديث اشتراك المكتب",
    body: `حالة اشتراك مكتبك على عقار بروماكس الآن: ${word}${until}.`,
    link: "/dashboard/office",
  });
}
import {
  OFFICE_SUBSCRIPTION_STATUSES,
  SubscriptionWriteError,
  createSponsorSubscription,
  getSponsorSubscriptionRecord,
  listOfficeSubscriptionOverview,
  updateSponsorSubscription,
} from "@/lib/integration/subscription";

export const dynamic = "force-dynamic";

/**
 * Admin writer for `sponsor_subscriptions` — the single source of truth behind
 * GET /api/office/v1/subscription.
 *
 * Authorization uses the existing identity/permission infrastructure only:
 *   read  -> PERMISSIONS.OFFICE_ADMIN_VIEW              (same gate as the integration overview)
 *   write -> PERMISSIONS.ADVERTISER_SUBSCRIPTIONS_MANAGE (the repository's existing
 *            "manage subscriptions" permission, already granted to the admin roles)
 * No new authentication system and no new permission constants are introduced.
 *
 * Nothing here reads or returns a device credential, a token hash or a pairing
 * code — only the non-secret device columns used to label a row.
 */

const READ = PERMISSIONS.OFFICE_ADMIN_VIEW;
const WRITE = PERMISSIONS.ADVERTISER_SUBSCRIPTIONS_MANAGE;

function unauthorized(authenticated: boolean): NextResponse {
  return authenticated
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function writeError(error: unknown): NextResponse {
  if (error instanceof SubscriptionWriteError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  throw error;
}

export async function GET(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, READ)) return unauthorized(identity.authenticated);

  const sponsorId = (new URL(req.url).searchParams.get("sponsorId") ?? "").trim();
  if (sponsorId) {
    const subscription = await getSponsorSubscriptionRecord(sponsorId);
    return NextResponse.json({ sponsorId, subscription, statuses: OFFICE_SUBSCRIPTION_STATUSES });
  }
  const subscriptions = await listOfficeSubscriptionOverview();
  return NextResponse.json({ subscriptions, statuses: OFFICE_SUBSCRIPTION_STATUSES });
}

export async function POST(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, WRITE)) return unauthorized(identity.authenticated);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const subscription = await createSponsorSubscription({
      sponsorId: String(body.sponsorId ?? ""),
      status: body.status,
      startDate: body.startDate,
      endDate: body.endDate,
      planId: body.planId,
      createdBy: identity.email ?? null,
    });
    logSecurityEvent("OFFICE_SUBSCRIPTION_CREATED", {
      sponsorId: subscription.sponsorId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      by: identity.email ?? null,
    });
    announceSubscription(subscription);
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return writeError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, WRITE)) return unauthorized(identity.authenticated);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const subscription = await updateSponsorSubscription({
      sponsorId: String(body.sponsorId ?? ""),
      status: body.status,
      startDate: body.startDate,
      endDate: body.endDate,
      planId: body.planId,
    });
    logSecurityEvent("OFFICE_SUBSCRIPTION_UPDATED", {
      sponsorId: subscription.sponsorId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      by: identity.email ?? null,
    });
    announceSubscription(subscription);
    return NextResponse.json({ subscription });
  } catch (error) {
    return writeError(error);
  }
}
