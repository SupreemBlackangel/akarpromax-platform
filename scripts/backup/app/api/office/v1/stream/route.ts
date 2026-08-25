import { NextRequest, NextResponse } from "next/server";
import { authenticateDeviceToken } from "@/lib/integration/device";
import { createRealtimeTransport, formatSse } from "@/lib/integration/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const device = await authenticateDeviceToken(token);
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transport = await createRealtimeTransport();
  if (!transport.supported) {
    return NextResponse.json({ error: "Realtime unsupported in this runtime" }, { status: 501 });
  }

  const lastEventId = req.headers.get("last-event-id") ?? req.nextUrl.searchParams.get("lastEventId") ?? undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      try {
        const missed = await transport.replay(
          { sponsorId: device.sponsorId, officeId: device.officeId },
          lastEventId,
          100,
        );
        for (const event of missed) {
          controller.enqueue(encoder.encode(formatSse(event, event.eventId)));
        }
        controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      // connection closed; the event log remains the source of truth for missed events
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
