export const PERMISSIONS = {
  ADMIN_DASHBOARD_VIEW: "admin.dashboard.view",

  ADVERTISERS_VIEW: "advertisers.view",
  ADVERTISERS_CREATE: "advertisers.create",
  ADVERTISERS_UPDATE: "advertisers.update",
  ADVERTISERS_APPROVE: "advertisers.approve",
  ADVERTISERS_REJECT: "advertisers.reject",
  ADVERTISERS_SUSPEND: "advertisers.suspend",
  ADVERTISERS_ACTIVATE: "advertisers.activate",
  ADVERTISERS_DELETE: "advertisers.delete",

  ADVERTISER_USERS_MANAGE: "advertisers.manage_users",
  ADVERTISER_BRANCHES_MANAGE: "advertisers.manage_branches",
  ADVERTISER_CONTRACTS_MANAGE: "advertisers.manage_contracts",
  ADVERTISER_SUBSCRIPTIONS_MANAGE: "advertisers.manage_subscriptions",
  ADVERTISER_PAYMENTS_MANAGE: "advertisers.manage_payments",

  ADS_VIEW: "ads.view",
  ADS_CREATE: "ads.create",
  ADS_UPDATE: "ads.update",
  ADS_PUBLISH: "ads.publish",
  ADS_APPROVE: "ads.approve",
  ADS_DELETE: "ads.delete",
  ADS_ANALYTICS: "ads.analytics",
  MEDIA_UPLOAD: "media.upload",

  NEWS_VIEW: "news.view",
  NEWS_CREATE: "news.create",
  NEWS_UPDATE: "news.update",
  NEWS_PUBLISH: "news.publish",
  NEWS_DELETE: "news.delete",
  NEWS_SOURCES_MANAGE: "news.sources.manage",
  NEWS_ANALYTICS_VIEW: "news.analytics.view",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",

  PROPERTIES_VIEW: "properties.view",
  PROPERTIES_MANAGE: "properties.manage",

  OFFICE_LINK: "office.link",
  OFFICE_UNLINK: "office.unlink",
  OFFICE_INTEGRATION_VIEW: "office.integration.view",
  OFFICE_PAIRING_MANAGE: "office.pairing.manage",
  OFFICE_DEVICES_MANAGE: "office.devices.manage",
  OFFICE_DEVICES_REVOKE: "office.devices.revoke",
  OFFICE_SYNC_VIEW: "office.sync.view",
  OFFICE_RADAR_VIEW: "office.radar.view",
  OFFICE_NOTIFICATIONS_VIEW: "office.notifications.view",
  OFFICE_ADMIN_VIEW: "office.admin.view",

  SERVICES_VIEW: "services.view",
  SERVICES_CREATE: "services.create",
  SERVICES_UPDATE: "services.update",
  SERVICES_DELETE: "services.delete",
  SERVICES_APPROVE: "services.approve",
  SERVICES_REVIEW_MODERATE: "services.moderate_reviews",
  SERVICES_DISPUTE_RESOLVE: "services.resolve_disputes",

  SERVICE_CATEGORIES_MANAGE: "service_categories.manage",
  SERVICE_PROVIDERS_APPLY: "service_providers.apply",
  SERVICE_PROVIDERS_MANAGE: "service_providers.manage",
  SERVICE_PROVIDERS_REVIEW: "service_providers.review",
  SERVICE_REQUESTS_MANAGE_OWN: "service_requests.manage_own",
  SERVICE_REQUESTS_MANAGE_ALL: "service_requests.manage_all",
  SERVICE_OFFERS_MANAGE_OWN: "service_offers.manage_own",
  SERVICE_OFFERS_MANAGE_ALL: "service_offers.manage_all",
  SERVICE_JOBS_MANAGE_OWN: "service_jobs.manage_own",
  SERVICE_REPORTS_MANAGE: "service_reports.manage",
  SERVICE_NOTIFICATIONS_VIEW: "service_notifications.view",
  SERVICE_ADS_MANAGE: "service_ads.manage",

  TOOLS_USE: "tools.use",

  I18N_VIEW: "i18n.view",
  I18N_EDIT: "i18n.edit",
  I18N_PUBLISH: "i18n.publish",
  I18N_MANAGE_NAMESPACES: "i18n.manage_namespaces",

  REPORTS_VIEW: "reports.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionScope = {
  module: string;
  page?: string;
  geo?: string;
  entity?: string;
};

export type ScopedRole = {
  role: string;
  permissions: string[];
  scopes?: PermissionScope[];
};

export function hasScopedPermission(
  identity: { role: string; permissions: string[] },
  permission: string,
  scope?: PermissionScope,
): boolean {
  if (identity.permissions.includes("*")) return true;
  if (!identity.permissions.includes(permission)) return false;
  if (!scope) return true;
  return true;
}
