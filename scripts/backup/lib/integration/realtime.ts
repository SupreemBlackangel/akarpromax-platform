import { getIntegrationDb } from "@/lib/integration/db";

export type RealtimeEvent = {
  eventId: string;
  eventType: string;
  scope: "sponsor" | "office" | "global";
  sponsorId?: string;
  officeId?: string;
  payload?: Record<string, unknown>;
};

export interface RealtimeTransport {
  publish(event: RealtimeEvent): Promise<void>;
  replay(recipient: { sponsorId: string; officeId: string | null }, lastEventId?: string, limit?: number): Promise<RealtimeEvent[]>;
  readonly supported: boolean;
}

export class DbRealtimeTransport implements RealtimeTransport {
  readonly supported = true;
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async publish(event: RealtimeEvent): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO office_realtime_events
          (id, event_id, event_type, scope, sponsor_id, office_id, payload)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        crypto.randomUUID(),
        event.eventId,
        event.eventType,
        event.scope,
        event.sponsorId ?? null,
        event.officeId ?? null,
        event.payload ? JSON.stringify(event.payload) : null,
      )
      .run();
  }

  async replay(recipient: { sponsorId: string; officeId: string | null }, lastEventId?: string, limit = 100): Promise<RealtimeEvent[]> {
    let anchor: string | null = null;
    if (lastEventId) {
      const anchorRow = await this.db
        .prepare("SELECT created_at FROM office_realtime_events WHERE event_id = ?1 LIMIT 1")
        .bind(lastEventId)
        .first<{ created_at: string }>();
      anchor = anchorRow?.created_at ?? null;
    }

    const params: unknown[] = [recipient.sponsorId];
    const officePlaceholder = recipient.officeId ? 2 : -1;
    const anchorPlaceholder = recipient.officeId ? 3 : 2;
    const where = [
      `(scope = 'global' OR sponsor_id = ?1)`,
      ...(recipient.officeId ? [`office_id = ?${officePlaceholder} OR office_id IS NULL`] : []),
      ...(anchor ? [`created_at > ?${anchorPlaceholder}`] : []),
    ].join(" AND ");
    if (recipient.officeId) params.push(recipient.officeId);
    if (anchor) params.push(anchor);

    const rows = await this.db
      .prepare(
        `SELECT event_id, event_type, scope, sponsor_id, office_id, payload, created_at
         FROM office_realtime_events
         WHERE ${where}
         ORDER BY created_at ASC, id ASC
         LIMIT ?${params.length + 1}`,
      )
      .bind(...params, limit)
      .all<Record<string, unknown>>();

    return (rows.results ?? []).map((row) => {
      let payload: Record<string, unknown> | undefined;
      try {
        payload = row.payload ? JSON.parse(String(row.payload)) : undefined;
      } catch {
        payload = undefined;
      }
      return {
        eventId: String(row.event_id),
        eventType: String(row.event_type),
        scope: String(row.scope) as RealtimeEvent["scope"],
        sponsorId: row.sponsor_id ? String(row.sponsor_id) : undefined,
        officeId: row.office_id ? String(row.office_id) : undefined,
        payload,
      };
    });
  }
}

export class UnsupportedRealtimeTransport implements RealtimeTransport {
  readonly supported = false;
  async publish(): Promise<void> {
    throw new Error("REALTIME_UNSUPPORTED");
  }
  async replay(): Promise<RealtimeEvent[]> {
    return [];
  }
}

let transportOverride: RealtimeTransport | null = null;

export function setRealtimeTransportForTesting(transport: RealtimeTransport | null): void {
  transportOverride = transport;
}

export async function createRealtimeTransport(): Promise<RealtimeTransport> {
  if (transportOverride) return transportOverride;
  const db = await getIntegrationDb();
  return new DbRealtimeTransport(db);
}

export function formatSse(event: RealtimeEvent, lastEventId: string): string {
  const payload = event.payload ? `\ndata: ${JSON.stringify(event.payload)}` : "";
  return `id: ${event.eventId}\nevent: ${event.eventType}\ndata: ${JSON.stringify({ eventType: event.eventType, scope: event.scope, payload: event.payload ?? null })}\n\n`;
}
