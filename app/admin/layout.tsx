import type { ReactNode } from "react";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import AdminSidebar from "./admin-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const identity = await getSessionIdentity();
  return (
    <main className="sponsor-admin" dir="rtl">
      <AdminSidebar identity={identity} />
      <section className="sponsor-admin-canvas">{children}</section>
    </main>
  );
}
