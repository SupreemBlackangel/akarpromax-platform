'use client';

import Link from "next/link";
import dynamic from "next/dynamic";
import { Building2, Briefcase, GraduationCap, Home, ArrowLeft } from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";

const HomeFeatured = dynamic(() => import("@/src/components/home/HomeFeatured"), { ssr: false });
const HomeNewsBand = dynamic(() => import("@/src/components/home/HomeNewsBand"), { ssr: false });

const SECTIONS = [
  { href: "/properties", icon: Home, title: "العقارات", description: "شقق، فلل، أراضٍ ومباني للبيع والإيجار", tone: "bg-primary-soft text-primary" },
  { href: "/offices", icon: Building2, title: "المكاتب العقارية", description: "اكتشف المكاتب الموثوقة واعرض خدماتها", tone: "bg-emerald-50 text-emerald-600" },
  { href: "/services", icon: Briefcase, title: "الخدمات المهنية", description: "استشارات قانونية وهندسية وخبرة عقارية", tone: "bg-violet-50 text-violet-600" },
  { href: "/knowledge", icon: GraduationCap, title: "المعرفة العقارية", description: "مقالات وأدلة تساعدك على اتخاذ قرارك", tone: "bg-amber-50 text-amber-600" },
];

export default function HomePage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  return (
    <>
      <PublicPageShell
        locale={locale}
        copy={copy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath="/"
        adLayout={{ mode: "standard", family: "home" }}
        officePromotion={{
          cta: "جرب مكتب بروماكس",
          description: "أدر عقارك وعروضك من مكتبك الاحترافي مع أدوات ذكية وربط مباشر بالمنصة.",
          href: "/offices",
        }}
        onLogin={() => openLogin("login")}
        onLogout={handleLogout}
      >
        <div dir={dir} className="bg-background text-slate-900">
          <HomeFeatured />

          <section className="border-y border-slate-200 bg-white">
            <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16">
              <div className="mb-8 text-center">
                <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
                  <span className="h-0.5 w-5 rounded-full bg-primary" />
                  كل ما تحتاجه في مكان واحد
                </span>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">استكشف المنصة</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {SECTIONS.map(({ href, icon: Icon, title, description, tone }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                  >
                    <span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone}`}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-primary opacity-0 transition group-hover:opacity-100">
                      تصفح الآن
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <HomeNewsBand />

          <section className="bg-gradient-to-l from-primary via-primary-hover to-[#0a3c8f] text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-14 text-center sm:py-16">
              <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">هل أنت صاحب مكتب عقاري؟</h2>
              <p className="max-w-xl text-sm font-medium leading-relaxed text-blue-100">
                انضم إلى عقار بروماكس واعرض عقاراتك لملايين الباحثين، وتابع عروضك وعملاءك من لوحة تحكم واحدة.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/offices"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition hover:bg-amber-50"
                >
                  استكشف المكاتب
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  أنشئ حسابك
                </Link>
              </div>
            </div>
          </section>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
