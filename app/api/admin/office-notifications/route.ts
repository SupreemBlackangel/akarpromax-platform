import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { logSecurityEvent } from "@/lib/security/audit";
import { listNotificationDeliveries } from "@/lib/integration/notifications";
import { announceToOffices, listOfficeSponsors } from "@/lib/integration/office-notify";

export const dynamic = "force-dynamic";

/**
 * Announcements from the administration to the desktop applications.
 *
 * read  -> PERMISSIONS.OFFICE_NOTIFICATIONS_VIEW  (the deliveries the integration centre already lists)
 * write -> PERMISSIONS.OFFICE_DEVICES_MANAGE      (whoever may manage the offices' devices may address them)
 * Existing permissions only; no new constants.
 *
 * GET  -> { sponsors: string[], deliveries: [...] }   the offices that can be addressed, the recent deliveries
 * POST { title, body, link?, sponsorId? }             one office, or every office when sponsorId is empty
 */

const READ = PERMISSIONS.OFFICE_NOTIFICATIONS_VIEW;
const WRITE = PERMISSIONS.OFFICE_DEVICES_MANAGE;

function unauthorized(authenticated: boolean): NextResponse {
  return authenticated
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, READ)) return unauthorized(identity.authenticated);
  const [sponsors, rows] = await Promise.all([listOfficeSponsors(), listNotificationDeliveries(undefined, undefined, undefined, 100)]);
  const deliveries = rows
    .filter((row) => String(row.channel ?? "") === "office_desktop")
    .map((row) => ({
      id: String(row.id ?? ""),
      sponsorId: String(row.sponsor_id ?? ""),
      eventType: String(row.event_type ?? ""),
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      link: row.link == null ? null : String(row.link),
      status: String(row.status ?? ""),
      createdAt: String(row.created_at ?? ""),
      deliveredAt: row.delivered_at == null ? null : String(row.delivered_at),
    }));
  return NextResponse.json({ sponsors, deliveries }, { headers: { "Cache-Control": "no-store" } });
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
  const title = String(body.title ?? "").trim().slice(0, 160);
  const text = String(body.body ?? "").trim().slice(0, 1000);
  const link = String(body.link ?? "").trim().slice(0, 500);
  const sponsorId = String(body.sponsorId ?? "").trim().toLowerCase();
  if (!title || !text) return NextResponse.json({ error: "TITLE_AND_BODY_REQUIRED" }, { status: 400 });
  if (link && !/^(https?:\/\/|\/|app:\/\/)/.test(link)) return NextResponse.json({ error: "INVALID_LINK" }, { status: 400 });

  const announcementId = `announce:${crypto.randomUUID()}`;
  const sent = await announceToOffices({ sponsorEmail: sponsorId || undefined, title, body: text, link: link || undefined, announcementId });
  logSecurityEvent("OFFICE_ANNOUNCEMENT_SENT", { by: identity.email ?? null, sponsorId: sponsorId || "*", sent, title });
  return NextResponse.json({ ok: true, sent }, { status: 201 });
}
