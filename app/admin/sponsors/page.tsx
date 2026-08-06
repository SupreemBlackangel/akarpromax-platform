import { requireSessionUser } from "@/lib/sponsor-auth";
import SponsorsListView from "./_components/SponsorsListView";

export const dynamic = "force-dynamic";

async function SponsorAdminGate() {
  const user = await requireSessionUser("/admin/sponsors");
  return <SponsorsListView />;
}

export default function SponsorAdminPage() {
  return <SponsorAdminGate />;
}
