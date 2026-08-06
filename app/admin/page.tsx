import { requireSessionUser } from "@/lib/sponsor-auth";
import DashboardAdminClient from "./dashboard-admin-client";

export const dynamic = "force-dynamic";

async function AdminDashboardGate() {
  await requireSessionUser("/admin");
  return <DashboardAdminClient />;
}

export default function AdminPage() {
  return <AdminDashboardGate />;
}
