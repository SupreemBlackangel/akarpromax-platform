export const OFFICE_PROTOCOL_VERSION = 1;
export const MIN_SUPPORTED_APP_VERSION = "1.0.0";
export const RECOMMENDED_APP_VERSION = "1.2.0";

export const OFFICE_DEVICE_STATUSES = ["pending", "active", "revoked", "expired", "suspended"] as const;
export type OfficeDeviceStatus = (typeof OFFICE_DEVICE_STATUSES)[number];

export const PAIRING_CODE_STATUSES = ["pending", "completed", "expired", "revoked"] as const;
export type PairingCodeStatus = (typeof PAIRING_CODE_STATUSES)[number];

export const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;

export const OFFICE_CREDENTIAL_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const OFFICE_TOKEN_PREFIX = "apd_";

export const OFFICE_SYNC_STATUSES = [
  "queued",
  "sending",
  "synced",
  "failed",
  "retrying",
  "conflict",
  "dead_letter",
] as const;
export type OfficeSyncStatus = (typeof OFFICE_SYNC_STATUSES)[number];

export const OFFICE_SYNC_MAX_ATTEMPTS = 5;

export const OFFICE_NOTIFICATION_CHANNELS = ["in_app", "email", "office_desktop"] as const;
export type OfficeNotificationChannel = (typeof OFFICE_NOTIFICATION_CHANNELS)[number];

export const OFFICE_NOTIFICATION_DELIVERY_STATUSES = ["queued", "delivered", "deferred", "failed"] as const;
export type OfficeNotificationDeliveryStatus = (typeof OFFICE_NOTIFICATION_DELIVERY_STATUSES)[number];

export const OFFICE_AD_PLACEMENTS = [
  "office_dashboard_hero",
  "office_dashboard_sidebar",
  "office_bottom_strip",
  "office_news_inline",
  "office_properties_inline",
  "office_services_inline",
] as const;
export type OfficeAdPlacement = (typeof OFFICE_AD_PLACEMENTS)[number];

export const OFFICE_SCOPES = [
  "office.news.read",
  "office.ads.read",
  "office.notifications.read",
  "office.properties.read",
  "office.properties.create",
  "office.properties.update",
  "office.sync",
  "office.radar.read",
] as const;
export type OfficeScope = (typeof OFFICE_SCOPES)[number];

export const OFFICE_DEFAULT_SCOPES: readonly OfficeScope[] = [
  "office.news.read",
  "office.ads.read",
  "office.notifications.read",
  "office.properties.read",
  "office.properties.create",
  "office.properties.update",
  "office.sync",
  "office.radar.read",
];

export const OFFICE_SYNC_OPERATION_TYPES = ["property.upsert", "property.delete"] as const;
export type OfficeSyncOperationType = (typeof OFFICE_SYNC_OPERATION_TYPES)[number];

export const RADAR_KINDS = ["properties", "services", "both"] as const;
export type RadarKind = (typeof RADAR_KINDS)[number];

export const RADAR_MAX_RADIUS_KM = 100;

export type ProtocolCheck =
  | { status: "SUPPORTED"; action: "none" }
  | { status: "UPDATE_RECOMMENDED"; action: "update-recommended"; currentApp: string }
  | { status: "UPDATE_REQUIRED"; action: "update-required"; currentApp: string }
  | { status: "BLOCKED"; action: "blocked"; currentApp: string };

export function checkProtocolVersion(
  appVersion: string,
  protocolVersion: number,
): ProtocolCheck {
  const currentApp = String(appVersion ?? "").trim() || "unknown";
  if (protocolVersion > OFFICE_PROTOCOL_VERSION) {
    return { status: "BLOCKED", action: "blocked", currentApp };
  }
  if (protocolVersion < OFFICE_PROTOCOL_VERSION) {
    return { status: "UPDATE_REQUIRED", action: "update-required", currentApp };
  }
  const major = Number(currentApp.split(".")[0]);
  if (Number.isFinite(major) && major < 1) {
    return { status: "UPDATE_REQUIRED", action: "update-required", currentApp };
  }
  const minor = Number(currentApp.split(".")[1]);
  if (Number.isFinite(minor) && minor < 2) {
    return { status: "UPDATE_RECOMMENDED", action: "update-recommended", currentApp };
  }
  return { status: "SUPPORTED", action: "none" };
}

export function isValidScope(scope: string): scope is OfficeScope {
  return (OFFICE_SCOPES as readonly string[]).includes(scope);
}
