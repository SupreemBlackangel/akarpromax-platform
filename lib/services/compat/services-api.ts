/**
 * L1C-0 — `/api/services` compatibility adapter.
 *
 * PURPOSE
 * -------
 * `app/api/services/route.ts` historically owned a SECOND, parallel service
 * request store: it read and wrote the Drizzle/PG model in
 * `lib/db/schemas/services-schema.ts`, whose `service_requests` table collides
 * by name with — but is structurally incompatible with — the canonical
 * marketplace `service_requests` table declared in `lib/services-schema.ts` and
 * extended by `lib/services-marketplace-schema.ts`.
 *
 * That produced the forbidden split of "legacy route writes -> old table" while
 * "new marketplace reads -> new table". This adapter removes the split: the
 * legacy public contract is preserved as a pure response/request mapping on top
 * of the canonical marketplace domain service (`lib/services/marketplace.ts`),
 * which is the single owner of Services persistence.
 *
 * SCOPE: mapping only. No persistence, no SQL, no new tables. All storage goes
 * through the canonical marketplace functions.
 */
import {
  countRequestsFull,
  createRequestFull,
  getRequestFull,
  listRequestsFull,
  publishRequest,
  type ActorContext,
} from "@services/marketplace";
import { REQUEST_STATUS } from "@services/constants";
import { getCurrency } from "@/lib/market/currency-registry";

/**
 * Deterministic validation failures of the compatibility surface. The route
 * maps every one of these to HTTP 400 — never 500.
 */
export const SERVICES_COMPAT_ERRORS = {
  INVALID_BODY: "SERVICES_COMPAT_INVALID_BODY",
  CURRENCY_REQUIRED: "SERVICES_COMPAT_CURRENCY_REQUIRED",
  CURRENCY_UNSUPPORTED: "SERVICES_COMPAT_CURRENCY_UNSUPPORTED",
} as const;

export type ServicesCompatErrorCode = (typeof SERVICES_COMPAT_ERRORS)[keyof typeof SERVICES_COMPAT_ERRORS];

export class ServicesCompatValidationError extends Error {
  readonly code: ServicesCompatErrorCode;

  constructor(code: ServicesCompatErrorCode) {
    super(code);
    this.name = "ServicesCompatValidationError";
    this.code = code;
  }
}

