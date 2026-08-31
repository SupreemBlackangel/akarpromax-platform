"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell, BookmarkCheck, Building2, BriefcaseBusiness, ClipboardList, Gavel,
  Heart, Home, LayoutDashboard, MessageSquare, MonitorSmartphone, Plus,
  Settings, ShieldCheck, UserRound, Wrench,
} from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import { PERMISSIONS } from "@/src/constants/permissions";

type Tri = { ar: string; en: string; tr: string };
type CardDef = { href: string; icon: LucideIcon; title: Tri; description: Tri; accent?: string };
type SectionDef = { key: string; title: Tri; cards: CardDef[] };

const tr = (ar: string, en: string, trs: string): Tri => ({ ar, en, tr: trs });

export default function DashboardHomePage() {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();

  const isAdmin = viewer.permissions.includes(PERMISSIONS.ADMIN_DASHBOARD_VIEW);
  const isSupervisor =
    viewer.permissions.includes(PERMISSIONS.SERVICE_PROVIDERS_REVIEW) ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL);
  const isProvider =
    viewer.role === "service_provider" ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN) ||
    viewer.permissions.includes(PERMISSIONS.SERVICE_JOBS_MANAGE_OWN);
  const hasOffice = viewer.permissions.includes(PERMISSIONS.OFFICE_INTEGRATION_VIEW);

  const sections: SectionDef[] = [
    {
      key: "properties",
      title: tr("عقاراتي", "My properties", "Mülklerim"),
      cards: [
        { href: "/dashboard/properties", icon: Home, title: tr("عقاراتي", "My properties", "Mülklerim"), description: tr("إدارة عقاراتك المنشورة وحالتها", "Manage your listings and their status", "İlanlarınızı ve durumlarını yönetin") },
        { href: "/dashboard/properties/new", icon: Plus, title: tr("إضافة عقار", "Add a property", "Mülk ekle"), description: tr("انشر عقاراً جديداً للمراجعة", "Publish a new listing for review", "İnceleme için yeni ilan yayınlayın"), accent: "emerald" },
        { href: "/dashboard/auctions", icon: Gavel, title: tr("مزاداتي", "My auctions", "Müzayedelerim"), description: tr("متابعة مزاداتك وإنشاء مزاد جديد", "Track your auctions and start new ones", "Müzayedelerinizi takip edin") },
        { href: "/dashboard/properties/favorites", icon: Heart, title: tr("المفضلة", "Favorites", "Favoriler"), description: tr("العقارات التي حفظتها", "Listings you saved", "Kaydettiğiniz ilanlar") },
        { href: "/dashboard/properties/saved-searches", icon: BookmarkCheck, title: tr("بحوثي المحفوظة", "Saved searches", "Kayıtlı aramalar"), description: tr("تنبيهات بحث العقارات", "Your property search alerts", "Emlak arama uyarılarınız") },
        { href: "/dashboard/properties/property-requests", icon: ClipboardList, title: tr("طلبات العقارات", "Property requests", "Mülk talepleri"), description: tr("اطلب عقاراً بمواصفاتك وتابع الطلبات", "Request a property and track it", "Mülk talep edin ve takip edin") },
      ],
    },
    {
      key: "services",
      title: tr("الخدمات", "Services", "Hizmetler"),
      cards: [
        {
          href: isSupervisor ? "/dashboard/services/supervisor" : "/dashboard/services",
          icon: Wrench,
          title: isSupervisor ? tr("إشراف الخدمات", "Services supervision", "Hizmet denetimi") : tr("خدماتي", "My services", "Hizmetlerim"),
          description: isSupervisor
            ? tr("إدارة طلبات ومقدمي الخدمات", "Manage requests and providers", "Talepleri ve sağlayıcıları yönetin")
            : isProvider
              ? tr("طلبات مناسبة، عروض، ومهام", "Matched requests, offers and jobs", "Uygun talepler, teklifler ve işler")
              : tr("طلباتي وعروضي ومهامي", "My requests, offers and jobs", "Taleplerim, tekliflerim ve işlerim"),
        },
        { href: "/service-requests/new", icon: Plus, title: tr("انشر طلب خدمة", "Post a service request", "Hizmet talebi yayınla"), description: tr("اطلب خدمة واستقبل العروض", "Request a service and receive offers", "Hizmet isteyin, teklif alın"), accent: "emerald" },
        { href: "/dashboard/services/inbox", icon: MessageSquare, title: tr("صندوق الرسائل", "Inbox", "Gelen kutusu"), description: tr("محادثات الطلبات والمهام", "Request and job conversations", "Talep ve iş konuşmaları") },
        { href: "/dashboard/services/notifications", icon: Bell, title: tr("التنبيهات", "Notifications", "Bildirimler"), description: tr("آخر المستجدات على طلباتك", "Latest updates on your activity", "Etkinliğinizle ilgili güncellemeler") },
        ...(isProvider
          ? [{ href: "/dashboard/services/provider-profile", icon: UserRound, title: tr("ملفي المهني", "My professional profile", "Profesyonel profilim"), description: tr("تحديث بياناتك وخدماتك", "Update your details and services", "Bilgilerinizi güncelleyin") }]
          : []),
      ],
    },
    {
      key: "organizations",
      title: tr("المكاتب والشركات", "Offices & companies", "Ofisler ve şirketler"),
      cards: [
        { href: "/dashboard/offices", icon: Building2, title: tr("مكاتبي العقارية", "My real-estate offices", "Emlak ofislerim"), description: tr("مساحات عمل مكاتبك العقارية", "Your office workspaces", "Ofis çalışma alanlarınız") },
        { href: "/dashboard/companies", icon: BriefcaseBusiness, title: tr("شركاتي", "My companies", "Şirketlerim"), description: tr("مساحات عمل شركاتك", "Your company workspaces", "Şirket çalışma alanlarınız") },
        ...(hasOffice
          ? [{ href: "/dashboard/office/integration", icon: MonitorSmartphone, title: tr("البرنامج المكتبي", "Office app link", "Ofis programı"), description: tr("الأجهزة والربط والرادار والمزامنة", "Devices, pairing, radar and sync", "Cihazlar, eşleştirme ve senkron") }]
          : []),
      ],
    },
    {
      key: "account",
      title: tr("الحساب", "Account", "Hesap"),
      cards: [
        { href: "/account/security", icon: Settings, title: tr("الحساب والأمان", "Account & security", "Hesap ve güvenlik"), description: tr("كلمة المرور وإعدادات الدخول", "Password and sign-in settings", "Şifre ve giriş ayarları") },
        ...(isAdmin
          ? [{ href: "/admin", icon: ShieldCheck, title: tr("لوحة الإدارة", "Admin panel", "Yönetim paneli"), description: tr("إدارة المنصة والمحتوى والمستخدمين", "Manage the platform, content and users", "Platformu ve kullanıcıları yönetin"), accent: "amber" }]
          : []),
      ],
    },
  ];

  const heading = tr("لوحة التحكم", "Dashboard", "Panel");
  const loginTitle = tr("سجّل الدخول للوصول إلى لوحة التحكم", "Sign in to access your dashboard", "Panelinize erişmek için giriş yapın");
  const loginBody = tr("ادخل لتتابع عقاراتك وطلباتك ورسائلك من مكان واحد", "Sign in to manage your listings, requests and messages in one place", "İlanlarınızı ve taleplerinizi tek yerden yönetin");
  const loginCta = tr("تسجيل الدخول", "Sign in", "Giriş yap");

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/dashboard"
      adLayout={{ mode: "safe-no-ads" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <PageContainer className="py-8" dir={dir}>
        {!viewer.authenticated ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <LayoutDashboard className="h-7 w-7" />
            </span>
            <h1 className="mb-2 text-2xl font-black text-[var(--color-text-primary)]">{loginTitle[locale]}</h1>
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">{loginBody[locale]}</p>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              {loginCta[locale]}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{heading[locale]}</h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {viewer.displayName} • {viewer.email}
              </p>
            </div>

            <div className="space-y-9">
              {sections.map((section) => (
                <section key={section.key}>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
                    {section.title[locale]}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {section.cards.map((card) => {
                      const Icon = card.icon;
                      const iconClasses =
                        card.accent === "emerald"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                          : card.accent === "amber"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
                      return (
                        <Link
                          key={card.href}
                          href={card.href}
                          className="group flex items-start gap-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md"
                        >
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${iconClasses}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-black text-[var(--color-text-primary)] transition group-hover:text-[var(--color-primary)]">
                              {card.title[locale]}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">
                              {card.description[locale]}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
