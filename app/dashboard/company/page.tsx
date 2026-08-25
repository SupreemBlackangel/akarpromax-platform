// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getCompanyOverview } from "@/lib/amrs/company-dashboard";
import CompanyWorkspaceShell from "@/src/components/company/CompanyWorkspaceShell";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "company", q.org) : null;
  if (!ctx) return <CompanyWorkspaceShell activeTab="dashboard"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية شركة مخولة.</div></CompanyWorkspaceShell>;
  const overview = await getCompanyOverview(ctx.organization.id);
  return <CompanyWorkspaceShell activeTab="dashboard"><div data-org-id={ctx.organization.id}>
    <h2 className="text-xl font-black">{ctx.organization.nameAr ?? ctx.organization.nameEn}</h2>
    <p className="mt-1 text-sm text-gray-500">{ctx.organization.status} · {ctx.organization.verifiedAt ? "موثقة" : "غير موثقة"}</p>
    <div className="mt-5 grid grid-cols-2 gap-4"><div className="rounded-2xl border bg-[var(--color-surface)] p-5"><strong className="text-2xl">{overview.memberCount}</strong><p>الأعضاء</p></div><div className="rounded-2xl border bg-[var(--color-surface)] p-5"><strong className="text-2xl">{overview.branchCount}</strong><p>الفروع</p></div></div>
    <div className="mt-5 flex flex-wrap gap-3"><Link href={`/dashboard/company/profile?org=${ctx.organization.id}`}>الملف</Link><Link href={`/dashboard/company/members?org=${ctx.organization.id}`}>الأعضاء</Link><Link href={`/dashboard/company/branches?org=${ctx.organization.id}`}>الفروع</Link><Link href={`/dashboard/company/services?org=${ctx.organization.id}`}>الخدمات</Link></div>
  </div></CompanyWorkspaceShell>;
}
