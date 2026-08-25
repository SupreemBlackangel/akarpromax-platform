import { getIntegrationDb } from "@/lib/integration/db";
import { toUtcEpochMs } from "@/lib/integration/pairing";

/**
 * `sponsor_subscriptions.status` is a plain TEXT column — the schema defines no
 * enum and no CHECK constraint, only the DEFAULT 'trial'. This is the smallest
 * set the reader below actually distinguishes:
 *
 *   trial     — grants access, reported to the desktop as isTrial
 *   active    — grants access
 *   expired   — explicitly ended, regardless of end_date
 *   suspended — withheld by an administrator, dates untouched
 *   cancelled — terminated by an administrator, dates untouched
 *
 * Anything outside this set is still read correctly (it simply does not grant
 * access), so existing rows written by other tooling are never misinterpreted.
 */
export const OFFICE_SUBSCRIPTION_STATUSES = ["trial", "active", "expired", "suspended", "cancelled"] as const;
export type OfficeSubscriptionStatus = (typeof OFFICE_SUBSCRIPTION_STATUSES)[number];

/** Statuses that keep a device working while the dates are still in range. */
export const OFFICE_SUBSCRIPTION_GRANTING_STATUSES: readonly OfficeSubscriptionStatus[] = ["trial", "active"];

export type OfficeSubscriptionRecord = {
  id: string;
  sponsorId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export class SubscriptionWriteError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "SubscriptionWriteError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Desktop subscription contract.
 *
 * This is the exact shape the Office desktop client consumes from
 * GET /api/office/v1/subscription. It carries no credential, no token and
 * no sponsor identifier.
 */
export type OfficeSubscriptionSnapshot = {
  ok: true;
  isActive: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining: number | null;
  expiryDate: string | null;
  renewalUrl: string | null;
  statusMessage: string | null;
  checkedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `renewalUrl` has no canonical source in this repository yet: there is no
 * billing / pricing / subscription page under app/ and no configured renewal
 * endpoint. Returning null is deliberate — inventing a URL here would send
 * paying offices to a page that does not exist.
 */
function resolveRenewalUrl(): string | null {
  return null;
}

function emptySnapshot(checkedAt: string): OfficeSubscriptionSnapshot {
  return {
    ok: true,
    isActive: false,
    isExpired: false,
    isTrial: false,
    daysRemaining: null,
    expiryDate: null,
    renewalUrl: resolveRenewalUrl(),
    statusMessage: "NO_SUBSCRIPTION",
    checkedAt,
  };
}

/**
 * Canonical subscription snapshot for one paired office device.
 *
 * Source of truth: the `sponsor_subscriptions` row for the `sponsor_id` that
 * was recorded on `office_devices` at pairing time. Nothing is synthesised —
 * when the sponsor has no subscription row the snapshot reports "not active"
 * rather than assuming a trial or an active licence, and an unparseable end
 * date fails closed as expired.
 */
export async function getSponsorSubscriptionSnapshot(
  sponsorId: string,
  now: number = Date.now(),
): Promise<OfficeSubscriptionSnapshot> {
  const checkedAt = new Date(now).toISOString();
  if (!sponsorId) return emptySnapshot(checkedAt);

  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM sponsor_subscriptions WHERE sponsor_id = ?1 ORDER BY end_date DESC LIMIT 1")
    .bind(sponsorId)
    .first<Record<string, unknown>>();
  if (!row) return emptySnapshot(checkedAt);

  const status = String(row.status ?? "").trim().toLowerCase();
  const startMs = toUtcEpochMs(row.start_date);
  const endMs = toUtcEpochMs(row.end_date);

  const pastEnd = endMs === null ? true : endMs <= now;
  const notStarted = startMs !== null && startMs > now;
  const grantsAccess = status === "active" || status === "trial";

  const isExpired = pastEnd || status === "expired";
  const isActive = grantsAccess && !pastEnd && !notStarted;
  const isTrial = status === "trial" && isActive;
  const daysRemaining = endMs === null ? null : Math.max(0, Math.ceil((endMs - now) / DAY_MS));
  const expiryDate = endMs === null ? null : new Date(endMs).toISOString();

  let statusMessage: string;
  if (isExpired) statusMessage = "EXPIRED";
  else if (notStarted) statusMessage = "NOT_STARTED";
  else if (isTrial) statusMessage = "TRIAL";
  else if (isActive) statusMessage = "ACTIVE";
  else statusMessage = status ? status.toUpperCase() : "UNKNOWN";

  return {
    ok: true,
    isActive,
    isExpired,
    isTrial,
    daysRemaining,
    expiryDate,
    renewalUrl: resolveRenewalUrl(),
    statusMessage,
    checkedAt,
  };
}

// ---------------------------------------------------------------------------
// Admin writer
//
// IMPORTANT — sponsor identity. Throughout the Office integration,
// `office_devices.sponsor_id` is the *administrator's email*, written by
// app/api/office/v1/pairing/route.ts as `identity.email` when a pairing code is
// issued. It is NOT a row id in the `sponsors` table. Subscriptions must
// therefore be keyed on the same value, otherwise a paired device would never
// see the subscription that was written for it.
// ---------------------------------------------------------------------------

function nowSqlIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function isOfficeSubscriptionStatus(value: unknown): value is OfficeSubscriptionStatus {
  return (OFFICE_SUBSCRIPTION_STATUSES as readonly string[]).includes(String(value ?? "").trim().toLowerCase());
}

/**
 * Accepts `YYYY-MM-DD` or any parseable timestamp and normalises to the
 * `YYYY-MM-DD` form the schema stores. Returns null when unparseable.
 */
export function normalizeSubscriptionDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
  const ms = toUtcEpochMs(raw);
  if (ms === null) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function rowToRecord(row: Record<string, unknown>): OfficeSubscriptionRecord {
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    planId: row.plan_id == null ? "" : String(row.plan_id),
    status: String(row.status ?? ""),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    autoRenew: Number(row.auto_renew ?? 0) !== 0,
    createdAt: row.created_at == null ? null : String(row.created_at),
    updatedAt: row.updated_at == null ? null : String(row.updated_at),
  };
}

/**
 * True when this sponsor id is one the Office integration actually knows: it
 * has at least one paired device or at least one issued pairing code. Writing a
 * subscription for anything else would be invisible to every device.
 */
export async function officeSponsorExists(sponsorId: string): Promise<boolean> {
  const id = String(sponsorId ?? "").trim();
  if (!id) return false;
  const db = await getIntegrationDb();
  const device = await db
    .prepare("SELECT id FROM office_devices WHERE sponsor_id = ?1 LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();
  if (device) return true;
  const code = await db
    .prepare("SELECT id FROM office_pairing_codes WHERE sponsor_id = ?1 LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();
  return Boolean(code);
}

/** The single subscription row for a sponsor, or null. */
export async function getSponsorSubscriptionRecord(sponsorId: string): Promise<OfficeSubscriptionRecord | null> {
  const id = String(sponsorId ?? "").trim();
  if (!id) return null;
  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM sponsor_subscriptions WHERE sponsor_id = ?1 ORDER BY end_date DESC LIMIT 1")
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? rowToRecord(row) : null;
}

type SubscriptionWriteInput = {
  sponsorId: string;
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  planId?: unknown;
  createdBy?: string | null;
};

type ValidatedWrite = {
  sponsorId: string;
  status: OfficeSubscriptionStatus;
  startDate: string;
  endDate: string;
  planId: string;
};

async function validatePlan(planId: unknown): Promise<string> {
  const raw = String(planId ?? "").trim();
  // `sponsor_plans` has no writer or seed anywhere in this repository and the
  // desktop subscription reader does not consume plan data, so a plan is
  // optional. When one IS supplied it must exist.
  if (!raw) return "";
  const db = await getIntegrationDb();
  const plan = await db
    .prepare("SELECT id FROM sponsor_plans WHERE id = ?1 LIMIT 1")
    .bind(raw)
    .first<Record<string, unknown>>();
  if (!plan) throw new SubscriptionWriteError("INVALID_PLAN", 400, "plan does not exist");
  return raw;
}

async function validate(input: SubscriptionWriteInput, existing: OfficeSubscriptionRecord | null): Promise<ValidatedWrite> {
  const sponsorId = String(input.sponsorId ?? "").trim();
  if (!sponsorId) throw new SubscriptionWriteError("SPONSOR_REQUIRED", 400, "sponsorId is required");
  if (!(await officeSponsorExists(sponsorId))) {
    throw new SubscriptionWriteError("SPONSOR_NOT_FOUND", 404, "no paired office device or pairing code for this sponsor");
  }

  const rawStatus = input.status === undefined ? (existing?.status ?? "trial") : input.status;
  if (!isOfficeSubscriptionStatus(rawStatus)) {
    throw new SubscriptionWriteError("INVALID_STATUS", 400, `status must be one of ${OFFICE_SUBSCRIPTION_STATUSES.join(", ")}`);
  }
  const status = String(rawStatus).trim().toLowerCase() as OfficeSubscriptionStatus;

  const startSource = input.startDate === undefined ? existing?.startDate : input.startDate;
  const endSource = input.endDate === undefined ? existing?.endDate : input.endDate;
  const startDate = normalizeSubscriptionDate(startSource);
  const endDate = normalizeSubscriptionDate(endSource);
  if (!startDate) throw new SubscriptionWriteError("INVALID_START_DATE", 400, "startDate must be YYYY-MM-DD");
  if (!endDate) throw new SubscriptionWriteError("INVALID_END_DATE", 400, "endDate must be YYYY-MM-DD");
  if (endDate <= startDate) {
    throw new SubscriptionWriteError("INVALID_DATE_RANGE", 400, "endDate must be after startDate");
  }

  const planId = input.planId === undefined ? (existing?.planId ?? "") : await validatePlan(input.planId);
  return { sponsorId, status, startDate, endDate, planId };
}

/**
 * Creates the subscription for a sponsor that does not have one yet.
 * Refuses when a row already exists — one subscription row per sponsor is the
 * invariant the desktop reader depends on.
 */
export async function createSponsorSubscription(input: SubscriptionWriteInput): Promise<OfficeSubscriptionRecord> {
  const existing = await getSponsorSubscriptionRecord(String(input.sponsorId ?? "").trim());
  if (existing) {
    throw new SubscriptionWriteError("SUBSCRIPTION_EXISTS", 409, "this sponsor already has a subscription; update it instead");
  }
  const write = await validate(input, null);
  const db = await getIntegrationDb();
  const now = nowSqlIso();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO sponsor_subscriptions
        (id, sponsor_id, plan_id, start_date, end_date, status, auto_renew, created_by, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(id, write.sponsorId, write.planId, write.startDate, write.endDate, write.status, 1, input.createdBy ?? null, now, now)
    .run();
  const created = await getSponsorSubscriptionRecord(write.sponsorId);
  if (!created) throw new SubscriptionWriteError("WRITE_FAILED", 500, "subscription row was not persisted");
  return created;
}

/**
 * Updates the existing subscription for a sponsor. Only the fields present in
 * the input change; everything else is carried over from the stored row, so a
 * status-only change never silently rewrites the dates.
 */
export async function updateSponsorSubscription(input: SubscriptionWriteInput): Promise<OfficeSubscriptionRecord> {
  const sponsorId = String(input.sponsorId ?? "").trim();
  if (!sponsorId) throw new SubscriptionWriteError("SPONSOR_REQUIRED", 400, "sponsorId is required");
  const existing = await getSponsorSubscriptionRecord(sponsorId);
  if (!existing) {
    throw new SubscriptionWriteError("SUBSCRIPTION_NOT_FOUND", 404, "this sponsor has no subscription to update");
  }
  const write = await validate(input, existing);
  const db = await getIntegrationDb();
  await db
    .prepare(
      `UPDATE sponsor_subscriptions
         SET plan_id = ?1, start_date = ?2, end_date = ?3, status = ?4, updated_at = ?5
       WHERE id = ?6`,
    )
    .bind(write.planId, write.startDate, write.endDate, write.status, nowSqlIso(), existing.id)
    .run();
  const updated = await getSponsorSubscriptionRecord(sponsorId);
  if (!updated) throw new SubscriptionWriteError("WRITE_FAILED", 500, "subscription row disappeared during update");
  return updated;
}

export type OfficeSubscriptionOverviewRow = {
  sponsorId: string;
  officeId: string | null;
  officeName: string | null;
  deviceCount: number;
  activeDeviceCount: number;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  statusMessage: string | null;
};

/**
 * One row per sponsor that the Office integration knows about, with its current
 * subscription. Carries no device id, no credential and no token — only the
 * non-secret device columns needed to label the row.
 */
export async function listOfficeSubscriptionOverview(now: number = Date.now()): Promise<OfficeSubscriptionOverviewRow[]> {
  const db = await getIntegrationDb();
  const devices = await db
    .prepare("SELECT sponsor_id, office_id, device_name, status FROM office_devices ORDER BY sponsor_id ASC")
    .bind()
    .all<Record<string, unknown>>();

  const bySponsor = new Map<string, { officeId: string | null; officeName: string | null; total: number; active: number }>();
  for (const device of devices.results ?? []) {
    const sponsorId = String(device.sponsor_id ?? "").trim();
    if (!sponsorId) continue;
    const entry = bySponsor.get(sponsorId) ?? { officeId: null, officeName: null, total: 0, active: 0 };
    entry.total += 1;
    if (String(device.status ?? "") === "active") entry.active += 1;
    if (!entry.officeId && device.office_id) entry.officeId = String(device.office_id);
    if (!entry.officeName && device.device_name) entry.officeName = String(device.device_name);
    bySponsor.set(sponsorId, entry);
  }

  const rows: OfficeSubscriptionOverviewRow[] = [];
  for (const [sponsorId, entry] of bySponsor) {
    const record = await getSponsorSubscriptionRecord(sponsorId);
    const snapshot = await getSponsorSubscriptionSnapshot(sponsorId, now);
    rows.push({
      sponsorId,
      officeId: entry.officeId,
      officeName: entry.officeName,
      deviceCount: entry.total,
      activeDeviceCount: entry.active,
      status: record?.status ?? null,
      startDate: record?.startDate ?? null,
      endDate: record?.endDate ?? null,
      isActive: snapshot.isActive,
      isExpired: snapshot.isExpired,
      daysRemaining: snapshot.daysRemaining,
      statusMessage: snapshot.statusMessage,
    });
  }
  return rows.sort((a, b) => a.sponsorId.localeCompare(b.sponsorId));
}
