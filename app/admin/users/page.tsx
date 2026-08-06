import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import UsersAdminClient from "../users-admin-client";

export const dynamic = "force-dynamic";

async function UsersGate() {
  const user = await requireSessionUser("/admin/users");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.USERS_VIEW]}>
      <UsersAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />
    </PermissionGuard>
  );
}

export default function UsersPage() {
  return <UsersGate />;
}
