import { requireChatGPTUser } from "@/app/chatgpt-auth";
import SponsorsListView from "./_components/SponsorsListView";

export const dynamic = "force-dynamic";

async function SponsorAdminGate() {
  const user = await requireChatGPTUser("/admin/sponsors");
  return <SponsorsListView />;
}

export default function SponsorAdminPage() {
  return <SponsorAdminGate />;
}
