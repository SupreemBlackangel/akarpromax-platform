import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import RolesAdminClient from "../roles-admin-client";

export const dynamic = "force-dynamic";

// Same permission the sidebar already requires for this link. The page used to
// render with no session check and no permission check at all, so anyone who
// knew the URL reached the roles and permissions screen itself.
const REQUIRED = [PERMISSIONS.ROLES_VIEW];

async function RolesGate() {
  await requireSessionUser("/admin/roles");
  return (
    <PermissionGuard requiredPermissions={REQUIRED}>
      <RolesAdminClient />
    </PermissionGuard>
  );
}

export default function AdminRolesPage() {
  return <RolesGate />;
}
