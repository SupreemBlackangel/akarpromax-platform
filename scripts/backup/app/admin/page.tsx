import { requireSessionUser } from "@/lib/identity-auth";
import CommandCenterOverview from "./command-center-client";

export const dynamic = "force-dynamic";

async function AdminDashboardGate() {
  await requireSessionUser("/admin");
  return <CommandCenterOverview />;
}

export default function AdminPage() {
  return <AdminDashboardGate />;
}
