import { requireChatGPTUser } from "@/app/chatgpt-auth";
import AdsAdminClient from "./ads-admin-client";

export const dynamic = "force-dynamic";

async function AdsAdminGate() {
  const user = await requireChatGPTUser("/admin/ads");
  return <AdsAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function AdsAdminPage() {
  return <AdsAdminGate />;
}
