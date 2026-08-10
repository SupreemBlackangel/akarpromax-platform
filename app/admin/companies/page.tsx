import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import CompaniesAdminClient from "./companies-admin-client";

export const dynamic = "force-dynamic";

async function CompaniesGate() {
  await requireSessionUser("/admin/companies");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.PROPERTIES_MANAGE]}>
      <CompaniesAdminClient />
    </PermissionGuard>
  );
}

export default function CompaniesAdminPage() {
  return <CompaniesGate />;
}
