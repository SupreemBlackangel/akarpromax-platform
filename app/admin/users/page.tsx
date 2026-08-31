import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import UsersAdminClient from "../users-admin-client";
import UsersManageClient from "./users-manage-client";

export const dynamic = "force-dynamic";

async function UsersGate() {
  const user = await requireSessionUser("/admin/users");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.USERS_VIEW]}>
      <div className="space-y-6">
        <UsersManageClient />
        <UsersAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />
      </div>
    </PermissionGuard>
  );
}

export default function UsersPage() {
  return <UsersGate />;
}
