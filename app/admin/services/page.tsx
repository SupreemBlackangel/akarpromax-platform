import { redirect } from "next/navigation";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { PermissionGuard } from "@/src/components/PermissionGuard";
import { PERMISSIONS } from "@/src/constants/permissions";
import ServicesAdminClient from "./admin-client";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSIONS = [
  PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
  PERMISSIONS.SERVICE_REPORTS_MANAGE,
  PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
];

async function ServicesAdminGate() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated) redirect("/");
  if (!REQUIRED_PERMISSIONS.some((permission) => hasPermission(identity, permission))) {
    return (
      <div dir="rtl" className="min-h-[50vh] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <span aria-hidden="true" className="mx-auto mb-[var(--space-4)] grid size-14 place-items-center rounded-[var(--radius-card)] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"><Lock size={26} strokeWidth={1.75} /></span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--color-text-primary)]">403 — صلاحية مطلوبة</h1>
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
