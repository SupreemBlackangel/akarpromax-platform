import type { ReactNode } from "react";
import { getSessionIdentity } from "@/lib/identity-auth";
import AdminSidebar from "./admin-sidebar";
import ToastViewport from "@/src/components/ui/Toast";
import "@/src/styles/admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const identity = await getSessionIdentity();
  return (
    <main className="advertiser-admin" dir="rtl">
      <AdminSidebar identity={identity} />
      <section className="advertiser-admin-canvas">{children}</section>
      <ToastViewport ariaLabel="التنبيهات" />
    </main>
  );
}
