"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeCheck, CalendarCheck2, ClipboardCheck, MapPin, Search,
  ShieldCheck, Sparkles, Star, Users, Wrench,
} from "lucide-react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import {
  CategoryCard, ProviderCard, RequestCard, ServiceCategoryIcon,
  type CategoryRow, type ProviderRow, type RequestRow,
} from "@services-ui/ServiceCards";
import { apiFetch, formatMoney, nameFor } from "@services-client";

type MarketSettings = {
  heroKickerAr: string;
  heroKickerEn: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroDescriptionAr: string;
  heroDescriptionEn: string;
  primaryCtaAr: string;
  primaryCtaEn: string;
  primaryCtaHref: string;
  secondaryCtaAr: string;
  secondaryCtaEn: string;
  secondaryCtaHref: string;
  announcementAr: string;
  announcementEn: string;
  showCategories: boolean;
  showFeaturedProviders: boolean;
  showLatestRequests: boolean;
  showHowItWorks: boolean;
  showTrustBar: boolean;
  featuredCategoryLimit: number;
  featuredProviderLimit: number;
  latestRequestLimit: number;
  allowPublicRequests: boolean;
  allowProviderRegistration: boolean;
};

type FeaturedAuction = {
  id: string;
  auctionType: string;
  titleAr: string;
  auctionCurrentPrice: number | null;
  currency: string;
};

const FALLBACK_SETTINGS: MarketSettings = {
  heroKickerAr: "سوق خدمات عقار بروماكس", heroKickerEn: "AkarProMax Services Marketplace",
  heroTitleAr: "كل خدمات عقارك، من محترفين موثوقين", heroTitleEn: "Every property service, delivered by trusted professionals",
  heroDescriptionAr: "اختر الخدمة وحدّد موقعك، ثم احجز مباشرة أو استقبل عروضًا واضحة وقارن بينها بثقة.",
  heroDescriptionEn: "Choose a service and location, then book instantly or compare clear quotes from trusted professionals.",
  primaryCtaAr: "اطلب خدمة الآن", primaryCtaEn: "Request a service", primaryCtaHref: "/service-requests/new",
  secondaryCtaAr: "انضم كمحترف", secondaryCtaEn: "Join as a professional", secondaryCtaHref: "/providers/apply",
  announcementAr: "خدمات سريعة بالحجز المباشر، ومشاريع متخصصة بنظام طلب العروض",
  announcementEn: "Instant booking for quick services and competitive quotes for specialist projects",
  showCategories: true, showFeaturedProviders: true, showLatestRequests: true, showHowItWorks: true, showTrustBar: true,
  featuredCategoryLimit: 12, featuredProviderLimit: 6, latestRequestLimit: 6,
  allowPublicRequests: true, allowProviderRegistration: true,
};

