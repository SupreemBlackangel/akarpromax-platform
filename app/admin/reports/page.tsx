import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import ReportsAdminClient from "../reports-admin-client";

export const dynamic = "force-dynamic";

async function ReportsGate() {
  await requireSessionUser("/admin/reports");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.REPORTS_VIEW]}>
      <ReportsAdminClient />
    </PermissionGuard>
  );
}

export default function ReportsPage() {
  return <ReportsGate />;
}
