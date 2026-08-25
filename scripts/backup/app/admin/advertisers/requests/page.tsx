import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import AdvertiserRequestsView from "../_components/AdvertiserRequestsView";

export const dynamic = "force-dynamic";

async function AdvertiserRequestsGate() {
  await requireSessionUser("/admin/advertisers/requests");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ADVERTISERS_VIEW, PERMISSIONS.ADVERTISERS_APPROVE]}>
      <AdvertiserRequestsView />
    </PermissionGuard>
  );
}

export default function AdvertiserRequestsPage() {
  return <AdvertiserRequestsGate />;
}