export default function ServicesPage() {
  const router = useRouter();
  const {
    locale, viewer, copy, dir, country, city, governorate, district,
    latitude, longitude, isGlobal, openLogin, handleLogout, AccountDialog,
  } = useServicesPage();
  const isArabic = locale === "ar";
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [settings, setSettings] = useState<MarketSettings>(FALLBACK_SETTINGS);
  const [featuredAuctions, setFeaturedAuctions] = useState<FeaturedAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const countryParams = new URLSearchParams();
    if (!isGlobal && country) countryParams.set("country", country.toUpperCase());
    const countrySuffix = countryParams.size ? `?${countryParams.toString()}` : "";
    const providerParams = new URLSearchParams({ limit: "12", scope: isGlobal ? "global" : "local" });
    const requestParams = new URLSearchParams({ status: "published", limit: "12", scope: isGlobal ? "global" : "local" });
    if (!isGlobal) {
      for (const params of [providerParams, requestParams]) params.set("country", country);
      if (governorate) {
        providerParams.set("governorate", governorate);
        requestParams.set("governorate", governorate);
      }
      if (city) {
        providerParams.set("cityId", city);
        requestParams.set("cityId", city);
      }
      if (district) {
        providerParams.set("districtId", district);
        requestParams.set("districtId", district);
      }
      if (latitude != null && longitude != null) {
        providerParams.set("latitude", String(latitude));
        providerParams.set("longitude", String(longitude));
        providerParams.set("radiusKm", "10");
      }
    }
    Promise.allSettled([
      apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${countrySuffix}`),
      apiFetch<{ profiles: ProviderRow[] }>(`/api/service-providers?${providerParams.toString()}`),
      apiFetch<{ requests: RequestRow[] }>(`/api/service-requests?${requestParams.toString()}`),
      !isGlobal && country
        ? apiFetch<{ settings: MarketSettings }>(`/api/service-marketplace-settings?country=${encodeURIComponent(country)}`)
        : Promise.resolve({ settings: FALLBACK_SETTINGS }),
    ]).then(([categoryResult, providerResult, requestResult, settingsResult]) => {
      if (!active) return;
      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.categories ?? []);
      if (providerResult.status === "fulfilled") setProviders(providerResult.value.profiles ?? []);
      if (requestResult.status === "fulfilled") setRequests(requestResult.value.requests ?? []);
      if (settingsResult.status === "fulfilled") setSettings({ ...FALLBACK_SETTINGS, ...settingsResult.value.settings });
      setLoading(false);
    });
    return () => { active = false; };
  }, [city, country, district, governorate, isGlobal, latitude, longitude]);

  useEffect(() => {
    fetch('/api/auctions?status=active&limit=3')
      .then((res) => res.json())
      .then((data) => { if (data.success) setFeaturedAuctions(data.data ?? []); })
      .catch(() => {});
  }, []);

  const groups = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const serviceCategories = useMemo(() => categories.filter((category) => Boolean(category.parent_id)), [categories]);
  const visibleCategories = useMemo(() => {
    const source = activeGroup ? serviceCategories.filter((category) => category.parent_id === activeGroup) : serviceCategories;
    return [...source]
      .sort((a, b) => Number(b.is_featured ?? 0) - Number(a.is_featured ?? 0) || Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .slice(0, settings.featuredCategoryLimit);
  }, [activeGroup, serviceCategories, settings.featuredCategoryLimit]);
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("location", location.trim());
    router.push(`/services/catalog${params.size ? `?${params}` : ""}`);
  };

  const hero = {
    kicker: isArabic ? settings.heroKickerAr : settings.heroKickerEn,
    title: isArabic ? settings.heroTitleAr : settings.heroTitleEn,
    description: isArabic ? settings.heroDescriptionAr : settings.heroDescriptionEn,
    announcement: isArabic ? settings.announcementAr : settings.announcementEn,
  };

  return (
    <>
      <PublicPageShell
        locale={locale} copy={copy} viewer={viewer} country={country} city={city}
        currentPath="/services" adLayout={{ mode: "standard", family: "services" }}
        onLogin={() => openLogin("login")} onLogout={handleLogout}
      >
        <main dir={dir} className="space-y-12 pb-12 pt-5">
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[--brand-navy] via-[--color-primary-hover] to-[--brand-blue] px-5 py-8 text-white shadow-xl shadow-[var(--color-primary)]/15 sm:px-8 md:py-11">
            <div className="pointer-events-none absolute -start-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-32 end-10 h-80 w-80 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative z-10 max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[var(--color-surface)]/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />{hero.kicker}
              </div>
              <h1 className="max-w-2xl text-3xl font-black leading-[1.25] !text-white sm:text-4xl md:text-[42px]">{hero.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/90 md:text-base">{hero.description}</p>

              <form onSubmit={search} className="mt-7 grid gap-2 rounded-2xl bg-[var(--color-surface)] p-2 shadow-2xl sm:grid-cols-[1fr_0.7fr_auto]" role="search">
                <label className="flex min-w-0 items-center gap-2 rounded-xl px-3 text-[var(--color-text-muted)]">
                  <Search className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isArabic ? "ما الخدمة التي تحتاجها؟" : "What service do you need?"} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]" />
                </label>
                <label className="flex min-w-0 items-center gap-2 rounded-xl border-t border-[var(--color-border)] px-3 text-[var(--color-text-muted)] sm:border-s sm:border-t-0">
                  <MapPin className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={isArabic ? "الولاية أو المنطقة" : "City or district"} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]" />
                </label>
                <button className="h-11 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-black text-white transition hover:bg-[var(--color-primary-hover)]">{isArabic ? "ابحث" : "Search"}</button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-primary)]/80">
                <span className="font-bold text-white">{isArabic ? "الأكثر طلبًا:" : "Popular:"}</span>
                {serviceCategories.slice(0, 5).map((category) => (
                  <Link key={category.id} href={`/services/catalog/${category.code}`} className="rounded-full border border-white/20 px-2.5 py-1 hover:bg-[var(--color-surface)]/10">
                    {nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {settings.showTrustBar && (
            <section className="grid overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:grid-cols-3 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]">
              {[
                [ShieldCheck, isArabic ? "محترفون موثّقون" : "Verified professionals", isArabic ? "مراجعة الهوية والتراخيص" : "Identity and license checks"],
                [Star, isArabic ? "تقييمات حقيقية" : "Real reviews", isArabic ? "من عملاء أكملوا الخدمة" : "From completed customers"],
                [ClipboardCheck, isArabic ? "عروض واضحة" : "Clear quotes", isArabic ? "سعر ونطاق وموعد قبل البدء" : "Price, scope and schedule upfront"],
              ].map(([Icon, title, subtitle], index) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return <div key={String(title)} className={`flex items-center gap-3 p-4 ${index ? "border-t border-[var(--color-border)] sm:border-s sm:border-t-0 dark:border-[var(--color-border)]" : ""}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-success-soft)] text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]"><ItemIcon className="h-5 w-5" /></span><div><p className="text-sm font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{String(title)}</p><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{String(subtitle)}</p></div></div>;
              })}
            </section>
          )}

          {settings.showCategories && (
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{isArabic ? "دليل المهن" : "Service directory"}</p><h2 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "اختر الخدمة المناسبة" : "Choose the right service"}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{isArabic ? "مهن منظمة حسب احتياج العقار، من الإصلاح السريع إلى المشاريع المتخصصة." : "Organized from quick repairs to specialist projects."}</p></div>
                <Link href="/services/catalog" className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{isArabic ? "عرض جميع المهن" : "Browse all"}<ArrowLeft className="h-4 w-4" /></Link>
              </div>

              {groups.length > 0 && <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => setActiveGroup(null)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition ${activeGroup === null ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"}`}>{isArabic ? "الكل" : "All"}</button>
                {groups.map((group) => <button key={group.id} onClick={() => setActiveGroup(group.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition ${activeGroup === group.id ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"}`}><ServiceCategoryIcon name={group.icon} className="h-4 w-4" />{nameFor(locale, group.name_ar, group.name_en, group.name_tr, group.code)}</button>)}
              </div>}

              {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />)}</div> : visibleCategories.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleCategories.map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}</div> : <EmptyState icon={Wrench} title={isArabic ? "جارٍ تجهيز دليل المهن" : "The directory is being prepared"} />}
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            {settings.allowPublicRequests && <div className="rounded-3xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-6 dark:border-[var(--color-primary)]/30 dark:bg-[var(--color-primary-soft)]/30"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-primary)] text-white"><CalendarCheck2 className="h-6 w-6" /></div><h2 className="mt-4 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "لديك عمل وتريد أفضل عرض؟" : "Have a project and need the best quote?"}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{isArabic ? "اشرح المطلوب وحدّد موقعك وموعدك. نطابق طلبك مع المحترفين المناسبين لتقارن السعر والخبرة والتقييم." : "Describe the work and location, then compare matching professionals."}</p><Link href={settings.primaryCtaHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-black text-white hover:bg-[var(--color-primary-hover)]">{isArabic ? settings.primaryCtaAr : settings.primaryCtaEn}<ArrowLeft className="h-4 w-4" /></Link></div>}
            {settings.allowProviderRegistration && <div className="rounded-3xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-6 dark:border-[var(--color-success)]/30 dark:bg-[var(--color-success-soft)]/30"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-success)] text-white"><Users className="h-6 w-6" /></div><h2 className="mt-4 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "أنت حرفي أو شركة خدمات؟" : "Are you a professional or service company?"}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{isArabic ? "أنشئ ملفًا موثوقًا، اختر مهنك ونطاق خدمتك وأسعارك، واستقبل الطلبات المطابقة مباشرة." : "Build a trusted profile and receive matching local requests."}</p><Link href={settings.secondaryCtaHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-success)] px-5 py-3 text-sm font-black text-white hover:bg-[var(--color-success)]/80">{isArabic ? settings.secondaryCtaAr : settings.secondaryCtaEn}<ArrowLeft className="h-4 w-4" /></Link></div>}
          </section>

          {settings.showFeaturedProviders && <section><SectionHeading eyebrow={isArabic ? "شبكة المحترفين" : "Professional network"} title={isArabic ? "محترفون بارزون" : "Featured professionals"} subtitle={isArabic ? "ملفات معتمدة، تقييمات موثوقة، واستجابة واضحة." : "Approved profiles with verified reviews and clear response records."} href="/providers" linkLabel={isArabic ? "دليل المحترفين" : "All professionals"} />{loading ? <CardSkeleton count={3} /> : providers.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{providers.slice(0, settings.featuredProviderLimit).map((provider, index) => <ProviderCard key={provider.id} provider={provider} locale={locale} index={index} />)}</div> : <EmptyState icon={BadgeCheck} title={isArabic ? "ستظهر هنا الملفات بعد اعتمادها" : "Approved profiles will appear here"} />}</section>}

          {settings.showLatestRequests && <section><SectionHeading eyebrow={isArabic ? "فرص جديدة" : "New opportunities"} title={isArabic ? "أحدث طلبات الخدمات" : "Latest service requests"} subtitle={isArabic ? "طلبات منشورة ومتاحة للمحترفين المؤهلين." : "Published requests available to qualified professionals."} href="/service-requests" linkLabel={isArabic ? "كل الطلبات" : "All requests"} />{loading ? <CardSkeleton count={4} /> : requests.length ? <div className="grid gap-4 sm:grid-cols-2">{requests.slice(0, settings.latestRequestLimit).map((request) => <RequestCard key={request.id} request={request} locale={locale} categoryMap={categoryMap} />)}</div> : <EmptyState icon={ClipboardCheck} title={isArabic ? "لا توجد طلبات منشورة الآن" : "No published requests yet"} action={settings.allowPublicRequests ? { href: settings.primaryCtaHref, label: isArabic ? "كن أول من يطلب خدمة" : "Post the first request" } : undefined} />}</section>}

          {settings.showHowItWorks && <section className="rounded-3xl bg-[var(--color-surface)] p-6 text-white md:p-8"><div className="text-center"><p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{isArabic ? "تجربة واضحة وآمنة" : "A clear, safe experience"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "كيف يعمل سوق الخدمات؟" : "How the marketplace works"}</h2></div><div className="mt-7 grid gap-6 sm:grid-cols-3">{[[Search, isArabic ? "1. اختر وحدد" : "1. Choose", isArabic ? "اختر المهنة وأدخل الموقع والتفاصيل." : "Select the service, location and details."], [Users, isArabic ? "2. قارن المحترفين" : "2. Compare", isArabic ? "احجز مباشرة أو قارن العروض والتقييمات." : "Book instantly or compare quotes and reviews."], [BadgeCheck, isArabic ? "3. نفّذ وقيّم" : "3. Complete", isArabic ? "تابع المهمة داخل المنصة ثم قيّم التجربة." : "Track completion and leave a verified review."]].map(([Icon, title, text]) => { const StepIcon = Icon as typeof Search; return <div key={String(title)} className="text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-surface)]/10 text-[var(--color-primary)]"><StepIcon className="h-6 w-6" /></span><h3 className="mt-3 font-black">{String(title)}</h3><p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{String(text)}</p></div>; })}</div><p className="mx-auto mt-7 max-w-xl rounded-xl border border-white/10 bg-[var(--color-surface)]/5 px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">{hero.announcement}</p></section>}

          {featuredAuctions.length > 0 && (
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{isArabic ? "مزادات عقارية" : "Real Estate Auctions"}</p>
                  <h2 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "مزادات مغلقة نشطة" : "Active Closed Auctions"}</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{isArabic ? "مزادات مغلقة تُدار بواسطة جهات موثوقة." : "Closed auctions managed by verified offices."}</p>
                </div>
                <Link href="/auctions" className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{isArabic ? "كل المزادات" : "All auctions"}<ArrowLeft className="h-4 w-4" /></Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {featuredAuctions.map((auction) => (
                  <Link key={auction.id} href={`/auctions/${auction.id}`} className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:shadow-lg dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[--brand-navy] to-[--brand-blue] text-white text-lg">
                        {auction.auctionType === 'fixed' ? '🔒' : '🌐'}
                      </div>
                      <div>
                        <p className="font-black text-sm text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{auction.titleAr}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{auction.auctionType === 'fixed' ? '72 ساعة' : 'مفتوح'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-muted)]">{isArabic ? "السعر الحالي" : "Current price"}</span>
                      <span className="font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{formatMoney(auction.auctionCurrentPrice, auction.currency)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}

function SectionHeading({ eyebrow, title, subtitle, href, linkLabel }: { eyebrow: string; title: string; subtitle: string; href: string; linkLabel: string }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p></div><Link href={href} className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{linkLabel}<ArrowLeft className="h-4 w-4" /></Link></div>;
}

function EmptyState({ icon: Icon, title, action }: { icon: typeof Wrench; title: string; action?: { href: string; label: string } }) {
  return <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/70 px-5 py-10 text-center dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]/50"><Icon className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" /><p className="mt-3 text-sm font-bold text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{title}</p>{action && <Link href={action.href} className="mt-4 inline-block text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{action.label}</Link>}</div>;
}

function CardSkeleton({ count }: { count: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: count }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-[var(--color-background)] dark:bg-[var(--color-surface)]" />)}</div>;
}
