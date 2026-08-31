// Unified server-side "my offices / my companies" membership picker.
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listUserOrganizationWorkspaces } from "@/lib/amrs/workspace";

type Props = { kind: "office" | "company" };

const COPY = {
  office: {
    title: "مكاتبي العقارية",
    subtitle: "تظهر هنا المؤسسات التي أنت عضو فعلي فيها فقط.",
    empty: "لا توجد عضوية مكتب مرتبطة بحسابك.",
    fallbackName: "مؤسسة",
    workspaceHref: "/dashboard/office",
  },
  company: {
    title: "شركاتي",
    subtitle: "لا تعرض هذه الصفحة الشركات العامة؛ تعرض عضوياتك فقط.",
    empty: "لا توجد عضوية شركة مرتبطة بحسابك.",
    fallbackName: "شركة",
    workspaceHref: "/dashboard/company",
  },
} as const;

export default async function OrgMembershipsPage({ kind }: Props) {
  const copy = COPY[kind];
  const session = await getSession();

  if (!session?.userId) {
    return (
      <main className="mx-auto max-w-5xl p-6" dir="rtl">
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{copy.title}</h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">سجّل الدخول لعرض عضوياتك.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-bold text-[var(--color-primary)] hover:underline">← لوحة التحكم</Link>
      </main>
    );
  }

  const rows = await listUserOrganizationWorkspaces(session.userId, kind);

  return (
    <main className="mx-auto max-w-5xl p-6" dir="rtl">
      <Link href="/dashboard" className="mb-2 inline-block text-xs font-bold text-[var(--color-primary)] hover:underline">← لوحة التحكم</Link>
      <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{copy.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.subtitle}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map(({ organization, membership }) => (
          <Link
            key={organization.id}
            href={`${copy.workspaceHref}?org=${organization.id}`}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-[var(--color-text-primary)]">{organization.nameAr ?? organization.nameEn ?? copy.fallbackName}</strong>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">{membership.role}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {kind === "office"
                ? (organization.type === "law_office" ? "مكتب قانوني" : "مكتب عقاري")
                : organization.classification}
              {" · "}
              {organization.status}
            </p>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-[var(--color-text-muted)]">{copy.empty}</p>}
      </div>
    </main>
  );
}
