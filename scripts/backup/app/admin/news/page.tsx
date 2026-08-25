import { requireSessionUser } from "@/lib/identity-auth";
import NewsAdminClient from "./news-admin-client";

export const dynamic = "force-dynamic";

async function NewsAdminGate() {
  const user = await requireSessionUser("/admin/news");
  return <NewsAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function NewsAdminPage() {
  return <NewsAdminGate />;
}
