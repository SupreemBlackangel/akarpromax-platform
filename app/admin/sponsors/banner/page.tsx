import { requireChatGPTUser } from "@/app/chatgpt-auth";
import SponsorAdminClient from "../sponsor-admin-client";

export const dynamic = "force-dynamic";

async function BannerGate() {
  const user = await requireChatGPTUser("/admin/sponsors/banner");
  return <SponsorAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function BannerPage() {
  return <BannerGate />;
}
