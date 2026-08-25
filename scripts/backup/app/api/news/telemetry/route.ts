import { NextRequest, NextResponse } from "next/server";
import { recordNewsEvent } from "@/lib/news/analytics";
import { NEWS_CHANNELS, ANALYTICS_EVENT_TYPES, type AnalyticsEventType, type NewsChannel } from "@/lib/news/contracts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const newsId = String(body.newsId ?? "").slice(0, 80);
  if (!newsId) return NextResponse.json({ error: "newsId required" }, { status: 400 });

  const rawChannel = String(body.channel ?? "").toUpperCase();
  const channel = NEWS_CHANNELS.includes(rawChannel as NewsChannel) ? (rawChannel as NewsChannel) : null;
  if (!channel) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

  const rawEventType = String(body.eventType ?? "").toLowerCase();
  const eventType = ANALYTICS_EVENT_TYPES.includes(rawEventType as AnalyticsEventType) ? (rawEventType as AnalyticsEventType) : null;
  if (!eventType) return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });

  const result = await recordNewsEvent({
    newsId,
    channel,
    eventType,
    placementId: body.placementId ? String(body.placementId).slice(0, 80) : null,
    userKey: body.userKey ? String(body.userKey).slice(0, 160) : null,
    sessionKey: body.sessionKey ? String(body.sessionKey).slice(0, 160) : null,
    countryCode: body.countryCode ? String(body.countryCode).toLowerCase().slice(0, 2) : null,
    cityId: body.cityId ? String(body.cityId).toLowerCase().slice(0, 100) : null,
    pagePath: body.pagePath ? String(body.pagePath).slice(0, 500) : null,
    deviceType: body.deviceType ? String(body.deviceType).slice(0, 40) : null,
    visible: body.visible === true,
    request,
  });

  return NextResponse.json(result);
}
