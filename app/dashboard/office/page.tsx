// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficeOverview } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) return <OfficeWorkspaceShell activeTab="overview"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية مكتب مخولة.</div></OfficeWorkspaceShell>;
  const overview = await getOfficeOverview(ctx.organization.id);
  return <OfficeWorkspaceShell activeTab="overview"><div data-org-id={ctx.organization.id}><h2 className="text-xl font-black">{ctx.organization.nameAr ?? ctx.organization.nameEn}</h2><p className="text-sm text-gray-500">{ctx.organization.status} · {ctx.organization.verifiedAt ? "موثق" : "غير موثق"}</p><div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{[["الأعضاء",overview.memberCount],["الفروع",overview.branchCount],["العقارات",overview.propertyCount],["عروض الطلبات",overview.requestOfferCount]].map(([k,v])=><div key={String(k)} className="rounded-2xl border bg-[var(--color-surface)] p-5"><strong className="text-2xl">{Number(v??0)}</strong><p>{k}</p></div>)}</div><div className="mt-5 flex flex-wrap gap-3"><Link href={`/dashboard/office/profile?org=${ctx.organization.id}`}>الملف</Link><Link href={`/dashboard/office/members?org=${ctx.organization.id}`}>الأعضاء</Link><Link href={`/dashboard/office/branches?org=${ctx.organization.id}`}>الفروع</Link></div></div></OfficeWorkspaceShell>;
}
