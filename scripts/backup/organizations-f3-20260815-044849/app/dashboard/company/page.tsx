import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, organizationMembers, organizationBranches } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import CompanyWorkspaceShell from "@/src/components/company/CompanyWorkspaceShell";
import Button from "@/src/components/ui/Button";
import { Building2, Users, Briefcase, MapPin, TrendingUp, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const CLASSIFICATION_LABELS: Record<string, string> = {
  startup: "ناشئة",
  sme: "صغيرة ومتوسطة",
  established: "راسخة",
  enterprise: "مؤسسة كبيرة",
};

async function getCompanyData(userId: string) {
  const { db, end } = getDb();
  try {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
      .limit(1);

    if (!member) return null;

    const [company] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, member.organizationId), eq(organizations.type, "business")))
      .limit(1);

    if (!company) return null;

    const [membersCount] = await db
      .select({ count: eq(organizationMembers.organizationId, company.id) })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, company.id));

    const [branchesCount] = await db
      .select({ count: eq(organizationBranches.organizationId, company.id) })
      .from(organizationBranches)
      .where(eq(organizationBranches.organizationId, company.id));

    return {
      company,
      member,
      membersCount: Number(membersCount?.count ?? 0),
      branchesCount: Number(branchesCount?.count ?? 0),
    };
  } finally {
    await end();
  }
}

export default async function CompanyDashboardPage() {
  const session = await getSession();
  if (!session) {
    return (
      <CompanyWorkspaceShell activeTab="dashboard">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مساحة عمل شركتك.
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const data = await getCompanyData(session.userId);
  if (!data) {
    return (
      <CompanyWorkspaceShell activeTab="dashboard">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Building2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">ليس لديك شركة</h2>
          <p className="mb-6 text-gray-500">أنشئ شركتك الآن للاستفادة من ميزات المنصة</p>
          <Link href="/dashboard/company/profile">
            <Button variant="primary">إنشاء شركة</Button>
          </Link>
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const { company, member, membersCount, branchesCount } = data;
  const isAdmin = member.role === "owner" || member.role === "admin";

  const stats = [
    { label: "الأعضاء", value: membersCount, icon: Users, color: "text-blue-600 dark:text-blue-300" },
    { label: "الفروع", value: branchesCount, icon: MapPin, color: "text-emerald-600 dark:text-emerald-300" },
  ];

  const quickActions = [
    { label: "إدارة الخدمات", href: "/dashboard/company/services", icon: Briefcase, color: "text-blue-600" },
    { label: "الأعضاء", href: "/dashboard/company/members", icon: Users, color: "text-purple-600" },
    { label: "الفروع", href: "/dashboard/company/branches", icon: MapPin, color: "text-emerald-600" },
    { label: "المشاريع", href: "/dashboard/company/portfolio", icon: TrendingUp, color: "text-orange-600" },
  ];

  return (
    <CompanyWorkspaceShell activeTab="dashboard">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl dark:bg-purple-900/40">
            🏢
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {company.nameAr ?? company.nameEn ?? "شركة بدون اسم"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {CLASSIFICATION_LABELS[company.classification] ?? company.classification}
              {company.verifiedAt ? " · موثقة" : " · غير موثقة بعد"}
            </p>
          </div>
        </div>
        <Link href="/dashboard/company/profile">
          <Button variant="secondary" size="sm">تعديل الملف</Button>
        </Link>
      </div>

      {company.status !== "active" && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <Clock className="h-4 w-4" />
          حالة الشركة: {company.status === "pending_review" ? "قيد المراجعة" : company.status}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
            <stat.icon className={`mx-auto mb-2 h-6 w-6 ${stat.color}`} />
            <div className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <CheckCircle className="mx-auto mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-300" />
          <div className="text-2xl font-black text-gray-900 dark:text-white">{company.verifiedAt ? "نعم" : "لا"}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">شركة موثقة</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center transition hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <action.icon className={`mx-auto mb-2 h-8 w-8 ${action.color}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          أنت {member.role === "owner" ? "مالك" : "مدير"} هذه الشركة — لديك صلاحية إدارة الأعضاء وملف الشركة.
        </div>
      )}
    </CompanyWorkspaceShell>
  );
}
