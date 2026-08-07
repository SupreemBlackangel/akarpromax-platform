import { requireSessionUser } from "@/lib/sponsor-auth";
import AdminIntegrationClient from "./admin-integration-client";

export const dynamic = "force-dynamic";

async function AdminIntegrationGate() {
  await requireSessionUser("/admin/integration");
  return <AdminIntegrationClient />;
}

export default function AdminIntegrationPage() {
  return <AdminIntegrationGate />;
}
