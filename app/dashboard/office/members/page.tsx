// ORGANIZATIONS_F3_WORKSPACE
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficeMembers } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession(); const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) return <OfficeWorkspaceShell activeTab="members"><div className="rounded-2xl border bg-[var(--color-surface)] p-10">لا توجد عضوية مكتب مخولة.</div></OfficeWorkspaceShell>;
  const rows = await getOfficeMembers(ctx.organization.id);
  return <OfficeWorkspaceShell activeTab="members"><div data-org-id={ctx.organization.id}>
    <h2 className="mb-4 text-xl font-black">أعضاء {ctx.organization.nameAr ?? ctx.organization.nameEn}</h2>
    <div className="overflow-x-auto rounded-2xl border bg-[var(--color-surface)]"><table className="w-full text-sm"><thead><tr><th className="p-3 text-right">العضو</th><th className="p-3 text-right">الدور</th><th className="p-3 text-right">الحالة</th></tr></thead><tbody>
      {rows.map(({member,user}) => <tr key={member.id} className="border-t"><td className="p-3">{user.name ?? user.email}</td><td className="p-3">{member.role}</td><td className="p-3">{member.status}</td></tr>)}
    </tbody></table></div>
  </div></OfficeWorkspaceShell>;
}
