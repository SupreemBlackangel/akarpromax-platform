import { redirect } from "next/navigation";
import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import PropertiesAdminClient from "./properties-admin-client";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSIONS = [PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.PROPERTIES_MANAGE];

async function PropertiesAdminGate() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated) redirect("/");
  if (!REQUIRED_PERMISSIONS.some((p) => hasSponsorPermission(identity, p))) {
    return (
      <div dir="rtl" className="min-h-[50vh] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">403 — صلاحية مطلوبة</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            حسابك لا يملك صلاحيات إدارة العقارات.
          </p>
        </div>
      </div>
    );
  }
  return <PropertiesAdminClient />;
}

export default function PropertiesAdminPage() {
  return <PropertiesAdminGate />;
}
