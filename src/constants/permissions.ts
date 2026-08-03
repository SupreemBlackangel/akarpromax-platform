export const PERMISSIONS = {
  ADMIN_DASHBOARD_VIEW: "admin.dashboard.view",

  SPONSORS_VIEW: "sponsors.view",
  SPONSORS_CREATE: "sponsors.create",
  SPONSORS_UPDATE: "sponsors.update",
  SPONSORS_APPROVE: "sponsors.approve",
  SPONSORS_REJECT: "sponsors.reject",
  SPONSORS_SUSPEND: "sponsors.suspend",
  SPONSORS_ACTIVATE: "sponsors.activate",
  SPONSORS_DELETE: "sponsors.delete",

  SPONSOR_USERS_MANAGE: "sponsors.manage_users",
  SPONSOR_BRANCHES_MANAGE: "sponsors.manage_branches",
  SPONSOR_CONTRACTS_MANAGE: "sponsors.manage_contracts",
  SPONSOR_SUBSCRIPTIONS_MANAGE: "sponsors.manage_subscriptions",
  SPONSOR_PAYMENTS_MANAGE: "sponsors.manage_payments",

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

  SERVICES_VIEW: "services.view",
  SERVICES_CREATE: "services.create",
  SERVICES_UPDATE: "services.update",
  SERVICES_DELETE: "services.delete",
  SERVICES_APPROVE: "services.approve",
  SERVICES_REVIEW_MODERATE: "services.moderate_reviews",
  SERVICES_DISPUTE_RESOLVE: "services.resolve_disputes",

  I18N_VIEW: "i18n.view",
  I18N_EDIT: "i18n.edit",
  I18N_PUBLISH: "i18n.publish",
  I18N_MANAGE_NAMESPACES: "i18n.manage_namespaces",

  REPORTS_VIEW: "reports.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
