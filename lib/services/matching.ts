import { getServicesDb } from "@services/db";
import { nowMySqlDateTime } from "@/lib/auth/mysql-time";
import { computeMatchScore, type MatchProviderRow, type MatchRequestRow } from "@services/match-score";
import {
  DEFAULT_WAVE_SETTINGS,
  DEFAULT_PROVIDER_SORT,
  isProviderSort,
  selectWave,
  type ProviderSort,
  type ScoredCandidate,
  type WaveSettings,
} from "@services/request-waves";

export async function findCandidateProviders(request: MatchRequestRow): Promise<MatchProviderRow[]> {
  const db = await getServicesDb();
  // Compare case-insensitively rather than with a plain `=`. The write side now
  // normalizes to uppercase, but the provider listing has always defended
  // against mixed case here (it expands each token to both cases and uses IN),
  // and the matcher did not: a single lowercase row -- from an older client, a
  // hand-inserted record, an import -- silently matched nothing at all instead
  // of failing loudly. The column is C.UTF-8, so `=` is case-sensitive.
  const country = String(request.country_code || "").toLocaleUpperCase("en");
  const profiles = await db
    .prepare("SELECT * FROM service_provider_profiles WHERE status = 'approved' AND UPPER(country_code) = ?1")
    .bind(country)
    .all<Record<string, unknown>>();

  const rows = profiles.results ?? [];
  if (rows.length === 0) {
    return [];
  }

  // One query for every provider's categories, not one query per provider.
  //
  // This ran inside the loop, so matching a single request cost 1 + N round
  // trips -- and it runs on the publish path, synchronously, while the customer
  // waits. With a hundred approved providers in a country that is a hundred
  // sequential queries to decide one request, and it grows with the marketplace
  // rather than with the work.
  //
  // The parameter list is built from the ids rather than interpolated, so a
  // provider id can never reach the statement as SQL.
  const providerIds = rows.map((profile) => String(profile.id));
  const placeholders = providerIds.map((_, index) => `?${index + 1}`).join(",");
  const categoryRows = await db
    .prepare(
      `SELECT provider_id, category_id, price_from, price_to
       FROM service_provider_categories
       WHERE is_active = 1 AND provider_id IN (${placeholders})`,
    )
    .bind(...(providerIds as [string, ...string[]]))
    .all<{ provider_id: string; category_id: string; price_from: number | null; price_to: number | null }>();

  const byProvider = new Map<string, Array<{ category_id: string; price_from: number | null; price_to: number | null }>>();
  for (const row of categoryRows.results ?? []) {
    const list = byProvider.get(String(row.provider_id)) ?? [];
    list.push({ category_id: row.category_id, price_from: row.price_from, price_to: row.price_to });
    byProvider.set(String(row.provider_id), list);
  }

  const providers: MatchProviderRow[] = [];
  for (const profile of rows) {
    // A provider with no active categories keeps an empty list, exactly as the
    // per-provider query returned no rows for them.
    const categories = { results: byProvider.get(String(profile.id)) ?? [] };
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

/**
 * Notify one wave of craftsmen about a request — not every craftsman in the
 * country.
 *
 * This used to write a match and an email for every approved provider who
 * covered the category and sat within range. In a thin market that is three
 * people; in a full one it is fifty, and then a request that reaches you is
 * worth little, because forty-nine others got it too. The owner's rule makes
 * the notification mean something: you are one of three, so it is worth
 * answering, and the requester gets three people who actually answer instead
 * of fifty who might.
 *
 * A later wave is this same call with the earlier waves' providers excluded,
 * so nobody is asked twice about one job.
 */
export async function runMatching(
  requestId: string,
  options: { wave?: number; settings?: WaveSettings; sort?: ProviderSort } = {},
): Promise<number> {
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

  const settings = options.settings ?? (await loadWaveSettings(request.country_code));
  // The requester chose the ordering when they filed the request; "nearest" is
  // the rule, and the answer for a row that predates the choice.
  const sort = options.sort
    ?? (isProviderSort(requestRow.provider_sort) ? requestRow.provider_sort : DEFAULT_PROVIDER_SORT);

  // Who this request has already reached, and therefore which wave this is.
  const previous = await db
    .prepare("SELECT provider_id, wave FROM service_request_matches WHERE request_id = ?1")
    .bind(requestId)
    .all<{ provider_id: string; wave?: number | null }>()
    .catch(() =>
      // A host that has not taken migration 0013 has no `wave` column. The wave
      // SIZE is the part of the rule that matters most and does not need the
      // column, so read the ids without it rather than refuse to match at all.
      db
        .prepare("SELECT provider_id FROM service_request_matches WHERE request_id = ?1")
        .bind(requestId)
        .all<{ provider_id: string; wave?: number | null }>(),
    );

  const previousMatches = previous.results ?? [];
  const alreadyNotified = new Set(previousMatches.map((match) => String(match.provider_id)));
  const highestWave = previousMatches.reduce((highest, match) => Math.max(highest, Number(match.wave ?? 1)), 0);
  const wave = options.wave ?? (highestWave > 0 ? highestWave + 1 : 1);

  const candidates = await findCandidateProviders(request);
  const scored: ScoredCandidate[] = [];
  for (const provider of candidates) {
    const result = computeMatchScore(request, provider);
    if (result) scored.push({ provider, result });
  }

  const chosen = selectWave(scored, { sort, waveSize: settings.waveSize, alreadyNotified });
  if (chosen.length === 0) return 0;

  const now = nowMySqlDateTime();
  const notificationStatements: D1PreparedStatement[] = [];
  const outboxStatements: D1PreparedStatement[] = [];

  for (const { provider, result } of chosen) {
    notificationStatements.push(
      db
        .prepare(
          `INSERT INTO service_notifications (id, user_id, type, title, body, link, entity_type, entity_id, is_read, created_at)
           VALUES (?1, ?2, 'SERVICE_REQUEST_MATCHED', ?3, ?4, ?5, 'service_requests', ?6, 0, ?7)`,
        )
        .bind(
          crypto.randomUUID(), provider.user_id,
          "طلب جديد يناسب خدماتك",
          // Telling the craftsman how few were asked is the whole point of
          // asking few.
          `وجدنا طلباً جديداً مطابقاً لخدماتك، وأُرسل إلى ${chosen.length} مزودين فقط — يمكنك التواصل وتقديم عرضك.`,
          `/service-requests/${requestId}`,
          requestId, now,
        ),
    );

    outboxStatements.push(
      db
        .prepare(
          `INSERT INTO service_outbox_events (id, event_type, payload, status, attempts, created_at)
           VALUES (?1, ?2, ?3, 'pending', 0, ?4)`,
        )
        .bind(
          crypto.randomUUID(),
          "SERVICE_REQUEST_MATCHED",
          JSON.stringify({ requestId, providerId: provider.id, providerUserId: provider.user_id, score: result.score, wave }),
          now,
        ),
    );
  }

  try {
    await db.batch(chosen.map((candidate) => matchStatement(db, requestId, candidate, wave, now)));
  } catch (error) {
    // Same reason as the read above: without migration 0013 there is no `wave`
    // column to write into. Falling back keeps publishing working on an
    // unmigrated host; what is lost is the record of WHICH wave, not the wave.
    console.warn("[services] match wave column missing, writing without it:", error);
    await db.batch(chosen.map((candidate) => matchStatement(db, requestId, candidate, null, now)));
  }

  const customer = String(requestRow.customer_user_id);
  notificationStatements.push(
    db
      .prepare(
        `INSERT INTO service_notifications (id, user_id, type, title, body, link, entity_type, entity_id, is_read, created_at)
         VALUES (?1, ?2, 'SERVICE_REQUEST_MATCHED', ?3, ?4, ?5, 'service_requests', ?6, 0, ?7)`,
      )
      .bind(
        crypto.randomUUID(), customer,
        wave === 1 ? "تم إرسال طلبك" : "تم إرسال طلبك إلى مزودين آخرين",
        `أرسلنا طلبك إلى ${chosen.length} من المزودين الأقرب في هذا التخصص، وسيتواصلون معك.`,
        `/service-requests/${requestId}`,
        requestId, now,
      ),
  );

  await db.batch(notificationStatements);
  await db.batch(outboxStatements);

  return chosen.length;
}

/** One match row. `wave` is null on a database that has no such column yet. */
function matchStatement(
  db: Awaited<ReturnType<typeof getServicesDb>>,
  requestId: string,
  candidate: ScoredCandidate,
  wave: number | null,
  now: string,
): D1PreparedStatement {
  const { provider, result } = candidate;
  const columns = ["id", "request_id", "provider_id", "score", "distance_km", "category_match", "rating_bonus", "urgency_bonus", "budget_fit"];
  const values: unknown[] = [
    crypto.randomUUID(), requestId, provider.id, result.score, result.distanceKm,
    result.categoryMatch ? 1 : 0, result.ratingBonus, result.urgencyBonus, result.budgetFit ? 1 : 0,
  ];
  if (wave != null) {
    columns.push("wave");
    values.push(wave);
  }
  columns.push("created_at");
  values.push(now);

  const insertPlaceholders = values.map((_, index) => `?${index + 1}`).join(", ");
  // The conflict branch refreshes the score of a provider this request already
  // reached; it never moves them to another wave, because they were told once.
  const updateColumns = ["score", "distance_km", "category_match", "rating_bonus", "urgency_bonus", "budget_fit"];
  const updateValues: unknown[] = [
    result.score, result.distanceKm, result.categoryMatch ? 1 : 0, result.ratingBonus, result.urgencyBonus, result.budgetFit ? 1 : 0,
  ];
  const updateAssignments = updateColumns
    .map((column, index) => `${column} = ?${values.length + index + 1}`)
    .join(", ");

  return db
    .prepare(
      `INSERT INTO service_request_matches (${columns.join(", ")})
       VALUES (${insertPlaceholders})
       ON CONFLICT (request_id, provider_id) DO UPDATE SET ${updateAssignments}`,
    )
    .bind(...([...values, ...updateValues] as [unknown, ...unknown[]]));
}

/**
 * The wave knobs for a country, from the admin's settings row.
 *
 * Read here rather than imported from marketplace.ts, which imports this file:
 * the numbers are four integers, and a cycle between the two modules would cost
 * more than reading them.
 */
async function loadWaveSettings(countryCode: string): Promise<WaveSettings> {
  const db = await getServicesDb();
  try {
    const settingsRow = await db
      .prepare(
        `SELECT match_wave_size, max_request_renewals, request_block_days, offer_validity_hours
         FROM service_marketplace_settings WHERE UPPER(country_code) = ?1 LIMIT 1`,
      )
      .bind(String(countryCode || "").toLocaleUpperCase("en"))
      .first<Record<string, unknown>>();
    if (!settingsRow) return DEFAULT_WAVE_SETTINGS;
    const number = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    return {
      waveSize: number(settingsRow.match_wave_size, DEFAULT_WAVE_SETTINGS.waveSize),
      maxRenewals: number(settingsRow.max_request_renewals, DEFAULT_WAVE_SETTINGS.maxRenewals),
      blockDays: number(settingsRow.request_block_days, DEFAULT_WAVE_SETTINGS.blockDays),
      offerValidityHours: number(settingsRow.offer_validity_hours, DEFAULT_WAVE_SETTINGS.offerValidityHours),
    };
  } catch {
    // No settings row, or no such columns yet. The owner's numbers ARE the
    // defaults, so this is the right answer and not a degraded one.
    return DEFAULT_WAVE_SETTINGS;
  }
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
