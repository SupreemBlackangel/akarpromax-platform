import { getRuntimeDb } from "@/lib/runtime-db";
import { DEFAULT_DISPLAY_SETTINGS, type DisplaySettings } from "@/src/config/display-settings";

export * from "@/src/config/display-settings";

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
  display: DisplaySettings;
};

export const AD_PLACEMENT_KEYS = ["HERO", "LEFT_01", "LEFT_02", "RIGHT_01", "RIGHT_02", "BOTTOM_01", "BOTTOM_02", "BOTTOM_03"] as const;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  serviceCommissionPercent: 2.5,
  adPricing: {
    currency: "SAR",
    cpc: 0,
    monthly: Object.fromEntries(AD_PLACEMENT_KEYS.map((key) => [key, 0])),
  },
  display: structuredClone(DEFAULT_DISPLAY_SETTINGS),
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
  mergeDisplay(base.display, (input as { display?: unknown }).display);
  return base;
}

function mergeDisplay(base: DisplaySettings, raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  for (const device of ["desktop", "mobile"] as const) {
    const patch = (raw as Record<string, unknown>)[device];
    if (!patch || typeof patch !== "object") continue;
    const target = base[device];
    const source = patch as Record<string, unknown>;

    const ads = source.ads;
    if (ads && typeof ads === "object") {
      for (const band of ["hero", "side", "bottom"] as const) {
        const value = (ads as Record<string, unknown>)[band];
        if (typeof value === "boolean") target.ads[band] = value;
      }
    }
    if (source.themeMode === "system" || source.themeMode === "light" || source.themeMode === "dark") {
      target.themeMode = source.themeMode;
    }
    if (source.listingLayout === "grid" || source.listingLayout === "list") target.listingLayout = source.listingLayout;
    const columns = Number(source.listingColumns);
    if (columns === 1 || columns === 2 || columns === 3 || columns === 4) target.listingColumns = columns;
    if (source.density === "comfortable" || source.density === "compact") target.density = source.density;
    for (const flag of ["allowThemeChange", "showSidebar", "showNewsTicker", "showOfficePromo"] as const) {
      if (typeof source[flag] === "boolean") target[flag] = source[flag] as boolean;
    }
  }
}

/**
 * Short-lived process memo. The root layout reads these settings on every page
 * render to decide the presentation; without this that is two queries per
 * request for a document that changes a few times a year.
 */
let cache: { value: PlatformSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && cache.expiresAt > Date.now()) return structuredClone(cache.value);
  const settings = await readPlatformSettings();
  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return structuredClone(settings);
}

async function readPlatformSettings(): Promise<PlatformSettings> {
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
  const current = await readPlatformSettings();
  const input = (patch && typeof patch === "object" ? patch : {}) as Partial<PlatformSettings>;
  // Every section is merged onto the CURRENT value, not onto the defaults: a
  // PATCH that carries only one section must not reset the others.
  const merged = mergeSettings({
    ...current,
    ...input,
    adPricing: {
      ...current.adPricing,
      ...(input.adPricing ?? {}),
      monthly: { ...current.adPricing.monthly, ...(input.adPricing?.monthly ?? {}) },
    },
    display: {
      desktop: { ...current.display.desktop, ...(input.display?.desktop ?? {}), ads: { ...current.display.desktop.ads, ...(input.display?.desktop?.ads ?? {}) } },
      mobile: { ...current.display.mobile, ...(input.display?.mobile ?? {}), ads: { ...current.display.mobile.ads, ...(input.display?.mobile?.ads ?? {}) } },
    },
  });
  await db
    .prepare("INSERT INTO platform_settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP")
    .bind(SETTINGS_KEY, JSON.stringify(merged))
    .run();
  cache = { value: merged, expiresAt: Date.now() + CACHE_TTL_MS };
  return merged;
}
