/**
 * An office's settings, shared between its machines.
 *
 * A firm with a desk in reception and one in the back office configured each
 * separately: two branch lists, two document folders, two branding blocks, and
 * whichever one happened to publish decided what the website showed. These
 * settings now live on the platform, so a second machine is configured by
 * pairing it.
 *
 * The sections are stored as JSON on purpose. Their shapes belong to the
 * desktop app and change with its releases; modelling them here would mean a
 * server deploy every time the app adds a checkbox. The server validates what
 * it is responsible for — size, the fields it actually reads, and who may write
 * — and stores the rest verbatim.
 */
import { getIntegrationDb } from "@/lib/integration/db";

export const OFFICE_SETTINGS_SECTIONS = [
  "branding",
  "system",
  "lists",
  "savePaths",
  "backup",
  "license",
  "currencies",
  "siteIntegration",
] as const;

export type OfficeSettingsSection = (typeof OFFICE_SETTINGS_SECTIONS)[number];

/**
 * Sections the desktop may write.
 *
 * `license` is the platform's answer about a subscription, not the office's
 * claim about it — a desktop that could write it could grant itself a licence,
 * so it is served from the subscription snapshot and refused on the way in.
 */
export const OFFICE_SETTINGS_WRITABLE_SECTIONS: readonly OfficeSettingsSection[] =
  OFFICE_SETTINGS_SECTIONS.filter((section) => section !== "license");

/** Per section. Big enough for a branch list, small enough not to be a store. */
export const OFFICE_SETTINGS_MAX_SECTION_BYTES = 64 * 1024;

/** `savePaths` sections map to `save_paths`, `siteIntegration` to `site_integration`. */
const COLUMN: Record<OfficeSettingsSection, string> = {
  branding: "branding",
  system: "system",
  lists: "lists",
  savePaths: "save_paths",
  backup: "backup",
  license: "license",
  currencies: "currencies",
  siteIntegration: "site_integration",
};

export type OfficeSettingsBody = Partial<Record<OfficeSettingsSection, Record<string, unknown>>>;

export type OfficeSettings = {
  sponsorId: string;
  version: number;
  updatedAt: string | null;
  updatedByDeviceId: string | null;
  sections: OfficeSettingsBody;
};

export class OfficeSettingsError extends Error {
  constructor(
    readonly code: "INVALID_SECTION" | "SECTION_TOO_LARGE" | "READ_ONLY_SECTION" | "INVALID_BODY" | "VERSION_CONFLICT",
    message: string,
    readonly current?: OfficeSettings,
  ) {
    super(message);
    this.name = "OfficeSettingsError";
  }
}

function parseSection(value: unknown): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    // A row somebody edited by hand should not take the endpoint down; the
    // section reads as absent and the next save replaces it.
    return undefined;
  }
}

/**
 * The office's settings, or the defaults at version 0.
 *
 * An office that has never saved gets a well-formed answer rather than a 404:
 * the desktop's first run has nothing to send yet, and a 404 would have it
 * treat "never configured" as an error.
 */
export async function getOfficeSettings(sponsorId: string): Promise<OfficeSettings> {
  const db = await getIntegrationDb();
  const row = await db
    .prepare("SELECT * FROM office_settings WHERE sponsor_id = ?1 LIMIT 1")
    .bind(String(sponsorId))
    .first<Record<string, unknown>>();

  if (!row) {
    return { sponsorId, version: 0, updatedAt: null, updatedByDeviceId: null, sections: {} };
  }

  const sections: OfficeSettingsBody = {};
  for (const section of OFFICE_SETTINGS_SECTIONS) {
    const parsed = parseSection(row[COLUMN[section]]);
    if (parsed) sections[section] = parsed;
  }

  return {
    sponsorId,
    version: Number(row.version ?? 0),
    updatedAt: row.updated_at == null ? null : String(row.updated_at),
    updatedByDeviceId: row.updated_by_device_id == null ? null : String(row.updated_by_device_id),
    sections,
  };
}

