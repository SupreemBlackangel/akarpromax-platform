import { requireChatGPTUser } from "@/app/chatgpt-auth";
import SponsorAdminClient from "./sponsor-admin-client";

export const dynamic = "force-dynamic";

async function SponsorAdminGate() {
  const user = await requireChatGPTUser("/admin/sponsors");
  return <SponsorAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function SponsorAdminPage() {
  return <SponsorAdminGate />;
}
