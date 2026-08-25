// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficeProperties } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) return <OfficeWorkspaceShell activeTab="properties"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية مكتب مخولة.</div></OfficeWorkspaceShell>;
  if (ctx.organization.type !== "real_estate") return <OfficeWorkspaceShell activeTab="properties"><div data-org-id={ctx.organization.id} className="rounded-2xl border bg-[var(--color-surface)] p-10">إدارة العقارات متاحة للمكاتب العقارية فقط.</div></OfficeWorkspaceShell>;
  const rows = await getOfficeProperties(ctx.organization.id);
  return <OfficeWorkspaceShell activeTab="properties"><div data-org-id={ctx.organization.id}>
    <h2 className="mb-4 text-xl font-black">عقارات {ctx.organization.nameAr ?? ctx.organization.nameEn}</h2>
    <div className="grid gap-4 md:grid-cols-2">{rows.map(p => <Link key={p.id} href={`/properties/${p.id}`} className="rounded-2xl border bg-[var(--color-surface)] p-5"><strong>{p.titleAr}</strong><p className="mt-2 text-sm text-gray-500">{p.city} · {p.status}</p></Link>)}</div>
    {rows.length === 0 && <p className="rounded-2xl border bg-[var(--color-surface)] p-8 text-gray-500">لا توجد عقارات مرتبطة بهذا المكتب.</p>}
  </div></OfficeWorkspaceShell>;
}
