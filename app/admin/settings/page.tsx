import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import SettingsAdminClient from "../settings-admin-client";

export const dynamic = "force-dynamic";

async function SettingsGate() {
  const user = await requireChatGPTUser("/admin/settings");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SETTINGS_MANAGE]}>
      <SettingsAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />
    </PermissionGuard>
  );
}

export default function SettingsPage() {
  return <SettingsGate />;
}
