import { ROLE_PERMISSIONS } from "./permissions";

export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || userPermissions.includes("*");
}
