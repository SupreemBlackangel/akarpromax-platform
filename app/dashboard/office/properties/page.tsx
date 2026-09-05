// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getOfficeProperties } from "@/lib/amrs/office-dashboard";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: "معتمد", cls: "bg-emerald-500/15 text-emerald-600" },
  pending_review: { label: "قيد المراجعة", cls: "bg-amber-500/15 text-amber-600" },
  draft: { label: "مسودة", cls: "bg-slate-500/15 text-slate-600" },
  archived: { label: "مؤرشف", cls: "bg-slate-500/15 text-slate-500" },
  rejected: { label: "مرفوض", cls: "bg-rose-500/15 text-rose-600" },
};

function empty(children: React.ReactNode) {
  return <OfficeWorkspaceShell activeTab="properties"><div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-[var(--color-text-secondary)]">{children}</div></OfficeWorkspaceShell>;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await getSession();
  const q = await searchParams;
  const ctx = session?.userId ? await resolveUserOrganizationWorkspace(session.userId, "office", q.org) : null;
  if (!ctx) return empty("لا توجد عضوية مكتب مخوّلة لحسابك الحالي.");
  if (ctx.organization.type !== "real_estate") {
    return (
      <OfficeWorkspaceShell activeTab="properties">
        <div data-org-id={ctx.organization.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-[var(--color-text-secondary)]">
          إدارة العقارات متاحة للمكاتب العقارية فقط.
        </div>
      </OfficeWorkspaceShell>
    );
  }

  const rows = await getOfficeProperties(ctx.organization.id);
  const name = ctx.organization.nameAr ?? ctx.organization.nameEn;
  const approved = rows.filter((p) => String(p.status) === "approved").length;

  return (
    <OfficeWorkspaceShell activeTab="properties">
      <div data-org-id={ctx.organization.id} className="space-y-5">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div>
            <h2 className="text-xl font-black text-[var(--color-text-primary)]">عقارات {name}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{rows.length} عقار · {approved} معتمد</p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] text-[var(--color-primary)]">
            <Building2 size={20} />
          </span>
        </div>

        {rows.length === 0 ? (
          empty("لا توجد عقارات مرتبطة بهذا المكتب بعد. عند نشر عقار من التطبيق المكتبي سيظهر هنا مباشرة.")
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => {
              const st = STATUS[String(p.status)] ?? { label: String(p.status ?? ""), cls: "bg-slate-500/15 text-slate-600" };
              return (
                <Link
                  key={String(p.id)}
                  href={`/properties/${p.id}`}
                  className="group flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] transition group-hover:bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] group-hover:text-[var(--color-primary)]">
                      <Building2 size={16} />
                    </span>
                  </div>
                  <strong className="line-clamp-2 text-[15px] font-black text-[var(--color-text-primary)]">{String(p.titleAr ?? "عقار")}</strong>
                  {p.city ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                      <MapPin size={13} /> {String(p.city)}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </OfficeWorkspaceShell>
  );
}
