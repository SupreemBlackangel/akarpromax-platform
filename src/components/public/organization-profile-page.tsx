"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";

type Organization = {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  nameTr: string | null;
  slug: string;
  type: string;
  classification: string;
  countryCode: string;
  cityId: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  descriptionTr: string | null;
  status: string;
};

type Mode = "offices" | "companies";

function pick(locale: "ar" | "en" | "tr", item: Organization, key: "name" | "description"): string {
  if (key === "name") {
    if (locale === "tr") return item.nameTr || item.nameEn || item.nameAr || item.slug;
    if (locale === "en") return item.nameEn || item.nameAr || item.nameTr || item.slug;
    return item.nameAr || item.nameEn || item.nameTr || item.slug;
  }
  if (locale === "tr") return item.descriptionTr || item.descriptionEn || item.descriptionAr || "";
  if (locale === "en") return item.descriptionEn || item.descriptionAr || item.descriptionTr || "";
  return item.descriptionAr || item.descriptionEn || item.descriptionTr || "";
}

function matchesMode(mode: Mode, type: string): boolean {
  return mode === "offices" ? type === "real_estate" : type === "business" || type === "other";
}

const COPY = {
  offices: {
    currentPath: (id: string) => `/offices/${id}`,
    backHref: "/offices",
    adFamily: "office-detail" as const,
    backLabel: { ar: "العودة إلى الشركات و المكاتب العقارية", en: "Back to real estate companies & offices", tr: "Emlak sirketleri ve ofislerine don" },
    eyebrow: { ar: "ملف شركة/مكتب عقاري", en: "Real Estate Company/Office Profile", tr: "Emlak Sirketi/Ofisi Profili" },
    error: { ar: "تعذر تحميل ملف الشركة/المكتب العقاري", en: "The real estate company/office profile could not be loaded.", tr: "Emlak sirketi/ofisi profili yuklenemedi." },
  },
  companies: {
    currentPath: (id: string) => `/companies/${id}`,
    backHref: "/companies",
    adFamily: "company-detail" as const,
    backLabel: { ar: "العودة إلى الشركات الأخرى", en: "Back to other companies", tr: "Diger sirketlere don" },
    eyebrow: { ar: "ملف الشركة", en: "Company Profile", tr: "Sirket Profili" },
    error: { ar: "تعذر تحميل ملف الشركة", en: "The company profile could not be loaded.", tr: "Sirket profili yuklenemedi." },
  },
} as const;

export default function OrganizationProfilePage({ mode, id }: { mode: Mode; id: string }) {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [reputation, setReputation] = useState<{ level: string; score: number } | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageCopy = COPY[mode];

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [orgResponse, repResponse, membersResponse] = await Promise.all([
          fetch(`/api/amrs/organizations/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/amrs/reputation?entityType=organization&entityId=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/amrs/organizations/${encodeURIComponent(id)}/members`, { cache: "no-store", signal: controller.signal }),
        ]);
        const orgData = (await orgResponse.json().catch(() => ({}))) as { organization?: Organization };
        const repData = (await repResponse.json().catch(() => ({}))) as { profile?: { level: string; score: number } | null };
        const membersData = (await membersResponse.json().catch(() => ({}))) as { members?: unknown[]; memberCount?: number };
        if (!orgResponse.ok || !orgData.organization || !matchesMode(mode, orgData.organization.type)) throw new Error(`HTTP ${orgResponse.status}`);
        if (controller.signal.aborted) return;
        setOrganization(orgData.organization);
        setReputation(repData.profile ?? null);
        setMemberCount(typeof membersData.memberCount === "number" ? membersData.memberCount : Array.isArray(membersData.members) ? membersData.members.length : 0);
      } catch {
        if (!controller.signal.aborted) setError(pageCopy.error[locale]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, locale, mode, pageCopy.error]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath={pageCopy.currentPath(id)}
      adLayout={{ mode: "standard", family: pageCopy.adFamily, entityType: "organization", entityId: id }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={organization ? {
        eyebrow: pageCopy.eyebrow[locale],
        title: pick(locale, organization, "name"),
        description: pick(locale, organization, "description") || organization.slug,
      } : undefined}
    >
      <PageContainer className="py-8" dir={dir}>
        <Link href={pageCopy.backHref} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
          ← {pageCopy.backLabel[locale]}
        </Link>

        {loading && <div className="mt-6 h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}
        {error && <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        {!loading && organization && (
          <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr]">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{organization.type}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{organization.classification}</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{organization.status}</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{pick(locale, organization, "name")}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, organization, "description") || organization.slug}</p>
            </section>

            <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">{locale === "ar" ? "ملخص الحضور" : locale === "tr" ? "Varlik Ozeti" : "Presence Summary"}</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p>{locale === "ar" ? "الدولة" : locale === "tr" ? "Ulke" : "Country"}: <strong>{organization.countryCode}</strong></p>
                <p>{locale === "ar" ? "المدينة" : locale === "tr" ? "Sehir" : "City"}: <strong>{organization.cityId || "—"}</strong></p>
                <p>{locale === "ar" ? "عدد الأعضاء" : locale === "tr" ? "Uye sayisi" : "Member count"}: <strong>{memberCount}</strong></p>
                <p>{locale === "ar" ? "المستوى" : locale === "tr" ? "Seviye" : "Level"}: <strong>{reputation?.level ?? "—"}</strong></p>
                <p>{locale === "ar" ? "الدرجة" : locale === "tr" ? "Puan" : "Score"}: <strong>{reputation?.score ?? "—"}</strong></p>
                <p>{locale === "ar" ? "الموقع الإلكتروني" : locale === "tr" ? "Web sitesi" : "Website"}: {organization.websiteUrl ? <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400">{organization.websiteUrl}</a> : "—"}</p>
                <p>{locale === "ar" ? "البريد" : locale === "tr" ? "E-posta" : "Email"}: <strong>{organization.contactEmail || "—"}</strong></p>
                <p>{locale === "ar" ? "الهاتف" : locale === "tr" ? "Telefon" : "Phone"}: <strong>{organization.contactPhone || "—"}</strong></p>
              </div>
            </aside>
          </div>
        )}
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
