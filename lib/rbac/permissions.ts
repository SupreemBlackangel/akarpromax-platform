export const PERMISSIONS = {
  USERS_MANAGE: "users.manage",
  PROPERTIES_MANAGE: "properties.manage",
  PROPERTIES_VIEW: "properties.view",
  SPONSORS_MANAGE: "sponsors.manage",
  ADS_MANAGE: "ads.manage",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// أدوار افتراضية أساسية فقط في هذه المرحلة (لا تخترع أدوارًا إضافية الآن)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  user: [PERMISSIONS.PROPERTIES_VIEW],
};
