import { requireSessionUser } from "@/lib/sponsor-auth";
import I18nAdminClient from "./i18n-admin-client";

export const dynamic = "force-dynamic";

async function I18nAdminGate() {
  const user = await requireSessionUser("/admin/i18n");
  return <I18nAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function I18nAdminPage() {
  return <I18nAdminGate />;
}