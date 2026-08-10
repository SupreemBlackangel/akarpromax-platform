import { requireSessionUser } from "@/lib/identity-auth";
import AdvertisersListView from "./_components/AdvertisersListView";

export const dynamic = "force-dynamic";

async function AdvertiserAdminGate() {
  await requireSessionUser("/admin/advertisers");
  return <AdvertisersListView />;
}

export default function AdvertiserAdminPage() {
  return <AdvertiserAdminGate />;
}
