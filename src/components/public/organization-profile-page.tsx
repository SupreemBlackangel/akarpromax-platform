"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import StartThreadButton from "@services-ui/StartThreadButton";

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

const IDENTITY = {
  offices: {
    currentPath: (id: string) => `/offices/${id}`,
    backHref: "/offices",
    adFamily: "office-detail" as const,
    icon: "🏢",
    badge: { ar: "مكتب عقاري", en: "Real Estate Office", tr: "Emlak Ofisi" },
    eyebrow: { ar: "ملف شركة/مكتب عقاري", en: "Real Estate Company/Office Profile", tr: "Emlak Sirketi/Ofisi Profili" },
    backLabel: { ar: "العودة إلى الشركات والمكاتب العقارية", en: "Back to real estate companies & offices", tr: "Emlak sirketleri ve ofislerine don" },
    error: { ar: "تعذر تحميل ملف الشركة/المكتب العقاري", en: "The real estate company/office profile could not be loaded.", tr: "Emlak sirketi/ofisi profili yuklenemedi." },
    titleNote: { ar: "نشاط عقاري", en: "Real Estate Business", tr: "Emlak Faaliyeti" },
    membersLabel: { ar: "الوكلاء والأعضاء", en: "Agents & members", tr: "Temsilciler ve uyeler" },
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    chipSolid: "bg-teal-600 text-white",
    heading: "text-teal-700 dark:text-teal-400",
    cta: { ar: "تصفح المكاتب العقارية", en: "Browse real estate offices", tr: "Emlak ofislerine goz at" },
  },
  companies: {
    currentPath: (id: string) => `/companies/${id}`,
    backHref: "/companies",
    adFamily: "company-detail" as const,
    icon: "🏭",
    badge: { ar: "شركة", en: "Company", tr: "Sirket" },
    eyebrow: { ar: "ملف الشركة", en: "Company Profile", tr: "Sirket Profili" },
    backLabel: { ar: "العودة إلى الشركات الأخرى", en: "Back to other companies", tr: "Diger sirketlere don" },
    error: { ar: "تعذر تحميل ملف الشركة", en: "The company profile could not be loaded.", tr: "Sirket profili yuklenemedi." },
    titleNote: { ar: "نشاط تجاري", en: "Business Entity", tr: "Ticari Isletme" },
    membersLabel: { ar: "فريق العمل", en: "Team members", tr: "Ekip uyeleri" },
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    chipSolid: "bg-amber-600 text-white",
    heading: "text-amber-700 dark:text-amber-400",
    cta: { ar: "تصفح الشركات", en: "Browse companies", tr: "Sirketlere goz at" },
  },
} as const;

export default function OrganizationProfilePage({ mode, id }: { mode: Mode; id: string }) {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [reputation, setReputation] = useState<{ level: string; score: number } | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageCopy = IDENTITY[mode];
  const identity = IDENTITY[mode];

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
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-start gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${identity.chipSolid}`} aria-hidden="true">
                  {identity.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className={`rounded-full px-2.5 py-1 ${identity.chip}`}>{identity.badge[locale]}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">{organization.classification}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{organization.status}</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">{pick(locale, organization, "name")}</h1>
                  <p className={`mt-1 text-xs font-bold uppercase tracking-wide ${identity.heading}`}>{identity.titleNote[locale]}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{pick(locale, organization, "description") || organization.slug}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
              <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">{locale === "ar" ? "ملخص الحضور" : locale === "tr" ? "Varlik Ozeti" : "Presence Summary"}</h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{locale === "ar" ? "الدولة" : locale === "tr" ? "Ulke" : "Country"}: <strong>{organization.countryCode}</strong></p>
                  <p>{locale === "ar" ? "المدينة" : locale === "tr" ? "Sehir" : "City"}: <strong>{organization.cityId || "—"}</strong></p>
                  <p>{identity.membersLabel[locale]}: <strong>{memberCount}</strong></p>
                  <p>{locale === "ar" ? "المستوى" : locale === "tr" ? "Seviye" : "Level"}: <strong>{reputation?.level ?? "—"}</strong></p>
                  <p>{locale === "ar" ? "الدرجة" : locale === "tr" ? "Puan" : "Score"}: <strong>{reputation?.score ?? "—"}</strong></p>
                </div>
              </aside>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  {mode === "offices"
                    ? (locale === "ar" ? "بيانات التواصل" : locale === "tr" ? "Iletisim" : "Contact")
                    : (locale === "ar" ? "بيانات الشركة" : locale === "tr" ? "Sirket Bilgileri" : "Company Details")}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{locale === "ar" ? "الموقع الإلكتروني" : locale === "tr" ? "Web sitesi" : "Website"}: {organization.websiteUrl ? <a href={organization.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400">{organization.websiteUrl}</a> : "—"}</p>
                  <p>{locale === "ar" ? "البريد" : locale === "tr" ? "E-posta" : "Email"}: <strong>{organization.contactEmail || "—"}</strong></p>
                  <p>{locale === "ar" ? "الهاتف" : locale === "tr" ? "Telefon" : "Phone"}: <strong>{organization.contactPhone || "—"}</strong></p>
                </div>
                <Link
                  href={pageCopy.backHref}
                  className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${identity.chipSolid} hover:opacity-90`}
                >
                  {pageCopy.cta[locale]}
                </Link>
                <StartThreadButton
                  threadType="organization"
                  threadId={id}
                  title={pick(locale, organization, "name")}
                  contextLink={pageCopy.currentPath(id)}
                  participantIds={organization.contactEmail ? [organization.contactEmail] : []}
                  label={locale === "ar" ? "راسلنا الآن" : locale === "tr" ? "Mesaj Gonder" : "Send a message"}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                />
              </section>
            </div>
          </div>
        )}
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
