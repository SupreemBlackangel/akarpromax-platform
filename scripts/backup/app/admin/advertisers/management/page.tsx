import { requireSessionUser } from "@/lib/identity-auth";
import AdvertiserAdminClient from "../advertiser-admin-client";

export const dynamic = "force-dynamic";

async function AdvertiserManagementGate() {
  const user = await requireSessionUser("/admin/advertisers/management");
  return <AdvertiserAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function AdvertiserManagementPage() {
  return <AdvertiserManagementGate />;
}
