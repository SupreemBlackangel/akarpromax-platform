/**
 * Pure request/response contract for GET /api/geo (L1A).
 *
 * The route handler is a thin adapter over this module so the contract can be
 * unit-tested without Next.js, without a database, and without a live server.
 *
 * BINDING RULES:
 *  - A database failure must NEVER be reported as HTTP 200. It surfaces as 503
 *    (dependency unavailable), and no fallback data is substituted.
 *  - A public error response must NEVER disclose internals: no column names, no
 *    SQL, no PostgreSQL text, no connection string, no host name, no exception
 *    message. The public body carries a fixed error code and a fixed, safe
 *    message only.
 *  - The complete original error is still handed back to the caller out-of-band
 *    (`GeoResponse.internal`) so the route can log it server-side in full.
 *  - There is no Oman-only — or any other country-only — fallback list.
 *  - Country rows carry ar/en/tr names so the existing UI can present all three
 *    core locales without a redesign.
 */

export type GeoEntityType = "countries" | "governorates" | "cities" | "districts" | "streets";

export const GEO_ENTITY_TYPES: readonly GeoEntityType[] = Object.freeze([
  "countries",
  "governorates",
  "cities",
  "districts",
  "streets",
]);

const PARENT_LABEL: Record<Exclude<GeoEntityType, "countries">, string> = {
  governorates: "countryId",
  cities: "governorateId",
  districts: "cityId",
  streets: "districtId",
};

export type GeoNameFields = {
  nameAr: string;
  nameEn: string;
  nameTr: string | null;
};

export type GeoCountryRow = GeoNameFields & {
  id: string;
  code: string;
  phoneCode?: string | null;
  currencyCode?: string | null;
  flagEmoji?: string | null;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  defaultZoom?: number | null;
  publicationsEnabled?: boolean | null;
  measurementSystem?: string | null;
  displayOrder?: number | null;
};

export type GeoChildRow = GeoNameFields & {
  id: string;
  code?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  displayOrder?: number | null;
};

export interface GeoProvider {
  getCountries(): Promise<GeoCountryRow[]>;
  getGovernorates(countryId: string): Promise<GeoChildRow[]>;
  getCities(governorateId: string): Promise<GeoChildRow[]>;
  getDistricts(cityId: string): Promise<GeoChildRow[]>;
  getStreets(districtId: string): Promise<GeoChildRow[]>;
}

export type GeoErrorCode =
  | "GEO_UNKNOWN_TYPE"
  | "GEO_PARENT_REQUIRED"
  | "GEO_BACKEND_UNAVAILABLE";

/**
 * Fixed public messages. These are constants, never interpolated with runtime
 * values, so no internal detail can reach a client through them.
 */
export const GEO_PUBLIC_MESSAGES: Readonly<Record<GeoErrorCode, { ar: string; en: string }>> =
  Object.freeze({
    GEO_UNKNOWN_TYPE: Object.freeze({
      ar: "نوع البيانات الجغرافية المطلوب غير معروف.",
      en: "Unknown geo data type requested.",
    }),
    GEO_PARENT_REQUIRED: Object.freeze({
      ar: "المعرّف الأصل مطلوب لهذا النوع من البيانات الجغرافية.",
      en: "A parent identifier is required for this geo data type.",
    }),
    GEO_BACKEND_UNAVAILABLE: Object.freeze({
      ar: "تعذّر جلب البيانات الجغرافية حالياً. يرجى المحاولة لاحقاً.",
      en: "Geo data is temporarily unavailable. Please try again later.",
    }),
  });

export type GeoSuccessBody = {
  success: true;
  type: GeoEntityType;
  count: number;
  data: Array<GeoCountryRow | GeoChildRow>;
};

export type GeoErrorBody = {
  success: false;
  error: GeoErrorCode;
  message: string;
  messageEn: string;
};

export type GeoResponse = {
  status: number;
  /** Safe to serialise to the client verbatim. */
  body: GeoSuccessBody | GeoErrorBody;
  /**
   * Server-side only. Never serialised into `body`; the route logs it.
   * Present only when an underlying call threw.
   */
  internal?: { code: GeoErrorCode; type: GeoEntityType | null; cause: unknown };
};

export function isGeoEntityType(value: string | null | undefined): value is GeoEntityType {
  return !!value && (GEO_ENTITY_TYPES as readonly string[]).includes(value);
}

function fail(status: number, error: GeoErrorCode): GeoResponse {
  const message = GEO_PUBLIC_MESSAGES[error];
  return { status, body: { success: false, error, message: message.ar, messageEn: message.en } };
}

/**
 * Resolves a geo request against a provider.
 *
 * Never throws: every outcome is an explicit status + structured body.
 */
export async function resolveGeoRequest(
  params: { type?: string | null; parentId?: string | null },
  provider: GeoProvider,
): Promise<GeoResponse> {
  const type = params.type ?? null;

  if (!isGeoEntityType(type)) {
    return fail(400, "GEO_UNKNOWN_TYPE");
  }

  const parentId = params.parentId?.trim() || null;
  if (type !== "countries" && !parentId) {
    // The parent field name is intentionally not echoed into the body; it is
    // documented API surface, not a runtime value, and keeping the message
    // constant guarantees nothing dynamic can leak here later.
    return fail(400, "GEO_PARENT_REQUIRED");
  }

  try {
    let data: Array<GeoCountryRow | GeoChildRow>;
    switch (type) {
      case "countries":
        data = await provider.getCountries();
        break;
      case "governorates":
        data = await provider.getGovernorates(parentId as string);
        break;
      case "cities":
        data = await provider.getCities(parentId as string);
        break;
      case "districts":
        data = await provider.getDistricts(parentId as string);
        break;
      case "streets":
        data = await provider.getStreets(parentId as string);
        break;
    }

    const rows = Array.isArray(data) ? data : [];
    return { status: 200, body: { success: true, type, count: rows.length, data: rows } };
  } catch (cause) {
    // A backend failure is a real failure. It is never masked as an empty 200
    // response, never replaced with a hard-coded country list, and never
    // described to the client. The full error goes to the server log only.
    const response = fail(503, "GEO_BACKEND_UNAVAILABLE");
    return { ...response, internal: { code: "GEO_BACKEND_UNAVAILABLE", type, cause } };
  }
}

/** The parent parameter a given entity type expects. For docs/tests, not responses. */
export function parentParamFor(type: Exclude<GeoEntityType, "countries">): string {
  return PARENT_LABEL[type];
}
