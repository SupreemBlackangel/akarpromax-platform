export const PERMISSIONS = {
  properties: { view: true, create: true, edit: true, delete: true, review: true, approve: true, reject: true },
  services: { view: true, create: true, edit: true, delete: true, review: true, approve: true, reject: true, manageCategories: true },
  auctions: { view: true, create: true, edit: true, delete: true, review: true, approve: true, reject: true, end: true },
  community: { view: true, create: true, edit: true, delete: true, pin: true, lock: true, moderate: true },
  advertising: { view: true, create: true, edit: true, delete: true, approve: true, manageCampaigns: true, manageNewsTicker: true, manageFeatured: true },
  knowledge: { view: true, create: true, edit: true, delete: true, approve: true },
  tools: { view: true, create: true, edit: true, delete: true, manage: true },
  users: { view: true, create: true, edit: true, delete: true, ban: true, verify: true, assignRoles: true },
  reports: { view: true, export: true },
  settings: { view: true, edit: true },
};

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'review' | 'approve' | 'reject' | 'manage' | 'pin' | 'lock' | 'moderate' | 'ban' | 'verify' | 'assignRoles' | 'export' | 'manageCategories' | 'manageCampaigns' | 'manageNewsTicker' | 'manageFeatured' | 'end';

type PermissionsMap = Record<string, boolean | Partial<Record<PermissionAction, boolean>> | undefined>;

export function hasPermission(permissions: PermissionsMap | null | undefined, module: PermissionKey, action: PermissionAction): boolean {
  if (!permissions) return false;
  if (permissions[module] === true) return true;
  const moduleValue = permissions[module];
  if (moduleValue && typeof moduleValue === 'object' && moduleValue[action] === true) return true;
  return false;
}

export function hasAnyPermission(permissions: PermissionsMap | null | undefined, module: PermissionKey, actions: PermissionAction[]): boolean {
  return actions.some(action => hasPermission(permissions, module, action));
}
