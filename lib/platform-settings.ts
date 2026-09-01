import { getRuntimeDb } from "@/lib/runtime-db";

/**
 * Platform-wide admin-editable settings, stored as one JSON document in the
 * runtime store. Defaults apply for anything not explicitly set, so the
 * platform works before the admin ever opens the settings page.
 */

export type AdPricingSettings = {
  currency: string;
  /** Price per click, in `currency`. 0 = CPC billing disabled. */
  cpc: number;
  /** Fixed monthly price per canonical placement, in `currency`. */
  monthly: Record<string, number>;
};

export type PlatformSettings = {
  /** Platform commission on completed service jobs, percent. */
  serviceCommissionPercent: number;
  adPricing: AdPricingSettings;
};

export const AD_PLACEMENT_KEYS = ["HERO", "LEFT_01", "LEFT_02", "RIGHT_01", "RIGHT_02", "BOTTOM_01", "BOTTOM_02", "BOTTOM_03"] as const;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  serviceCommissionPercent: 2.5,
  adPricing: {
    currency: "SAR",
    cpc: 0,
    monthly: Object.fromEntries(AD_PLACEMENT_KEYS.map((key) => [key, 0])),
  },
};

const SETTINGS_KEY = "platform_settings";

async function ensureTable(db: Awaited<ReturnType<typeof getRuntimeDb>>): Promise<void> {
  await db.prepare("CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)").run();
}

function mergeSettings(raw: unknown): PlatformSettings {
  const base = structuredClone(DEFAULT_PLATFORM_SETTINGS);
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<PlatformSettings>;
  const percent = Number(input.serviceCommissionPercent);
  if (Number.isFinite(percent) && percent >= 0 && percent <= 100) base.serviceCommissionPercent = percent;
  const pricing = input.adPricing;
  if (pricing && typeof pricing === "object") {
    if (typeof pricing.currency === "string" && /^[A-Z]{3}$/.test(pricing.currency)) base.adPricing.currency = pricing.currency;
    const cpc = Number(pricing.cpc);
    if (Number.isFinite(cpc) && cpc >= 0) base.adPricing.cpc = cpc;
    if (pricing.monthly && typeof pricing.monthly === "object") {
      for (const key of AD_PLACEMENT_KEYS) {
        const value = Number((pricing.monthly as Record<string, unknown>)[key]);
        if (Number.isFinite(value) && value >= 0) base.adPricing.monthly[key] = value;
      }
    }
  }
  return base;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = await getRuntimeDb();
  await ensureTable(db);
  const row = await db.prepare("SELECT value FROM platform_settings WHERE key = ?1 LIMIT 1").bind(SETTINGS_KEY).first<{ value: string }>();
  if (!row?.value) return structuredClone(DEFAULT_PLATFORM_SETTINGS);
  try {
    return mergeSettings(JSON.parse(row.value));
  } catch {
    return structuredClone(DEFAULT_PLATFORM_SETTINGS);
  }
}

export async function updatePlatformSettings(patch: unknown): Promise<PlatformSettings> {
  const db = await getRuntimeDb();
  await ensureTable(db);
  const current = await getPlatformSettings();
  const merged = mergeSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}), adPricing: { ...current.adPricing, ...((patch as Partial<PlatformSettings>)?.adPricing ?? {}), monthly: { ...current.adPricing.monthly, ...(((patch as Partial<PlatformSettings>)?.adPricing?.monthly) ?? {}) } } });
  await db
    .prepare("INSERT INTO platform_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP")
    .bind(SETTINGS_KEY, JSON.stringify(merged))
    .run();
  return merged;
}
