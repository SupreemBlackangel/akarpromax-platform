import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getNewsDb } from "@/lib/news/db";
import { ANALYTICS_EVENT_TYPES, NEWS_CHANNELS, type AnalyticsEventType, type NewsChannel } from "@/lib/news/contracts";

export const dynamic = "force-dynamic";

type CounterRow = {
  news_id: string;
  placement_id: string;
  channel: string;
  day: string;
  impressions: number | null;
  visible_impressions: number | null;
  clicks: number | null;
};

type EventRow = {
  news_id: string;
  event_type: string;
  valid: number | null;
};

function aggregateRows(rows: CounterRow[]): Record<string, { impressions: number; visibleImpressions: number; clicks: number }> {
  const map: Record<string, { impressions: number; visibleImpressions: number; clicks: number }> = {};
  for (const row of rows) {
    const entry = map[row.news_id] ?? { impressions: 0, visibleImpressions: 0, clicks: 0 };
    entry.impressions += Number(row.impressions) || 0;
    entry.visibleImpressions += Number(row.visible_impressions) || 0;
    entry.clicks += Number(row.clicks) || 0;
    map[row.news_id] = entry;
  }
  return map;
}

export async function GET(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.NEWS_ANALYTICS_VIEW) && !hasSponsorPermission(identity, PERMISSIONS.NEWS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const newsId = request.nextUrl.searchParams.get("newsId")?.slice(0, 80) || null;
  const channel = request.nextUrl.searchParams.get("channel")?.toUpperCase();
  const validChannel = channel && NEWS_CHANNELS.includes(channel as NewsChannel) ? (channel as NewsChannel) : null;
  const eventType = request.nextUrl.searchParams.get("eventType")?.toLowerCase();
  const validEventType =
    eventType && ANALYTICS_EVENT_TYPES.includes(eventType as AnalyticsEventType) ? (eventType as AnalyticsEventType) : null;

  const db = await getNewsDb();

  const counterClauses: string[] = [];
  const counterParams: string[] = [];
  if (newsId) {
    counterClauses.push("news_id = ?1");
    counterParams.push(newsId);
  }
  if (validChannel) {
    counterClauses.push(`channel = ?${counterParams.length + 1}`);
    counterParams.push(validChannel);
  }
  const counterWhere = counterClauses.length ? `WHERE ${counterClauses.join(" AND ")}` : "";
  const counters = await db
    .prepare(`SELECT news_id, placement_id, channel, day, impressions, visible_impressions, clicks FROM news_delivery_counters ${counterWhere}`)
    .bind(...counterParams)
    .all<CounterRow>();

  const eventClauses: string[] = [];
  const eventParams: string[] = [];
  if (newsId) {
    eventClauses.push("news_id = ?1");
    eventParams.push(newsId);
  }
  if (validChannel) {
    eventClauses.push(`channel = ?${eventParams.length + 1}`);
    eventParams.push(validChannel);
  }
  if (validEventType) {
    eventClauses.push(`event_type = ?${eventParams.length + 1}`);
    eventParams.push(validEventType);
  }
  const eventWhere = eventClauses.length ? `WHERE ${eventClauses.join(" AND ")}` : "";
  const events = await db
    .prepare(`SELECT news_id, event_type, valid FROM news_events ${eventWhere} ORDER BY created_at DESC LIMIT 5000`)
    .bind(...eventParams)
    .all<EventRow>();

  const totals = aggregateRows(counters.results ?? []);
  const eventCounts: Record<string, { total: number; valid: number; invalid: number }> = {};
  const perNewsEvents: Record<string, Record<string, number>> = {};
  for (const row of events.results ?? []) {
    const type = ANALYTICS_EVENT_TYPES.includes(row.event_type as AnalyticsEventType) ? row.event_type : "other";
    const bucket = eventCounts[type] ?? { total: 0, valid: 0, invalid: 0 };
    bucket.total += 1;
    if (Number(row.valid)) bucket.valid += 1;
    else bucket.invalid += 1;
    eventCounts[type] = bucket;
    const perNews = perNewsEvents[row.news_id] ?? {};
    perNews[type] = (perNews[type] ?? 0) + 1;
    perNewsEvents[row.news_id] = perNews;
  }

  const allNewsIds = new Set([...Object.keys(totals), ...Object.keys(perNewsEvents)]);
  const items = [...allNewsIds].map((id) => {
    const counter = totals[id] ?? { impressions: 0, visibleImpressions: 0, clicks: 0 };
    const eventsForNews = perNewsEvents[id] ?? {};
    const ctr = counter.visibleImpressions > 0 ? counter.clicks / counter.visibleImpressions : 0;
    return {
      newsId: id,
      impressions: counter.impressions,
      visibleImpressions: counter.visibleImpressions,
      clicks: counter.clicks,
      ctr: Number(ctr.toFixed(4)),
      events: eventsForNews,
    };
  }).sort((a, b) => b.visibleImpressions - a.visibleImpressions || b.impressions - a.impressions);

  return NextResponse.json({
    totals: {
      impressions: items.reduce((sum, item) => sum + item.impressions, 0),
      visibleImpressions: items.reduce((sum, item) => sum + item.visibleImpressions, 0),
      clicks: items.reduce((sum, item) => sum + item.clicks, 0),
      events: eventCounts,
    },
    items,
  });
}
