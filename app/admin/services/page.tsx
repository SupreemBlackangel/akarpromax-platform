import { redirect } from "next/navigation";
import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import ServicesAdminClient from "./admin-client";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSIONS = [
  PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
  PERMISSIONS.SERVICE_REPORTS_MANAGE,
  PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
];

async function ServicesAdminGate() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated) redirect("/");
  if (!REQUIRED_PERMISSIONS.some((permission) => hasSponsorPermission(identity, permission))) {
    return (
      <div dir="rtl" className="min-h-[50vh] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">403 — صلاحية مطلوبة</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            حسابك مسجّل لكنه لا يملك صلاحيات إدارة سوق الخدمات. اطلب من المدير العام منحك الصلاحية المناسبة.
          </p>
        </div>
      </div>
    );
  }
  return (
    <PermissionGuard requiredPermissions={REQUIRED_PERMISSIONS}>
      <ServicesAdminClient />
    </PermissionGuard>
  );
}

export default function ServicesAdminPage() {
  return <ServicesAdminGate />;
}
