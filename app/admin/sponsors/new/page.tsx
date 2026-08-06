import { requireSessionUser } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import NewSponsorForm from "../_components/NewSponsorForm";

export const dynamic = "force-dynamic";

async function NewSponsorGate() {
  await requireSessionUser("/admin/sponsors/new");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SPONSORS_CREATE]}>
      <NewSponsorForm />
    </PermissionGuard>
  );
}

export default function NewSponsorPage() {
  return <NewSponsorGate />;
}
