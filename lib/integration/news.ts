import { getIntegrationDb } from "@/lib/integration/db";

export type NewsDeliveryFilter = {
  countryCode: string;
  cityId?: string;
  limit?: number;
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
  const db = await getIntegrationDb();
  const params: unknown[] = [String(input.countryCode).toLowerCase()];
  const cityClause = input.cityId ? "OR (scope = 'city' AND lower(city_id) = ?2)" : "";
  if (input.cityId) params.push(String(input.cityId).toLowerCase());

  const rows = await db
    .prepare(
      `SELECT id, scope, country_code, city_id, title_ar, title_en, title_tr, link_url, priority
       FROM news
       WHERE status = 'active'
         AND (scope = 'global' OR (scope = 'country' AND lower(country_code) = ?1) ${cityClause})
         AND (start_at IS NULL OR date(start_at) <= date('now'))
         AND (end_at IS NULL OR date(end_at) >= date('now'))
       ORDER BY CASE scope WHEN 'city' THEN 0 WHEN 'country' THEN 1 ELSE 2 END, priority ASC, updated_at DESC
       LIMIT ?${params.length + 1}`,
    )
    .bind(...params, input.limit ?? 20)
    .all<Record<string, unknown>>();

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    scope: String(row.scope),
    countryCode: row.country_code ? String(row.country_code) : null,
    cityId: row.city_id ? String(row.city_id) : null,
    titleAr: String(row.title_ar),
    titleEn: String(row.title_en),
    titleTr: String(row.title_tr),
    linkUrl: row.link_url ? String(row.link_url) : null,
    priority: Number(row.priority),
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
