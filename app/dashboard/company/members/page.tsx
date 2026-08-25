// ORGANIZATIONS_F3_WORKSPACE
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getCompanyMembers } from "@/lib/amrs/company-dashboard";
import CompanyWorkspaceShell from "@/src/components/company/CompanyWorkspaceShell";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "company", q.org) : null;
  if (!ctx) return <CompanyWorkspaceShell activeTab="members"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية شركة مخولة.</div></CompanyWorkspaceShell>;
  const rows = await getCompanyMembers(ctx.organization.id);
  return <CompanyWorkspaceShell activeTab="members"><div data-org-id={ctx.organization.id}><h2 className="mb-4 text-xl font-black">أعضاء {ctx.organization.nameAr ?? ctx.organization.nameEn}</h2><div className="rounded-2xl border bg-[var(--color-surface)]">{rows.map(({member,user}) => <div key={member.id} className="flex justify-between border-b p-4"><span>{user.name ?? user.email}</span><span>{member.role} · {member.status}</span></div>)}</div></div></CompanyWorkspaceShell>;
}
