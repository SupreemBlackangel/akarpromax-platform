# Realtime Events & SSE — Connected Ecosystem (Stage B)

Status: **Implemented** (DB-backed log + SSE) · WebSocket reserved

## Transport abstraction

`lib/integration/realtime.ts` defines:

```ts
interface RealtimeTransport {
  publish(event: RealtimeEvent): Promise<void>;
  replay(recipient, lastEventId?, limit?): Promise<RealtimeEvent[]>;
  readonly supported: boolean;
}
```

- `RealtimeEvent`: `{ eventId, eventType, scope: sponsor|office|global, sponsorId?, officeId?, payload? }`.
- `DbRealtimeTransport` — **default**: persists events to
  `office_realtime_events` (cursor ordering by `created_at ASC, id ASC`) and
  replays by scope/office/cursor. `createRealtimeTransport()` resolves it through
  `getIntegrationDb()`.
- `UnsupportedRealtimeTransport` — graceful 501 fallback for runtimes that cannot
  stream; `publish` throws `REALTIME_UNSUPPORTED`, `replay` returns `[]`.

## SSE surface

- `GET /api/office/v1/stream` — device-authenticated (scope `office.news.read`
  etc. per consumer), reads `Last-Event-ID` and replays then streams
  `text/event-stream` frames via `formatSse` (`id:` / `event:` / `data:` lines).
  Uses a `ReadableStream` (Vinext-compatible).
- Clients should reconnect with the last received `eventId` to resume without
  gaps. Events are persisted, so reconnects are lossless.

## Notes

- Event publishing happens at dispatch points (e.g. notifications, radar scans)
  via `publish`; the transport writes through the runtime DB seam, so it works on
  D1 (dev) and MySQL (start) alike.
- WebSocket transport is **reserved**, not implemented (matches the DB+SSE scope
  decision and the runtime matrix in AGENTS.md).
