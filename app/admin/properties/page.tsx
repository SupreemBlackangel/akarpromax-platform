import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import PropertiesAdminClient from "./properties-admin-client";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSIONS = [PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.PROPERTIES_MANAGE];

async function PropertiesAdminGate() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated) redirect("/");
  if (!REQUIRED_PERMISSIONS.some((p) => hasPermission(identity, p))) {
    return (
      <div className="advertiser-admin-denied" dir="rtl">
        <div>
          <span>🔒</span>
          <h1>403 — صلاحية مطلوبة</h1>
          <p>حسابك لا يملك صلاحيات إدارة العقارات.</p>
          <Link href="/">العودة إلى المنصة</Link>
        </div>
      </div>
    );
  }
  return <PropertiesAdminClient />;
}

export default function PropertiesAdminPage() {
  return <PropertiesAdminGate />;
}
