import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import RolesAdminClient from "../roles-admin-client";

export const dynamic = "force-dynamic";

async function RolesGate() {
  const user = await requireSessionUser("/admin/roles");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ROLES_VIEW]}>
      <RolesAdminClient />
    </PermissionGuard>
  );
}

export default function RolesPage() {
  return <RolesGate />;
}
