import { getIntegrationDb } from "@/lib/integration/db";
import { resolveForChannel } from "@/lib/news/delivery";
import type { NewsChannel } from "@/lib/news/contracts";

export type NewsDeliveryFilter = {
  countryCode: string;
  cityId?: string;
  limit?: number;
  channel?: NewsChannel;
};

export type OfficeNewsItem = {
  id: string;
  scope: string;
  countryCode: string | null;
  cityId: string | null;
  titleAr: string;
  titleEn: string;
  titleTr: string;
  linkUrl: string | null;
  priority: number;
};

export async function listOfficeNews(input: NewsDeliveryFilter): Promise<OfficeNewsItem[]> {
  const channel: NewsChannel = input.channel ?? "OFFICE_NEWS";
  const result = await resolveForChannel(
    {
      channel,
      countryCode: input.countryCode,
      cityId: input.cityId ?? null,
      language: "ar",
      pagePath: "/office",
      pageGroup: "office",
      userKey: null,
      sessionKey: null,
    },
    { limit: input.limit ?? 20 },
  );

  return result.items.map((item) => ({
    id: item.id,
    scope: item.scope,
    countryCode: item.countryCode,
    cityId: item.cityId,
    titleAr: item.titleAr,
    titleEn: item.titleEn,
    titleTr: item.titleTr,
    linkUrl: item.linkUrl,
    priority: item.priority,
  }));
}

export async function recordNewsDelivery(input: { newsId: string; sponsorId: string; deviceId?: string }): Promise<void> {
  const db = await getIntegrationDb();
  const existing = await db
    .prepare("SELECT id FROM office_news_deliveries WHERE device_id = ?1 AND news_id = ?2 LIMIT 1")
    .bind(input.deviceId ?? "", input.newsId)
    .first<{ id: string }>();
  if (existing) return;
  await db
    .prepare(
      `INSERT INTO office_news_deliveries (id, news_id, sponsor_id, device_id)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(crypto.randomUUID(), input.newsId, input.sponsorId, input.deviceId ?? null)
    .run();
}
