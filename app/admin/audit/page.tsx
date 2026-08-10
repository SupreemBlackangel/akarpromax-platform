import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import AuditAdminClient from "./audit-admin-client";

export const dynamic = "force-dynamic";

async function AuditGate() {
  await requireSessionUser("/admin/audit");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ADMIN_DASHBOARD_VIEW]}>
      <AuditAdminClient />
    </PermissionGuard>
  );
}

export default function AuditPage() {
  return <AuditGate />;
}
