import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import EditSponsorForm from "../../_components/EditSponsorForm";

export const dynamic = "force-dynamic";

async function EditSponsorGate() {
  const user = await requireChatGPTUser("/admin/sponsors");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SPONSORS_UPDATE]}>
      <EditSponsorForm />
    </PermissionGuard>
  );
}

export default function EditSponsorPage() {
  return <EditSponsorGate />;
}
