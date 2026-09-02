/**
 * Bounded numeric input for the services marketplace.
 *
 * Every route parsed numbers with a local copy of:
 *
 *     const n = Number(value);
 *     return Number.isFinite(n) ? n : null;
 *
 * which accepts anything that is not NaN or Infinity. No layer below it bounded
 * the result either -- not the domain functions, not the columns -- so whatever
 * a client sent was stored and then used as if it were real.
 *
 * Two of those reached logic that decides who sees what:
 *
 *   - `service_radius_km` is compared against the haversine distance in
 *     `computeMatchScore`. A provider posting a radius of 1e12 passes that check
 *     for every request in the country, so they are matched to all of them and
 *     crowd out the providers who described their coverage honestly. Nothing in
 *     the request path stopped it: the profile is the provider's own to write.
 *
 *   - `latitude` / `longitude` feed the same distance. The public search path
 *     already refused out-of-range values (`latitude < -90 || latitude > 90`),
 *     but the write path that stores them did not, so the check guarded the
 *     query and not the data.
 *
 * Money is bounded for a plainer reason: a negative price is not an offer.
 */

export type NumberBounds = {
  min?: number;
  max?: number;
  /** Reject values with more precision than the field can mean. */
  integer?: boolean;
};

/**
 * Parse a number and keep it only if it falls inside `bounds`.
 *
 * Out-of-range is treated as absent rather than clamped: clamping invents a
 * value the client never sent, and a provider who typed their radius wrong
 * should get the default coverage, not silently get the maximum.
 */
export function boundedNumber(value: unknown, bounds: NumberBounds = {}): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (bounds.integer && !Number.isInteger(n)) return null;
  if (bounds.min != null && n < bounds.min) return null;
  if (bounds.max != null && n > bounds.max) return null;
  return n;
}

/** WGS84 degrees. Anything outside is not a place. */
export const LATITUDE = { min: -90, max: 90 } as const;
export const LONGITUDE = { min: -180, max: 180 } as const;

/**
 * How far a provider will travel. The upper bound is deliberately generous --
 * larger than any country the platform serves end to end -- because the point
 * is to exclude values that are not distances, not to second-guess coverage.
 */
export const SERVICE_RADIUS_KM = { min: 1, max: 2000 } as const;

/**
 * Money. The ceiling is high enough for any real construction quote and low
 * enough that a value above it is a mistake or an attack, and the floor rules
 * out negatives, which would subtract from a total.
 */
export const MONEY = { min: 0, max: 100_000_000 } as const;

/** Whole days of work. */
export const DURATION_DAYS = { min: 0, max: 3650, integer: true } as const;

/** A founding year that could belong to a business that exists. */
export const FOUNDED_YEAR = { min: 1800, max: 2200, integer: true } as const;

/** People. */
export const TEAM_SIZE = { min: 0, max: 1_000_000, integer: true } as const;

/**
 * A declared attachment size, in bytes.
 *
 * This is what the client says the file is, not what it measured, so the bound
 * is about keeping a nonsense number out of the row and off the screen -- it is
 * not a check that the upload is that size.
 */
export const FILE_SIZE_BYTES = { min: 0, max: 1_000_000_000, integer: true } as const;
