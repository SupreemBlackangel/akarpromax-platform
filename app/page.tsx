'use client';

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import HomeFeatured from "@/src/components/home/HomeFeatured";
import HomeFeaturedCompanies from "@/src/components/home/HomeFeaturedCompanies";
import HomeFeaturedOffices from "@/src/components/home/HomeFeaturedOffices";
import HomeFeaturedProviders from "@/src/components/home/HomeFeaturedProviders";

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
        <div dir={dir} className="bg-background">
          <HomeFeatured />
          <HomeFeaturedCompanies />
          <HomeFeaturedOffices />
          <HomeFeaturedProviders locale={locale} />
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
