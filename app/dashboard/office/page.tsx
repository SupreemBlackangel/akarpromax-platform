// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { Building2, Users, GitBranch, ClipboardList, ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficeOverview } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";

export const dynamic = "force-dynamic";

const STATS = [
  { key: "memberCount", label: "الأعضاء والوكلاء", icon: Users, href: "/dashboard/office/members" },
  { key: "branchCount", label: "الفروع", icon: GitBranch, href: "/dashboard/office/branches" },
  { key: "propertyCount", label: "العقارات المنشورة", icon: Building2, href: "/dashboard/office/properties" },
  { key: "requestOfferCount", label: "عروض الطلبات", icon: ClipboardList, href: "/dashboard/office/property-requests" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  active: "نشط", pending_review: "قيد المراجعة", draft: "مسودة", suspended: "موقوف", rejected: "مرفوض",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession();
  const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) {
    return (
      <OfficeWorkspaceShell activeTab="overview">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-[var(--color-text-secondary)]">
          لا توجد عضوية مكتب مخوّلة لحسابك الحالي.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const overview = await getOfficeOverview(ctx.organization.id);
  const org = ctx.organization;
  const name = org.nameAr ?? org.nameEn ?? "المكتب";
  const verified = Boolean(org.verifiedAt);
  const initials = name.trim().charAt(0);
  const values: Record<string, number> = {
    memberCount: overview.memberCount, branchCount: overview.branchCount,
    propertyCount: overview.propertyCount, requestOfferCount: overview.requestOfferCount,
  };
  const link = (path: string) => `${path}?org=${org.id}`;

  return (
    <OfficeWorkspaceShell activeTab="overview">
      <div data-org-id={org.id} className="space-y-5">
        {/* Identity header */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)] to-[color:color-mix(in_oklab,var(--color-primary),#000_35%)] p-6 text-white shadow-sm">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-4">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="h-16 w-16 rounded-2xl bg-white/90 object-contain p-1" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-2xl font-black">{initials}</div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-black">{name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-white/15 px-3 py-0.5 font-bold">{STATUS_LABEL[String(org.status)] ?? org.status}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 font-bold ${verified ? "bg-emerald-400/25" : "bg-white/10"}`}>
                  {verified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {verified ? "موثّق" : "غير موثّق"}
                </span>
                {org.countryCode ? <span className="rounded-full bg-white/10 px-3 py-0.5">{org.countryCode}{org.cityId ? ` · ${org.cityId}` : ""}</span> : null}
              </div>
            </div>
            <Link href={link("/dashboard/office/profile")} className="rounded-xl bg-white/95 px-4 py-2 text-sm font-bold text-[var(--color-primary)] transition hover:bg-white">
              تحرير الملف
            </Link>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map(({ key, label, icon: Icon, href }) => (
            <Link
              key={key}
              href={link(href)}
              className="group rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] text-[var(--color-primary)]">
                  <Icon size={18} />
                </span>
                <ArrowLeft size={16} className="text-[var(--color-text-secondary)] opacity-0 transition group-hover:opacity-100" />
              </div>
              <strong className="mt-3 block text-3xl font-black text-[var(--color-text-primary)]">{values[key] ?? 0}</strong>
              <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-3 text-sm font-black text-[var(--color-text-secondary)]">اختصارات</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ["الملف", "/dashboard/office/profile"],
              ["الأعضاء والوكلاء", "/dashboard/office/members"],
              ["الفروع", "/dashboard/office/branches"],
              ["عقارات المكتب", "/dashboard/office/properties"],
              ["المزامنة", "/dashboard/office/sync"],
            ].map(([label, href]) => (
              <Link key={href} href={link(href)} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </OfficeWorkspaceShell>
  );
}
