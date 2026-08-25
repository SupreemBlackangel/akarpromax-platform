"use client";
// ORGANIZATIONS_F3_WORKSPACE
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Props = { activeTab: string; children: ReactNode };

const TABS = [
  ["dashboard", "لوحة التحكم", "/dashboard/company"],
  ["profile", "ملف الشركة", "/dashboard/company/profile"],
  ["members", "الأعضاء", "/dashboard/company/members"],
  ["branches", "الفروع", "/dashboard/company/branches"],
  ["services", "الخدمات", "/dashboard/company/services"],
] as const;

function CompanyWorkspaceShellContent({ activeTab, children }: Props) {
  const search = useSearchParams();
  const org = search.get("org");
  const href = (path: string) => org ? `${path}?org=${encodeURIComponent(org)}` : path;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:flex lg:gap-6 lg:px-8">
        <aside className="mb-4 lg:mb-0 lg:w-64 lg:shrink-0">
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-2 dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-6 lg:flex-col">
            {TABS.map(([key, label, path]) => (
              <Link key={key} href={href(path)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${activeTab === key ? "bg-[var(--color-primary)] text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-5">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">مساحة عمل الشركة</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الشركة حسب عضوية المستخدم وصلاحياته الفعلية.</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
// F3_SHELL_SUSPENSE_FIX
export function CompanyWorkspaceShell(props: Props) {
  return (
    <Suspense fallback={<div dir="rtl" className="min-h-screen p-6">جاري التحميل...</div>}>
      <CompanyWorkspaceShellContent {...props} />
    </Suspense>
  );
}

export default CompanyWorkspaceShell;
