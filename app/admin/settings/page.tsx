import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import SettingsAdminClient from "../settings-admin-client";

export const dynamic = "force-dynamic";

async function SettingsGate() {
  await requireSessionUser("/admin/settings");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SETTINGS_MANAGE]}>
      <SettingsAdminClient />
    </PermissionGuard>
  );
}

export default function SettingsPage() {
  return <SettingsGate />;
}
