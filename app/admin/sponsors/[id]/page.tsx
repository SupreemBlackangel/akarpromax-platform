import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import SponsorDetailView from "../_components/SponsorDetailView";

export const dynamic = "force-dynamic";

async function SponsorDetailGate() {
  const user = await requireChatGPTUser("/admin/sponsors");
  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.SPONSORS_VIEW]}>
      <SponsorDetailView />
    </PermissionGuard>
  );
}

export default function SponsorDetailPage() {
  return <SponsorDetailGate />;
}
