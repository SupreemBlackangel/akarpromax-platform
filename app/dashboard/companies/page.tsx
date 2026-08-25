// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listUserOrganizationWorkspaces } from "@/lib/amrs/workspace";
export const dynamic = "force-dynamic";

export default async function MyCompaniesPage() {
  const session = await getSession();
  if (!session?.userId) return <main className="mx-auto max-w-5xl p-6" dir="rtl"><h1 className="text-2xl font-black">شركاتي</h1><p className="mt-4">سجّل الدخول لعرض عضوياتك.</p></main>;
  const rows = await listUserOrganizationWorkspaces(session.userId, "company");
  return <main className="mx-auto max-w-5xl p-6" dir="rtl">
    <h1 className="text-2xl font-black">شركاتي</h1>
    <p className="mt-1 text-sm text-gray-500">لا تعرض هذه الصفحة الشركات العامة؛ تعرض عضوياتك فقط.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {rows.map(({ organization, membership }) => <Link key={organization.id} href={`/dashboard/company?org=${organization.id}`} className="rounded-2xl border bg-[var(--color-surface)] p-5 hover:shadow-sm">
        <div className="flex items-center justify-between gap-3"><strong>{organization.nameAr ?? organization.nameEn ?? "شركة"}</strong><span className="text-xs">{membership.role}</span></div>
        <p className="mt-2 text-sm text-gray-500">{organization.classification} · {organization.status}</p>
      </Link>)}
      {rows.length === 0 && <p className="text-gray-500">لا توجد عضوية شركة مرتبطة بحسابك.</p>}
    </div>
  </main>;
}
