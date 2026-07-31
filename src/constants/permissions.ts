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
  ADS_DELETE: "ads.delete",
  ADS_ANALYTICS: "ads.analytics",
  MEDIA_UPLOAD: "media.upload",

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

  REPORTS_VIEW: "reports.view",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