function validateSections(sections: unknown): OfficeSettingsBody {
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    throw new OfficeSettingsError("INVALID_BODY", "sections must be an object");
  }

  const out: OfficeSettingsBody = {};
  for (const [key, value] of Object.entries(sections as Record<string, unknown>)) {
    if (!(OFFICE_SETTINGS_SECTIONS as readonly string[]).includes(key)) {
      throw new OfficeSettingsError("INVALID_SECTION", `${key} is not a settings section`);
    }
    const section = key as OfficeSettingsSection;
    if (!OFFICE_SETTINGS_WRITABLE_SECTIONS.includes(section)) {
      throw new OfficeSettingsError(
        "READ_ONLY_SECTION",
        `${section} is served by the platform and cannot be written by a device`,
      );
    }
    if (value == null) continue;
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new OfficeSettingsError("INVALID_BODY", `${section} must be an object`);
    }
    const serialised = JSON.stringify(value);
    // Byte length, not character count: one Arabic office name is two bytes a
    // character, and a limit measured in characters would be twice as loose
    // for the offices this platform actually serves.
    if (Buffer.byteLength(serialised, "utf8") > OFFICE_SETTINGS_MAX_SECTION_BYTES) {
      throw new OfficeSettingsError("SECTION_TOO_LARGE", `${section} exceeds ${OFFICE_SETTINGS_MAX_SECTION_BYTES} bytes`);
    }
    out[section] = value as Record<string, unknown>;
  }
  return out;
}

/**
 * Save the sections a device sent, if it is working from the current version.
 *
 * Optimistic concurrency rather than last-write-wins: two machines in one
 * office edit the same settings, and silently overwriting means the receptionist
 * loses the branch the manager added thirty seconds ago with no sign it
 * happened. A stale version is refused and the caller is handed the current
 * state to reconcile against.
 */
export async function saveOfficeSettings(input: {
  sponsorId: string;
  deviceId?: string | null;
  version: unknown;
  sections: unknown;
}): Promise<OfficeSettings> {
  const sections = validateSections(input.sections);
  // A number, not something Number() happens to coerce: `null` becomes 0 and
  // would read as "I am working from the initial version" from a client that
  // simply did not send one.
  const sentVersion = typeof input.version === "number" ? input.version : Number.NaN;
  if (!Number.isInteger(sentVersion) || sentVersion < 0) {
    throw new OfficeSettingsError("INVALID_BODY", "version must be a non-negative integer");
  }

  const current = await getOfficeSettings(input.sponsorId);
  if (sentVersion !== current.version) {
    throw new OfficeSettingsError(
      "VERSION_CONFLICT",
      `settings are at version ${current.version}`,
      current,
    );
  }

  // Sections the device did not send keep what they had: a desktop saving only
  // its branding must not blank an office's branch list.
  const merged: OfficeSettingsBody = { ...current.sections, ...sections };
  const nextVersion = current.version + 1;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const db = await getIntegrationDb();

  const values = OFFICE_SETTINGS_SECTIONS.map((section) =>
    merged[section] ? JSON.stringify(merged[section]) : null);

  if (current.version === 0 && current.updatedAt === null) {
    await db
      .prepare(
        `INSERT INTO office_settings
          (sponsor_id, branding, system, lists, save_paths, backup, license, currencies, site_integration,
           version, updated_by_device_id, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
      )
      .bind(input.sponsorId, ...values, nextVersion, input.deviceId ?? null, now)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE office_settings
            SET branding = ?2, system = ?3, lists = ?4, save_paths = ?5, backup = ?6,
                license = ?7, currencies = ?8, site_integration = ?9,
                version = ?10, updated_by_device_id = ?11, updated_at = ?12
          WHERE sponsor_id = ?1`,
      )
      .bind(input.sponsorId, ...values, nextVersion, input.deviceId ?? null, now)
      .run();
  }

  return {
    sponsorId: input.sponsorId,
    version: nextVersion,
    updatedAt: now,
    updatedByDeviceId: input.deviceId ?? null,
    sections: merged,
  };
}

/**
 * The branding fields the public office profile accepts.
 *
 * The same subset `lib/amrs/workspace-profile-api.ts` allows, minus the geo
 * ids: an office's country and city are set where its address is, not in a
 * desktop preferences pane, and letting a device move an organisation between
 * countries from a settings save is not something anybody asked for.
 */
export const OFFICE_BRANDING_PROFILE_FIELDS = [
  "nameAr", "nameEn", "nameTr",
  "descriptionAr", "descriptionEn", "descriptionTr",
  "contactPhone", "contactEmail", "websiteUrl", "logoUrl",
] as const;

/** The branding subset that should reach the organisation row, if any. */
export function brandingProfilePatch(branding: Record<string, unknown> | undefined): Record<string, string> {
  const patch: Record<string, string> = {};
  if (!branding) return patch;
  for (const field of OFFICE_BRANDING_PROFILE_FIELDS) {
    const value = branding[field];
    if (typeof value === "string" && value.trim()) patch[field] = value.trim();
  }
  return patch;
}
