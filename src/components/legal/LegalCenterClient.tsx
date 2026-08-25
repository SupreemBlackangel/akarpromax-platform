"use client";

import Link from "next/link";

import PageContainer from "@/src/components/layout/PageContainer";
import PublicPageShell from "@/src/components/PublicPageShell";
import { LEGAL_DOCUMENT_MAP } from "@/src/content/legal-center";
import { useServicesPage } from "@/src/components/services/useServicesPage";

type Props = {
  slug?: string[];
};

function getDocument(slug: string[] | undefined) {
  return LEGAL_DOCUMENT_MAP.get((slug ?? []).join("/")) ?? LEGAL_DOCUMENT_MAP.get("")!;
}

export default function LegalCenterClient({ slug }: Props) {
  const { locale, viewer, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const doc = getDocument(slug);
  const currentPath = `/legal${slug?.length ? `/${slug.join("/")}` : ""}`;

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath={currentPath}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: locale === "ar" ? "المركز القانوني" : locale === "tr" ? "Hukuk Merkezi" : "Legal Center",
        title: doc.title,
        description: doc.description,
      }}
    >
      <PageContainer className="py-8" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="mb-6 flex flex-wrap gap-2 text-sm font-semibold text-[var(--color-primary)] dark:text-[var(--color-primary)]">
          {[
            ["/legal", locale === "ar" ? "المركز القانوني" : locale === "tr" ? "Hukuk Merkezi" : "Legal Center"],
            ["/legal/terms", locale === "ar" ? "الشروط العامة" : locale === "tr" ? "Genel Şartlar" : "General Terms"],
            ["/legal/privacy", locale === "ar" ? "الخصوصية" : locale === "tr" ? "Gizlilik" : "Privacy"],
            ["/legal/marketplace", locale === "ar" ? "إطار السوق" : locale === "tr" ? "Pazar Çerçevesi" : "Marketplace"],
            ["/legal/services", locale === "ar" ? "سوق الخدمات" : locale === "tr" ? "Hizmet Pazarı" : "Services"],
            ["/legal/real-estate", locale === "ar" ? "السوق العقاري" : locale === "tr" ? "Gayrimenkul Pazarı" : "Real Estate"],
            ["/legal/providers", locale === "ar" ? "شروط المزودين" : locale === "tr" ? "Sağlayıcı Şartları" : "Providers"],
            ["/legal/advertising", locale === "ar" ? "الإعلانات" : locale === "tr" ? "Reklam" : "Advertising"],
            ["/legal/reviews", locale === "ar" ? "المراجعات" : locale === "tr" ? "Yorumlar" : "Reviews"],
            ["/legal/disputes", locale === "ar" ? "النزاعات" : locale === "tr" ? "Uyuşmazlıklar" : "Disputes"],
            ["/legal/acceptable-use", locale === "ar" ? "الاستخدام المقبول" : locale === "tr" ? "Kabul Edilebilir Kullanım" : "Acceptable Use"],
            ["/legal/intellectual-property", locale === "ar" ? "الملكية الفكرية" : locale === "tr" ? "Fikri Mülkiyet" : "IP"],
            ["/legal/data-retention", locale === "ar" ? "الاحتفاظ بالبيانات" : locale === "tr" ? "Veri Saklama" : "Data Retention"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 dark:bg-blue-900/30">
              {label}
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-[var(--accent-soft)] px-5 py-4 text-sm font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          REQUIRES HUMAN LEGAL REVIEW BEFORE PRODUCTION
        </div>

        <div className="mt-6 space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
