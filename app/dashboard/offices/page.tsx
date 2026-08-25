// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listUserOrganizationWorkspaces } from "@/lib/amrs/workspace";
export const dynamic = "force-dynamic";

export default async function MyOfficesPage() {
  const session = await getSession();
  if (!session?.userId) return <main className="mx-auto max-w-5xl p-6" dir="rtl"><h1 className="text-2xl font-black">مكاتبي</h1><p className="mt-4">سجّل الدخول لعرض عضوياتك.</p></main>;
  const rows = await listUserOrganizationWorkspaces(session.userId, "office");
  return <main className="mx-auto max-w-5xl p-6" dir="rtl">
    <h1 className="text-2xl font-black">مكاتبي</h1>
    <p className="mt-1 text-sm text-gray-500">تظهر هنا المؤسسات التي أنت عضو فعلي فيها فقط.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {rows.map(({ organization, membership }) => <Link key={organization.id} href={`/dashboard/office?org=${organization.id}`} className="rounded-2xl border bg-[var(--color-surface)] p-5 hover:shadow-sm">
        <div className="flex items-center justify-between gap-3"><strong>{organization.nameAr ?? organization.nameEn ?? "مؤسسة"}</strong><span className="text-xs">{membership.role}</span></div>
        <p className="mt-2 text-sm text-gray-500">{organization.type === "law_office" ? "مكتب قانوني" : "مكتب عقاري"} · {organization.status}</p>
      </Link>)}
      {rows.length === 0 && <p className="text-gray-500">لا توجد عضوية مكتب مرتبطة بحسابك.</p>}
    </div>
  </main>;
}
