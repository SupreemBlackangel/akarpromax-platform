const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function currentHourDecimal(now: Date): number {
  return now.getHours() + now.getMinutes() / 60;
}

export function currentDayOfWeek(now: Date): number {
  return now.getDay();
}

export function statDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function frequencyWindowSince(period: string, now: Date): string {
  const date = new Date(now.getTime());
  switch (period) {
    case "session":
      return "0000-01-01 00:00:00";
    case "day": {
      date.setHours(0, 0, 0, 0);
      return formatDateTime(date);
    }
    case "week":
      date.setDate(date.getDate() - 7);
      return formatDateTime(date);
    case "month":
      date.setDate(date.getDate() - 30);
      return formatDateTime(date);
    default:
      return "0000-01-01 00:00:00";
  }
}

export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Normalize any campaign start/end input into the exact string format the
 * engine compares against.
 *
 * `start_at`/`end_at` are TEXT columns compared **lexicographically** against
 * `formatDateTime(now)` ("2026-09-02 18:52:45"). Three writers previously fed
 * three different formats into the same column:
 *
 *   - the admin form wrote "2026-09-02 14:00:00"        -> correct
 *   - the public ad request wrote "2026-09-02T00:00:00.000Z"
 *     'T' (0x54) sorts above ' ' (0x20), so the row never compared as started
 *     -> campaigns went live a day late
 *   - the advertisers admin wrote a bare "2026-09-02"
 *     shorter string sorts lower, so end_at compared as already past
 *     -> campaigns died a day early
 *
 * `boundary` decides how a date-only value is widened: "start" anchors to the
 * beginning of that day, "end" to its final second, so a date range is
 * inclusive of both endpoints.
 */
export function normalizeCampaignBoundary(value: string | null | undefined, boundary: "start" | "end"): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Already in the engine's format.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return raw;

  // Date only — widen to the requested edge of that day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} ${boundary === "start" ? "00:00:00" : "23:59:59"}`;
  }

  // ISO (with or without a zone). Compare in the same local frame the engine
  // uses, so a stored instant and "now" are measured the same way.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return formatDateTime(parsed);

  return null;
}
