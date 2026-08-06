import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import SponsorDetailView from "../_components/SponsorDetailView";

export const dynamic = "force-dynamic";

async function SponsorDetailGate() {
  await requireSessionUser("/admin/sponsors");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SPONSORS_VIEW]}>
      <SponsorDetailView />
    </PermissionGuard>
  );
}

export default function SponsorDetailPage() {
  return <SponsorDetailGate />;
}
