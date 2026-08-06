import Link from "next/link";
import type { Locale } from "@/src/types/site";
import type { Translation } from "@/src/types/site";

type Props = {
  locale: Locale;
  copy: Translation;
};

export default function Footer({ locale, copy }: Props) {
  const labels = {
    ar: { quick: "روابط سريعة", useful: "روابط مفيدة", contact: "تواصل معنا", rights: "جميع الحقوق محفوظة" },
    en: { quick: "Quick Links", useful: "Useful Links", contact: "Contact Us", rights: "All rights reserved" },
    tr: { quick: "Hızlı Bağlantılar", useful: "Faydalı Bağlantılar", contact: "Bize Ulaşın", rights: "Tüm hakları saklıdır" },
  };
  const t = labels[locale] || labels.en;

  return (
    <footer className="shared-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <strong>{copy.brandTitle}</strong>
            <p>{copy.footerDescription}</p>
          </div>
          <div>
            <h3>{t.quick}</h3>
            <Link href="/">{locale === "ar" ? "الرئيسية" : locale === "tr" ? "Ana Sayfa" : "Home"}</Link>
            <Link href="/properties">{locale === "ar" ? "العقارات" : locale === "tr" ? "Gayrimenkuller" : "Properties"}</Link>
            <Link href="/services">{locale === "ar" ? "الخدمات" : locale === "tr" ? "Hizmetler" : "Services"}</Link>
            <Link href="/tools">{locale === "ar" ? "الأدوات" : locale === "tr" ? "Araçlar" : "Tools"}</Link>
          </div>
          <div>
            <h3>{t.useful}</h3>
            <Link href="/services">{locale === "ar" ? "الخدمات" : locale === "tr" ? "Hizmetler" : "Services"}</Link>
          </div>
          <div>
            <h3>{t.contact}</h3>
            <p>{copy.contactEmail}</p>
            <p>{copy.contactLocation}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} {copy.brandTitle} — {t.rights}</span>
        </div>
      </div>
    </footer>
  );
}
