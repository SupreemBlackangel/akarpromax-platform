"use client";

import Link from "next/link";
import type { Locale, ViewerContext } from "@/src/types/site";
import Brand from "@/src/components/Brand";
import type { Translation } from "@/src/types/site";

type Props = {
  locale: Locale;
  copy: Translation;
  viewer: ViewerContext;
  onLogin: () => void;
  onLogout: () => void;
};

export default function Header({
  locale,
  copy,
  viewer,
  onLogin,
  onLogout,
}: Props) {

  return (
    <header className="shared-header">
      <div className="container header-inner">
        <Brand copy={copy} />

        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/">{locale === "ar" ? "الرئيسية" : locale === "tr" ? "Ana Sayfa" : "Home"}</Link>
          <Link href="/properties">{locale === "ar" ? "العقارات" : locale === "tr" ? "Gayrimenkuller" : "Properties"}</Link>
          <Link href="/services">{locale === "ar" ? "الخدمات" : locale === "tr" ? "Hizmetler" : "Services"}</Link>
          <Link href="/tools">{locale === "ar" ? "الأدوات" : locale === "tr" ? "Araçlar" : "Tools"}</Link>
        </nav>

        <div className="header-actions">
          {viewer.authenticated ? (
            <>
              <span className="header-account">{viewer.displayName || viewer.email}</span>
              <button type="button" className="header-logout" onClick={onLogout}>
                {locale === "ar" ? "خروج" : locale === "tr" ? "Çıkış" : "Logout"}
              </button>
            </>
          ) : (
            <button type="button" className="header-login" onClick={onLogin}>
              {copy.login}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
