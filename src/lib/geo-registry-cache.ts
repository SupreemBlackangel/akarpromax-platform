/**
 * One in-flight request per geo level, shared by every component that needs it.
 *
 * Measured on the live home page: 13 API calls, of which 2 were exact
 * duplicates -- the governorate list and the city list, each fetched twice in
 * the same load. GeoContext fetches them to normalise a detected location name
 * ("Mecca Region") into the registry's own code, and LocationCluster fetches
 * the identical list to fill its dropdown. Neither knew about the other.
 *
 * `fetchCountries` in GeoContext already caches, in localStorage. This does the
 * smaller and more important half of that job: two callers asking for the same
 * list at the same moment share one request instead of racing.
 *
 * Deliberately in memory only, and short-lived. The registry is edited by
 * administrators and a stale dropdown that survives a reload would be a worse
 * bug than the duplicate request this removes.
 */

export type GeoLevel = "countries" | "governorates" | "cities" | "districts";

export type GeoRegistryRow = {
  id: string;
  code?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameTr?: string | null;
};

const TTL_MS = 5 * 60 * 1000;

type Entry = { at: number; rows: GeoRegistryRow[] };

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<GeoRegistryRow[]>>();

function keyFor(level: GeoLevel, parentId?: string): string {
  return parentId ? `${level}:${parentId}` : level;
}

async function request(level: GeoLevel, parentId?: string): Promise<GeoRegistryRow[]> {
  const query = new URLSearchParams({ type: level });
  if (parentId) query.set("parentId", parentId);
  const response = await fetch(`/api/geo?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) return [];
  const body = await response.json();
  const rows = Array.isArray(body) ? body : body.data;
  return Array.isArray(rows) ? rows : [];
}

/**
 * Fetch one level of the location registry, sharing the result.
 *
 * Never throws and never rejects: every existing caller answered a failure with
 * an empty list, and changing that here would turn a quiet degradation into an
 * unhandled rejection inside an effect.
 */
export async function fetchGeoLevel(level: GeoLevel, parentId?: string): Promise<GeoRegistryRow[]> {
  const key = keyFor(level, parentId);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = request(level, parentId)
    .then((rows) => {
      // An empty answer is not cached. It is what a failed or not-yet-seeded
      // lookup returns, and caching it would hide the registry filling up.
      if (rows.length > 0) cache.set(key, { at: Date.now(), rows });
      return rows;
    })
    .catch(() => [] as GeoRegistryRow[])
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Drop everything. For an administrator who has just edited the registry. */
export function clearGeoRegistryCache(): void {
  cache.clear();
  inFlight.clear();
}
