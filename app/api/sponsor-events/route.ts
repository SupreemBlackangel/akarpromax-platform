import { NextRequest, NextResponse } from "next/server";
import { getRuntimeDb } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const sponsorId = typeof body.sponsorId === "string" ? body.sponsorId.slice(0, 80) : "";
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.slice(0, 2).toLowerCase() : "";
  const placement = typeof body.placement === "string" ? body.placement : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";

  if (
    !sponsorId ||
    !countryCode ||
    !["header", "content", "footer"].includes(placement) ||
    !["impression", "click"].includes(eventType)
  ) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const sponsor = await db.prepare(
    `SELECT id FROM sponsors
     WHERE id = ?1 AND lower(country_code) = ?2 AND status = 'active'
     LIMIT 1`,
  )
    .bind(sponsorId, countryCode)
    .first<{ id: string }>();
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not active" }, { status: 404 });
  }

  await db.prepare(
    `INSERT INTO sponsor_events
      (id, sponsor_id, country_code, placement, event_type)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(crypto.randomUUID(), sponsorId, countryCode, placement, eventType)
    .run();

  return new NextResponse(null, { status: 204 });
}
