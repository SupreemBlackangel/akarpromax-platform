import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import SponsorRequestsView from "../_components/SponsorRequestsView";

export const dynamic = "force-dynamic";

async function SponsorRequestsGate() {
  const user = await requireChatGPTUser("/admin/sponsors/requests");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SPONSORS_VIEW, PERMISSIONS.SPONSORS_APPROVE]}>
      <SponsorRequestsView />
    </PermissionGuard>
  );
}

export default function SponsorRequestsPage() {
  return <SponsorRequestsGate />;
}
