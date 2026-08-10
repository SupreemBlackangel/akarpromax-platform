import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import EditAdvertiserForm from "../../_components/EditAdvertiserForm";

export const dynamic = "force-dynamic";

async function EditAdvertiserGate() {
  await requireSessionUser("/admin/advertisers");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ADVERTISERS_UPDATE]}>
      <EditAdvertiserForm />
    </PermissionGuard>
  );
}

export default function EditAdvertiserPage() {
  return <EditAdvertiserGate />;
}
