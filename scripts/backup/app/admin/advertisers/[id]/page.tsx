import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import AdvertiserDetailView from "../_components/AdvertiserDetailView";

export const dynamic = "force-dynamic";

async function AdvertiserDetailGate() {
  await requireSessionUser("/admin/advertisers");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ADVERTISERS_VIEW]}>
      <AdvertiserDetailView />
    </PermissionGuard>
  );
}

export default function AdvertiserDetailPage() {
  return <AdvertiserDetailGate />;
}