/** Field set of the pre-L1C-0 `/api/services` response rows. */
export type LegacyServiceRequestShape = {
  id: string | null;
  userId: string | null;
  categoryId: string | null;
  title: string | null;
  description: string | null;
  urgency: string | null;
  country: string | null;
  governorate: string | null;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  budget: number | null;
  /** The requester's chosen currency. An amount is never returned bare. */
  currency: string | null;
  preferredDate: string | null;
  status: string | null;
  matchedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LegacyServiceRequestQuery = {
  category?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

export type LegacyServiceRequestInput = {
  categoryId?: unknown;
  title?: unknown;
  description?: unknown;
  urgency?: unknown;
  country?: unknown;
  governorate?: unknown;
  city?: unknown;
  district?: unknown;
  budget?: unknown;
  preferredDate?: unknown;
  currency?: unknown;
};

/** Statuses the legacy collection endpoint may expose to anonymous callers. */
const PUBLIC_REQUEST_STATUSES: string[] = [REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.RECEIVING_OFFERS];

const MAX_PAGE_SIZE = 100;

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function nullableText(value: unknown, maxLength: number): string | null {
  return text(value, maxLength) || null;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

/**
 * Maps a canonical `service_requests` row onto the legacy response shape.
 *
 * Deliberate mapping decisions (documented compatibility mapper):
 * - `governorate` <-> canonical `short_address` (the canonical model has no
 *   governorate column; the legacy value round-trips through `short_address`).
 * - `budget` <-> canonical `budget_max` (legacy carried a single budget scalar),
 *   always returned together with `currency`.
 * - `radius` has no canonical counterpart and is always `null`.
 * - `userId`, `latitude`, `longitude` are redacted for public (unauthenticated)
 *   listing, exactly as the canonical `/api/service-requests` route does. The
 *   legacy route leaked them; preserving that leak is not compatibility.
 */
export function toLegacyServiceRequestShape(
  row: Record<string, unknown>,
  options: { includePrivate?: boolean } = {},
): LegacyServiceRequestShape {
  const includePrivate = options.includePrivate === true;
  return {
    id: stringOrNull(row.id),
    userId: includePrivate ? stringOrNull(row.customer_user_id) : null,
    categoryId: stringOrNull(row.category_id),
    title: stringOrNull(row.title),
    description: stringOrNull(row.description),
    urgency: stringOrNull(row.urgency),
    country: stringOrNull(row.country_code),
    governorate: stringOrNull(row.short_address),
    city: stringOrNull(row.city_id),
    district: stringOrNull(row.district_id),
    latitude: includePrivate ? numberOrNull(row.latitude) : null,
    longitude: includePrivate ? numberOrNull(row.longitude) : null,
    radius: null,
    budget: numberOrNull(row.budget_max),
    currency: stringOrNull(row.currency),
    preferredDate: stringOrNull(row.preferred_date),
    status: stringOrNull(row.status),
    matchedAt: stringOrNull(row.matched_at),
    completedAt: stringOrNull(row.completed_at),
    createdAt: stringOrNull(row.created_at),
    updatedAt: stringOrNull(row.updated_at),
  };
}

/**
 * Legacy `GET /api/services` — canonical read.
 *
 * Filtering, free-text search over the request title, ordering and pagination
 * all execute inside the canonical marketplace query surface
 * (`listRequestsFull` / `countRequestsFull`), so the reported `total` is exact
 * and paging is not capped by an in-memory window.
 */
export async function listLegacyServiceRequests(
  query: LegacyServiceRequestQuery = {},
): Promise<{ data: LegacyServiceRequestShape[]; page: number; limit: number; total: number }> {
  const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
  const limitRaw = Number.isInteger(query.limit) && (query.limit as number) > 0 ? (query.limit as number) : 20;
  const limit = Math.min(limitRaw, MAX_PAGE_SIZE);

  const filter = {
    categoryId: nullableText(query.category, 80) ?? undefined,
    search: nullableText(query.search, 200) ?? undefined,
    statuses: PUBLIC_REQUEST_STATUSES,
  };

  const [rows, total] = await Promise.all([
    listRequestsFull({ ...filter, limit, offset: (page - 1) * limit }),
    countRequestsFull(filter),
  ]);

  return { data: rows.map((row) => toLegacyServiceRequestShape(row)), page, limit, total };
}

/**
 * Legacy `POST /api/services` — canonical write.
 *
 * Creates the request through the canonical marketplace lifecycle
 * (`createRequestFull` -> `publishRequest`) so that history, matching and
 * audit all run exactly as they do for `/api/service-requests`. The legacy
 * contract returned an already-published request, which is why publish is
 * invoked here rather than left to a second call.
 */
export async function createLegacyServiceRequest(
  customerUserId: string,
  input: LegacyServiceRequestInput,
  actor?: ActorContext,
): Promise<LegacyServiceRequestShape | null> {
  const categoryId = text(input.categoryId, 80);
  const countryCode = text(input.country, 8);
  const cityId = text(input.city, 100);
  if (!categoryId || !countryCode || !cityId) {
    throw new ServicesCompatValidationError(SERVICES_COMPAT_ERRORS.INVALID_BODY);
  }

  // CURRENCY POLICY (binding): there is no global currency default, no OMR or
  // SAR fallback and no automatic substitution. The requester chooses the
  // currency; the original amount + currency code is the source of truth. The
  // code is normalised to upper case and validated against the single canonical
  // registry (lib/market/currency-registry.ts) — Services declares no currency
  // list of its own. A missing or unknown code is rejected deterministically.
  const requestedCurrency = text(input.currency, 8);
  if (!requestedCurrency) {
    throw new ServicesCompatValidationError(SERVICES_COMPAT_ERRORS.CURRENCY_REQUIRED);
  }
  const currency = getCurrency(requestedCurrency);
  if (!currency) {
    throw new ServicesCompatValidationError(SERVICES_COMPAT_ERRORS.CURRENCY_UNSUPPORTED);
  }

  const id = await createRequestFull(
    {
      customerUserId,
      categoryId,
      countryCode,
      cityId,
      districtId: nullableText(input.district, 100),
      title: nullableText(input.title, 300),
      description: nullableText(input.description, 4000),
      urgency: nullableText(input.urgency, 24) ?? "normal",
      shortAddress: nullableText(input.governorate, 300),
      budgetMin: null,
      budgetMax: numberOrNull(input.budget),
      currency: currency.code,
      preferredDate: nullableText(input.preferredDate, 40),
    },
    actor,
  );
  await publishRequest(id, actor);
  const created = await getRequestFull(id);
  return created ? toLegacyServiceRequestShape(created, { includePrivate: true }) : null;
}
