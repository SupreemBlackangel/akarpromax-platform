// ORGANIZATIONS_F3_WORKSPACE
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficePropertyRequests } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) return <OfficeWorkspaceShell activeTab="property-requests"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية مكتب مخولة.</div></OfficeWorkspaceShell>;
  if (ctx.organization.type !== "real_estate") return <OfficeWorkspaceShell activeTab="property-requests"><div data-org-id={ctx.organization.id} className="rounded-2xl border bg-[var(--color-surface)] p-10">طلبات العقار متاحة للمكاتب العقارية فقط.</div></OfficeWorkspaceShell>;
  const rows = await getOfficePropertyRequests(ctx.organization.id);
  return <OfficeWorkspaceShell activeTab="property-requests"><div data-org-id={ctx.organization.id}>
    <h2 className="mb-4 text-xl font-black">طلبات العقار المرتبطة بالمكتب</h2>
    <div className="space-y-3">{rows.map(({request,offer}) => <div key={offer.id} className="rounded-2xl border bg-[var(--color-surface)] p-5"><strong>{request.propertyType} · {request.city}</strong><p className="mt-2 text-sm text-gray-500">حالة الطلب: {request.status} · حالة عرض المكتب: {offer.status}</p></div>)}</div>
    {rows.length === 0 && <p className="rounded-2xl border bg-[var(--color-surface)] p-8 text-gray-500">لا توجد طلبات مرتبطة بعروض هذا المكتب.</p>}
  </div></OfficeWorkspaceShell>;
}
