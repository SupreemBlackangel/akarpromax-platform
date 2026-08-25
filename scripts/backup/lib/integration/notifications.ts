import { getIntegrationDb } from "@/lib/integration/db";
import { OFFICE_NOTIFICATION_CHANNELS, type OfficeNotificationChannel, type OfficeNotificationDeliveryStatus } from "@/lib/integration/constants";

export type NotificationRecipient = {
  recipientKey: string;
  officeId: string | null;
  deviceId?: string;
  channels?: OfficeNotificationChannel[];
};

export type DispatchNotificationInput = {
  sponsorId: string;
  recipient: NotificationRecipient;
  eventType: string;
  eventId: string;
  title: string;
  body: string;
  link?: string;
  quietStart?: string;
  quietEnd?: string;
};

export type DispatchResult = {
  deduplicated: boolean;
  deferred: boolean;
  channel: OfficeNotificationChannel | null;
  status: OfficeNotificationDeliveryStatus;
  deliveryId?: string;
};

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function hoursOfNow(): string {
  return new Date().toTimeString().slice(0, 5);
}

function isWithinQuietWindow(quietStart: string, quietEnd: string, nowTime: string): boolean {
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return nowTime >= quietStart && nowTime < quietEnd;
  return nowTime >= quietStart || nowTime < quietEnd;
}

export async function upsertNotificationRule(input: {
  sponsorId: string;
  officeId?: string;
  eventType: string;
  channel: OfficeNotificationChannel;
  enabled?: boolean;
  quietStart?: string;
  quietEnd?: string;
}): Promise<void> {
  const db = await getIntegrationDb();
  const now = nowIso();
  const id = crypto.randomUUID();
  const officeId = input.officeId ?? "";
  await db
    .prepare(
      `INSERT INTO office_notification_rules
        (id, sponsor_id, office_id, event_type, channel, enabled, quiet_start, quiet_end, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
       ON CONFLICT(sponsor_id, office_id, event_type, channel) DO UPDATE SET
         enabled = ?11, quiet_start = ?12, quiet_end = ?13, updated_at = ?14`,
    )
    .bind(
      id,
      input.sponsorId,
      officeId,
      input.eventType,
      input.channel,
      input.enabled === false ? 0 : 1,
      input.quietStart ?? null,
      input.quietEnd ?? null,
      now,
      now,
      input.enabled === false ? 0 : 1,
      input.quietStart ?? null,
      input.quietEnd ?? null,
      now,
    )
    .run();
}

export async function dispatchOfficeNotification(input: DispatchNotificationInput): Promise<DispatchResult> {
  const db = await getIntegrationDb();
  const now = nowIso();

  const dedupKey = `${input.eventId}|${input.recipient.recipientKey}|${input.eventType}`;
  const existing = await db
    .prepare("SELECT id FROM office_notification_deliveries WHERE dedup_key = ?1 LIMIT 1")
    .bind(dedupKey)
    .first<{ id: string }>();
  if (existing) return { deduplicated: true, deferred: false, channel: null, status: "delivered" };

  const channels = input.recipient.channels ?? OFFICE_NOTIFICATION_CHANNELS;
  if (!channels.length) return { deduplicated: false, deferred: false, channel: null, status: "failed" };

  let deliveryId: string | undefined;
  let deferred = false;
  let channel: OfficeNotificationChannel | null = null;

  for (const candidate of channels) {
    if (!OFFICE_NOTIFICATION_CHANNELS.includes(candidate)) continue;
    const rule = await db
      .prepare(
        `SELECT enabled, quiet_start, quiet_end FROM office_notification_rules
         WHERE sponsor_id = ?1 AND office_id = ?2 AND event_type = ?3 AND channel = ?4
         ORDER BY (office_id != '') DESC LIMIT 1`,
      )
      .bind(input.sponsorId, input.recipient.officeId ?? "", input.eventType, candidate)
      .first<{ enabled: number; quiet_start: string | null; quiet_end: string | null }>();

    const quietStart = input.quietStart ?? rule?.quiet_start ?? null;
    const quietEnd = input.quietEnd ?? rule?.quiet_end ?? null;

    const nowTime = hoursOfNow();
    const inQuiet = quietStart && quietEnd ? isWithinQuietWindow(quietStart, quietEnd, nowTime) : false;
    const enabled = rule?.enabled !== 0;

    const status: OfficeNotificationDeliveryStatus = !enabled || inQuiet ? "deferred" : "queued";
    if (status === "deferred") deferred = true;
    else if (channel === null) channel = candidate;

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO office_notification_deliveries
          (id, sponsor_id, office_id, device_id, event_type, event_id, recipient_key, channel,
           title, body, link, status, dedup_key, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      )
      .bind(
        id,
        input.sponsorId,
        input.recipient.officeId ?? null,
        input.recipient.deviceId ?? null,
        input.eventType,
        input.eventId,
        input.recipient.recipientKey,
        candidate,
        input.title,
        input.body,
        input.link ?? null,
        status,
        dedupKey,
        now,
      )
      .run();
    deliveryId = id;
  }

  return {
    deduplicated: false,
    deferred,
    channel,
    status: deferred ? "deferred" : "queued",
    deliveryId,
  };
}

export async function listNotificationDeliveries(sponsorId?: string, deviceId?: string, status?: string, limit = 50): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (sponsorId) {
    params.push(sponsorId);
    clauses.push(`sponsor_id = ?${params.length}`);
  }
  if (deviceId) {
    params.push(deviceId);
    clauses.push(`device_id = ?${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`status = ?${params.length}`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(
      `SELECT id, sponsor_id, office_id, device_id, event_type, event_id, recipient_key, channel,
              title, body, link, status, dedup_key, delivered_at, created_at
       FROM office_notification_deliveries${where}
       ORDER BY created_at DESC
       LIMIT ?${params.length + 1}`,
    )
    .bind(...params, limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function listNotificationRules(sponsorId?: string): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const rows = sponsorId
    ? await db
        .prepare(
          `SELECT id, sponsor_id, office_id, event_type, channel, enabled, quiet_start, quiet_end, created_at, updated_at
           FROM office_notification_rules WHERE sponsor_id = ?1 ORDER BY event_type ASC, channel ASC`,
        )
        .bind(sponsorId)
        .all<Record<string, unknown>>()
    : await db
        .prepare(
          `SELECT id, sponsor_id, office_id, event_type, channel, enabled, quiet_start, quiet_end, created_at, updated_at
           FROM office_notification_rules ORDER BY sponsor_id ASC, event_type ASC, channel ASC`,
        )
        .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export async function markDeliveryDelivered(deliveryId: string): Promise<void> {
  const db = await getIntegrationDb();
  const now = nowIso();
  await db
    .prepare("UPDATE office_notification_deliveries SET status = 'delivered', delivered_at = ?1 WHERE id = ?2")
    .bind(now, deliveryId)
    .run();
}

export { isWithinQuietWindow };
