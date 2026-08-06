import { requireSessionUser } from "@/lib/sponsor-auth";
import DashboardAdminClient from "./dashboard-admin-client";

export const dynamic = "force-dynamic";

async function AdminDashboardGate() {
  const user = await requireSessionUser("/admin");
  return <DashboardAdminClient initialUser={{ email: user.email, displayName: user.displayName }} />;
}

export default function AdminPage() {
  return <AdminDashboardGate />;
}
