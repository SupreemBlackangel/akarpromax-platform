import { requireSessionUser } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import NewAdvertiserForm from "../_components/NewAdvertiserForm";

export const dynamic = "force-dynamic";

async function NewAdvertiserGate() {
  await requireSessionUser("/admin/advertisers/new");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.ADVERTISERS_CREATE]}>
      <NewAdvertiserForm />
    </PermissionGuard>
  );
}

export default function NewAdvertiserPage() {
  return <NewAdvertiserGate />;
}
