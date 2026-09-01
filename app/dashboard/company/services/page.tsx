// ORGANIZATIONS_F3_WORKSPACE
import { getSession } from "@/lib/auth/session";
import CompanyWorkspaceShell from "@/src/components/company/CompanyWorkspaceShell";
import { Briefcase } from "lucide-react";
import { resolveUserOrganizationWorkspace } from "@/lib/amrs/workspace";
import { getCompanyMemberUsers, getCompanyServicesByEmails } from "@/lib/amrs/company-dashboard";

export const dynamic = "force-dynamic";

async function getCompany(userId: string, requestedOrganizationId?: string) {
  const ctx = await resolveUserOrganizationWorkspace(userId, "company", requestedOrganizationId);
  if (!ctx) return null;
  const memberUsers = await getCompanyMemberUsers(ctx.organization.id);
  return { company: ctx.organization, member: ctx.membership, memberUsers };
}

export default async function CompanyServicesPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const q = await searchParams;
  const session = await getSession();
  if (!session) {
    return (
      <CompanyWorkspaceShell activeTab="services">
        <div className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          غير مصرح — سجّل الدخول للوصول إلى مساحة عمل شركتك.
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const ctx = await getCompany(session.userId, q.org);
  if (!ctx) {
    return (
      <CompanyWorkspaceShell activeTab="services">
        <div className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          ليس لديك شركة مرتبطة بحسابك.
        </div>
      </CompanyWorkspaceShell>
    );
  }

  const { company, memberUsers } = ctx;

  const emails = memberUsers.map((u) => u.email).filter((e): e is string => Boolean(e));
  const services = await getCompanyServicesByEmails(emails);

  return (
    <CompanyWorkspaceShell activeTab="services">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">الخدمات والمنتجات</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">الخدمات المقدمة عبر أعضاء {company.nameAr ?? company.nameEn}</p>
        </div>

      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Briefcase className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-400">لا توجد خدمات أو منتجات مرتبطة بأعضاء الشركة بعد.</p>
          <p className="mt-1 text-sm text-gray-400">أنشئ ملف مزوّد خدمات لأحد الأعضاء ثم أضف فئات الخدمات من سوق الخدمات.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div key={`${service.provider_id}-${service.category_name_ar ?? index}`} className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="text-xl">{service.category_icon ?? "🧰"}</span>
                <h3 className="font-bold text-gray-900 dark:text-[var(--color-text-primary)]">
                  {service.category_name_ar ?? service.category_name_en ?? "خدمة"}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {service.display_name_ar ?? service.display_name_en ?? service.business_name ?? "مزوّد الخدمة"}
              </p>
              {service.price_from !== null && (
                <p className="mt-2 text-lg font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)]">
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
