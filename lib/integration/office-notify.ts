import { dispatchOfficeNotification } from "@/lib/integration/notifications";
import { getIntegrationDb } from "@/lib/integration/db";

/**
 * The one door through which the platform tells an office something.
 *
 * An office is addressed by its sponsor id, which is the canonical (lowercase)
 * email of the account the desktop application signed in with — the same key
 * /api/program/devices files the office's devices under. The delivery lands in
 * office_notification_deliveries on the office_desktop channel, where
 * /api/program/notifications hands it to the application's bell.
 *
 * Best effort by design: a notification is a courtesy, never the reason a
 * business action fails. Every caller here is fire-and-forget.
 */

export type OfficeEventType =
  | "message.new"
  | "ad.approved"
  | "ad.rejected"
  | "subscription.updated"
  | "admin.announcement";

export type NotifyOfficeInput = {
  sponsorEmail: string;
  eventType: OfficeEventType;
  /** What makes this event unique; the same event never lands twice. */
  eventId: string;
  title: string;
  body: string;
  /** "app://messages" opens a screen inside the application; a platform path opens the website. */
  link?: string;
};

function normalizeEmail(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function notifyOffice(input: NotifyOfficeInput): Promise<boolean> {
  const sponsorId = normalizeEmail(input.sponsorEmail);
  if (!sponsorId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sponsorId)) return false;
  try {
    const result = await dispatchOfficeNotification({
      sponsorId,
      recipient: { recipientKey: sponsorId, officeId: null, channels: ["office_desktop"] },
      eventType: input.eventType,
      eventId: input.eventId,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 1000),
      link: input.link,
    });
    return result.status !== "failed";
  } catch (error) {
    console.warn("[office-notify] dispatch failed", input.eventType, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Every office that has ever registered a desktop device and still holds an active one. */
export async function listOfficeSponsors(): Promise<string[]> {
  const db = await getIntegrationDb();
  // Deduplicated here rather than with DISTINCT: one office has many devices,
  // and the statement stays inside the dialect subset every runtime shares.
  const rows = await db
    .prepare("SELECT sponsor_id FROM office_devices WHERE status = 'active'")
    .all<{ sponsor_id: string }>();
  return [...new Set((rows.results ?? []).map((r) => normalizeEmail(r.sponsor_id)).filter(Boolean))];
}

/** An announcement from the administration to every office, or to one. */
export async function announceToOffices(input: { sponsorEmail?: string; title: string; body: string; link?: string; announcementId: string }): Promise<number> {
  const targets = input.sponsorEmail ? [normalizeEmail(input.sponsorEmail)] : await listOfficeSponsors();
  let sent = 0;
  for (const sponsorEmail of targets) {
    const ok = await notifyOffice({ sponsorEmail, eventType: "admin.announcement", eventId: input.announcementId, title: input.title, body: input.body, link: input.link });
    if (ok) sent += 1;
  }
  return sent;
}
