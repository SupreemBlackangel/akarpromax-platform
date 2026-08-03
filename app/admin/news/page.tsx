import { requireChatGPTUser } from "@/app/chatgpt-auth";
import NewsAdminClient from "./news-admin-client";

export const dynamic = "force-dynamic";

async function NewsAdminGate() {
  const user = await requireChatGPTUser("/admin/news");
  return <NewsAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function NewsAdminPage() {
  return <NewsAdminGate />;
}
