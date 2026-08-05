"use client";

import type { Locale, ViewerContext } from "@/src/types/site";
import type { Translation } from "@/src/types/site";
import Header from "@/src/components/shared/Header";
import Footer from "@/src/components/shared/Footer";
import NewsTicker from "@/src/components/NewsTicker";
import AdSlot from "@/src/components/AdSlot";

type Props = {
  locale: Locale;
  copy: Translation;
  viewer: ViewerContext;
  country: string;
  city: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  onLogin: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};

export default function PublicPageShell({
  locale,
  copy,
  viewer,
  country,
  city,
  deviceType = "desktop",
  onLogin,
  onLogout,
  children,
}: Props) {
  return (
    <div className="public-page-shell">
      <Header
        locale={locale}
        copy={copy}
        viewer={viewer}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <NewsTicker copy={copy} locale={locale} country={country} city={city} />
      <main className="public-main">
        <AdSlot
          placement="global_header"
          locale={locale}
          country={country}
          city={city}
          deviceType={deviceType}
          variant="horizontal"
          className="container mt-4"
        />
        {children}
        <AdSlot
          placement="global_footer"
          locale={locale}
          country={country}
          city={city}
          deviceType={deviceType}
          variant="horizontal"
          className="container mb-4"
        />
      </main>
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
