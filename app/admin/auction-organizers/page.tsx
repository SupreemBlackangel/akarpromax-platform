import { getSessionIdentity } from "@/lib/identity-auth";
import AuctionOrganizersClient from "./auction-organizers-client";

export const dynamic = "force-dynamic";

async function AuctionOrganizersGate() {
  const session = await getSessionIdentity();
  if (!session.authenticated || session.role !== "super_admin") {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-red-600 mb-2">غير مصرح</p>
          <p className="text-gray-500">الصلاحية متاحة لمدير النظام فقط</p>
        </div>
      </div>
    );
  }
  return <AuctionOrganizersClient />;
}

export default function AuctionOrganizersPage() {
  return <AuctionOrganizersGate />;
}
