import { getServicesDb } from "@services/db";
import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { computeMatchScore, type MatchProviderRow, type MatchRequestRow } from "@services/match-score";

export async function findCandidateProviders(request: MatchRequestRow): Promise<MatchProviderRow[]> {
  const db = await getServicesDb();
  const country = String(request.country_code || "").toUpperCase();
  const profiles = await db
    .prepare("SELECT * FROM service_provider_profiles WHERE status = 'approved' AND country_code = ?1")
    .bind(country)
    .all<Record<string, unknown>>();

  const providers: MatchProviderRow[] = [];
  for (const profile of profiles.results ?? []) {
    const categories = await db
      .prepare("SELECT category_id, price_from, price_to FROM service_provider_categories WHERE provider_id = ?1 AND is_active = 1")
      .bind(String(profile.id))
      .all<{ category_id: string; price_from: number | null; price_to: number | null }>();
    providers.push({
      id: String(profile.id),
      user_id: String(profile.user_id),
      country_code: String(profile.country_code),
      city_id: profile.city_id ? String(profile.city_id) : null,
      latitude: profile.latitude == null ? null : Number(profile.latitude),
      longitude: profile.longitude == null ? null : Number(profile.longitude),
      service_radius_km: profile.service_radius_km == null ? null : Number(profile.service_radius_km),
      rating_avg: profile.rating_avg == null ? null : Number(profile.rating_avg),
      rating_count: profile.rating_count == null ? null : Number(profile.rating_count),
      completion_rate: profile.completion_rate == null ? null : Number(profile.completion_rate),
      response_rate: profile.response_rate == null ? null : Number(profile.response_rate),
      status: String(profile.status),
      category_ids: (categories.results ?? []).map((entry) => entry.category_id),
      price_ranges: (categories.results ?? []).map((entry) => ({
        category_id: entry.category_id,
        price_from: entry.price_from,
        price_to: entry.price_to,
      })),
    });
  }
  return providers;
}

export async function runMatching(requestId: string): Promise<number> {
  const db = await getServicesDb();
  const requestRow = await db
    .prepare("SELECT * FROM service_requests WHERE id = ?1")
    .bind(requestId)
    .first<Record<string, unknown>>();
  if (!requestRow) throw new Error("REQUEST_NOT_FOUND");

  const request: MatchRequestRow = {
    id: requestId,
    category_id: String(requestRow.category_id),
    country_code: String(requestRow.country_code),
    city_id: requestRow.city_id ? String(requestRow.city_id) : null,
    latitude: requestRow.latitude == null ? null : Number(requestRow.latitude),
    longitude: requestRow.longitude == null ? null : Number(requestRow.longitude),
    urgency: requestRow.urgency ? String(requestRow.urgency) : null,
    budget_min: requestRow.budget_min == null ? null : Number(requestRow.budget_min),
    budget_max: requestRow.budget_max == null ? null : Number(requestRow.budget_max),
  };

  const candidates = await findCandidateProviders(request);
  const now = nowMySqlDateTime();
  const statements: D1PreparedStatement[] = [];
  const notifications: Array<{ userId: string; providerId: string }> = [];
  const outbox: Array<{ eventType: string; payload: Record<string, unknown> }> = [];

  for (const provider of candidates) {
    const result = computeMatchScore(request, provider);
    if (!result) continue;
    statements.push(
      db
        .prepare(
          `INSERT INTO service_request_matches
            (id, request_id, provider_id, score, distance_km, category_match, rating_bonus, urgency_bonus, budget_fit, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
           ON CONFLICT (request_id, provider_id) DO UPDATE SET
             score = ?11, distance_km = ?12, category_match = ?13, rating_bonus = ?14, urgency_bonus = ?15, budget_fit = ?16`,
        )
        .bind(
          crypto.randomUUID(), requestId, provider.id, result.score, result.distanceKm,
          result.categoryMatch ? 1 : 0, result.ratingBonus, result.urgencyBonus, result.budgetFit ? 1 : 0, now,
          result.score, result.distanceKm, result.categoryMatch ? 1 : 0, result.ratingBonus, result.urgencyBonus, result.budgetFit ? 1 : 0,
        ),
    );
    notifications.push({ userId: provider.user_id, providerId: provider.id });
    outbox.push({
      eventType: "SERVICE_REQUEST_MATCHED",
      payload: { requestId, providerId: provider.id, providerUserId: provider.user_id, score: result.score },
    });
  }

  if (statements.length) await db.batch(statements);

  const customer = String(requestRow.customer_user_id);
  for (const entry of notifications) {
    statements.push(
      db
        .prepare(
          `INSERT INTO service_notifications (id, user_id, type, title, body, link, entity_type, entity_id, is_read, created_at)
           VALUES (?1, ?2, 'SERVICE_REQUEST_MATCHED', ?3, ?4, ?5, 'service_requests', ?6, 0, ?7)`,
        )
        .bind(
          crypto.randomUUID(), entry.userId,
          "طلب جديد يناسب خدماتك",
          `وجدنا طلباً جديداً مطابقاً لخدماتك — يمكنك تقديم عرض.`,
          `/dashboard/services/requests/${requestId}`,
          requestId, now,
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO service_notifications (id, user_id, type, title, body, link, entity_type, entity_id, is_read, created_at)
           VALUES (?1, ?2, 'SERVICE_REQUEST_MATCHED', ?3, ?4, ?5, 'service_requests', ?6, 0, ?7)`,
        )
        .bind(
          crypto.randomUUID(), customer,
          "تمت مطابقة طلبك",
          `تم مطابقة طلبك مع مزودي خدمات محتملين.`,
          `/service-requests/${requestId}`,
          requestId, now,
        ),
    );
  }
  for (const event of outbox) {
    statements.push(
      db
        .prepare(
          `INSERT INTO service_outbox_events (id, event_type, payload, status, attempts, created_at)
           VALUES (?1, ?2, ?3, 'pending', 0, ?4)`,
        )
        .bind(crypto.randomUUID(), event.eventType, JSON.stringify(event.payload), now),
    );
  }

  if (statements.length) await db.batch(statements);
  return notifications.length;
}

export async function listMatchesForRequest(requestId: string): Promise<Array<Record<string, unknown>>> {
  const db = await getServicesDb();
  const result = await db
    .prepare(
      `SELECT m.*, p.display_name_ar, p.display_name_en, p.rating_avg, p.rating_count, p.jobs_completed,
              p.completion_rate, p.response_rate, p.logo_url, p.business_name, p.city_id, p.avg_response_time_min
       FROM service_request_matches m
       LEFT JOIN service_provider_profiles p ON p.id = m.provider_id
       WHERE m.request_id = ?1 AND m.provider_ignored = 0
       ORDER BY m.score DESC`,
    )
    .bind(requestId)
    .all<Record<string, unknown>>();
  return result.results ?? [];
}
