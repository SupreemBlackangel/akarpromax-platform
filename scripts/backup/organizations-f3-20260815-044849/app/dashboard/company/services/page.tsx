import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizations, organizationMembers, users } from "@/lib/db/schema";
import { getServicesDb } from "@/lib/services/db";
import { getSession } from "@/lib/auth/session";
import CompanyWorkspaceShell from "@/src/components/company/CompanyWorkspaceShell";
import Button from "@/src/components/ui/Button";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCompany(userId: string) {
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

    const memberUsers = await db
      .select({ email: users.email, name: users.name })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, company.id));

    return { company, member, memberUsers };
  } finally {
    await end();
  }
}

type ServiceRow = {
  provider_id: string;
  category_name_ar: string | null;
  category_name_en: string | null;
  category_icon: string | null;
  price_from: number | null;
  price_to: number | null;
  pricing_unit: string | null;
  display_name_ar: string | null;
  display_name_en: string | null;
  business_name: string | null;
};

export default async function CompanyServicesPage() {
  const session = await getSession();
  if (!session) {
    return (
      <CompanyWorkspaceShell activeTab="services">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مساحة عمل شركتك.
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const ctx = await getCompany(session.userId);
  if (!ctx) {
    return (
      <CompanyWorkspaceShell activeTab="services">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          ليس لديك شركة مرتبطة بحسابك.
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const { company, memberUsers } = ctx;

  let services: ServiceRow[] = [];
  const emails = memberUsers.map((u) => u.email).filter((e): e is string => Boolean(e));
  if (emails.length > 0) {
    const servicesDb = await getServicesDb();
    try {
      const result = await servicesDb
        .prepare(
          `SELECT pc.provider_id, c.name_ar AS category_name_ar, c.name_en AS category_name_en, c.icon AS category_icon,
                  pc.price_from, pc.price_to, pc.pricing_unit,
                  p.display_name_ar, p.display_name_en, p.business_name
           FROM service_provider_categories pc
           LEFT JOIN service_categories c ON c.id = pc.category_id
           LEFT JOIN service_provider_profiles p ON p.id = pc.provider_id
           WHERE pc.is_active = 1 AND p.user_id IN (${emails.map(() => "?").join(", ")})
           ORDER BY c.sort_order ASC, p.display_name_ar ASC`,
        )
        .bind(...emails)
        .all<ServiceRow>();
      services = result.results ?? [];
    } catch {
      services = [];
    }
  }

  return (
    <CompanyWorkspaceShell activeTab="services">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-gray-900 dark:text-white">الخدمات والمنتجات</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">الخدمات المقدمة عبر أعضاء {company.nameAr ?? company.nameEn}</p>
        </div>
        <Link href="/dashboard/company/services/new">
          <Button variant="primary" size="sm">+ إضافة خدمة</Button>
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Briefcase className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-400">لا توجد خدمات أو منتجات مرتبطة بأعضاء الشركة بعد.</p>
          <p className="mt-1 text-sm text-gray-400">أنشئ ملف مزوّد خدمات لأحد الأعضاء ثم أضف فئات الخدمات من سوق الخدمات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div key={`${service.provider_id}-${service.category_name_ar ?? index}`} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="text-xl">{service.category_icon ?? "🧰"}</span>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {service.category_name_ar ?? service.category_name_en ?? "خدمة"}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {service.display_name_ar ?? service.display_name_en ?? service.business_name ?? "مزوّد الخدمة"}
              </p>
              {service.price_from !== null && (
                <p className="mt-2 text-lg font-bold text-blue-600 dark:text-blue-300">
                  {service.price_from.toLocaleString("en-US")}
                  {service.price_to !== null && service.price_to !== service.price_from
                    ? ` - ${service.price_to.toLocaleString("en-US")}`
                    : ""}{" "}
                  {service.pricing_unit === "hour" ? "/ساعة" : service.pricing_unit === "day" ? "/يوم" : service.pricing_unit ?? "ريال"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </CompanyWorkspaceShell>
  );
}
