"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, MapPin, ShieldCheck, Star, Users } from "lucide-react";

import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import { ServiceCategoryIcon, type CategoryRow } from "@services-ui/ServiceCards";
import { apiFetch, nameFor } from "@services-client";

export default function ProviderApplyPage() {
  const { locale, viewer, dir, country, city, isGlobal, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const isArabic = locale === "ar";
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  useEffect(() => {
    let active = true;
    const suffix = !isGlobal && country ? `?country=${encodeURIComponent(country)}` : "";
    Promise.allSettled([
      apiFetch<{ categories: CategoryRow[] }>(`/api/service-categories${suffix}`),
      !isGlobal && country
        ? apiFetch<{ settings: { allowProviderRegistration?: boolean } }>(`/api/service-marketplace-settings${suffix}`)
        : Promise.resolve({ settings: { allowProviderRegistration: true } }),
    ]).then(([categoryResult, settingsResult]) => {
      if (!active) return;
      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.categories?.filter((category) => category.parent_id) ?? []);
      if (settingsResult.status === "fulfilled") setRegistrationAllowed(settingsResult.value.settings.allowProviderRegistration !== false);
    });
    return () => { active = false; };
  }, [country, isGlobal]);

  const featured = useMemo(() => categories.filter((category) => category.is_featured).slice(0, 12), [categories]);

  const start = () => {
    if (!registrationAllowed) return;
    if (selectedCategory) window.localStorage.setItem("ak_provider_selected_category", selectedCategory);
    if (!viewer.authenticated) {
      openLogin("register");
      return;
    }
    window.location.href = `/dashboard/services/provider-profile${selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : ""}`;
  };

  return (
    <>
      <PublicPageShell locale={locale} copy={copy} viewer={viewer} country={country} city={city} currentPath="/providers/apply" adLayout={{ mode: "standard", family: "providers" }} onLogin={() => openLogin("login")} onLogout={handleLogout}>
        <main dir={dir} className="space-y-8 pb-12 pt-6">
          <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-primary)] hover:underline dark:text-[var(--color-primary)]">{isArabic ? "العودة إلى سوق الخدمات" : "Back to services"}<ArrowLeft className="h-4 w-4" /></Link>

          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
            <div className="grid gap-8 px-6 py-9 md:grid-cols-[1fr_0.8fr] md:px-9 md:py-12">
              <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[var(--color-surface)]/10 px-3 py-1.5 text-xs font-bold"><BriefcaseBusiness className="h-4 w-4 text-[var(--color-success)]" />{isArabic ? "نمِّ أعمالك مع عقار بروماكس" : "Grow with AkarProMax"}</div><h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">{isArabic ? "حوّل مهنتك إلى ملف موثوق وفرص عمل حقيقية" : "Turn your profession into a trusted profile and real opportunities"}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-primary)]/80/80">{isArabic ? "اختر المهن التي تقدمها، حدّد منطقتك ونطاق خدمتك وأسعارك، وأرفق تراخيصك وأعمالك السابقة. بعد المراجعة تصلك الطلبات المطابقة مباشرة." : "Choose your services, service area and pricing, then submit licenses and previous work for review."}</p></div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">{[[BadgeCheck, isArabic ? "اعتماد مهني" : "Professional verification", isArabic ? "شارة اعتماد بعد مراجعة الملف" : "A badge after profile review"], [MapPin, isArabic ? "طلبات حسب منطقتك" : "Local matching", isArabic ? "مطابقة بالمهنة والموقع والنطاق" : "Matching by service and area"], [Star, isArabic ? "سمعة قابلة للنمو" : "Build your reputation", isArabic ? "تقييمات حقيقية بعد كل مهمة" : "Verified reviews after each job"]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof BadgeCheck; return <div key={String(title)} className="flex gap-3 rounded-2xl border border-white/10 bg-[var(--color-surface)]/5 p-3.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-[var(--color-success)]"><ItemIcon className="h-5 w-5" /></span><div><p className="text-sm font-black">{String(title)}</p><p className="mt-0.5 text-xs text-[var(--color-primary)]/80/60">{String(text)}</p></div></div>; })}</div>
            </div>
          </section>

          {!registrationAllowed ? <section className="rounded-2xl border border-amber-200 bg-[var(--accent-soft)] p-6 text-center dark:border-amber-900 dark:bg-[var(--accent-soft)]/30"><ShieldCheck className="mx-auto h-9 w-9 text-[var(--accent)]" /><h2 className="mt-3 text-lg font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "التسجيل متوقف مؤقتًا" : "Registration is temporarily paused"}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{isArabic ? "يمكن للمدير إعادة فتح التسجيل من لوحة إدارة سوق الخدمات." : "The marketplace administrator can reopen applications."}</p></section> : <>
            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">{isArabic ? "الخطوة الأولى" : "First step"}</p><h2 className="mt-1 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "ما مهنتك الأساسية؟" : "What is your primary service?"}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{isArabic ? "يمكنك إضافة أكثر من مهنة وأسعار مختلفة بعد إنشاء الملف." : "You can add more services and different prices later."}</p></div><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="h-11 min-w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-bold text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)] dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"><option value="">{isArabic ? "اختر المهنة لاحقًا" : "Choose later"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}</option>)}</select></div>
              {featured.length > 0 && <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{featured.map((category) => <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-start transition ${selectedCategory === category.id ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/30 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)] dark:text-[var(--color-surface-muted)]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selectedCategory === category.id ? "bg-[var(--color-surface)]/15" : "bg-[var(--color-surface)] text-[var(--color-primary)] dark:bg-[var(--color-surface)] dark:text-[var(--color-primary)]"}`}><ServiceCategoryIcon name={category.icon} className="h-5 w-5" /></span><span className="text-xs font-black">{nameFor(locale, category.name_ar, category.name_en, category.name_tr, category.code)}</span></button>)}</div>}
            </section>

            <section className="grid gap-4 md:grid-cols-3">{[["1", isArabic ? "بياناتك ونطاقك" : "Your details and area", isArabic ? "الاسم، الهاتف، الموقع ونطاق الانتقال." : "Name, phone, location and travel radius."], ["2", isArabic ? "المهن والأسعار" : "Services and pricing", isArabic ? "اختر كل المهن وحدّد سعرًا استرشاديًا." : "Select services and indicative pricing."], ["3", isArabic ? "الاعتماد والانطلاق" : "Review and launch", isArabic ? "أرفق المستندات والأعمال وأرسل للمراجعة." : "Submit documents and portfolio for review."]].map(([number, title, text]) => <div key={number} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)] dark:bg-blue-950/50 dark:text-[var(--color-primary)]">{number}</span><h3 className="mt-3 font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{text}</p></div>)}</section>

            <section className="flex flex-col items-center rounded-3xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-7 text-center dark:border-[var(--color-success)]/30 dark:bg-[var(--color-success-soft)]/30"><Users className="h-9 w-9 text-[var(--color-success)] dark:text-[var(--color-success)]" /><h2 className="mt-3 text-xl font-black text-[var(--color-text-primary)] dark:text-[var(--color-surface)]">{isArabic ? "جاهز لإنشاء ملفك المهني؟" : "Ready to create your professional profile?"}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">{viewer.authenticated ? (isArabic ? "سننقلك إلى نموذج الملف، واختيارك أعلاه محفوظ تلقائيًا." : "Your selected service will carry into the profile form.") : (isArabic ? "أنشئ حسابًا أو سجّل الدخول، وسنحتفظ بالمهنة التي اخترتها." : "Sign in or create an account; your selected service will be saved.")}</p><button onClick={start} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-success)] px-6 py-3 text-sm font-black text-white hover:bg-[var(--color-success)]/80">{viewer.authenticated ? (isArabic ? "ابدأ إعداد الملف" : "Set up my profile") : (isArabic ? "إنشاء حساب والبدء" : "Create account and start")}<ArrowLeft className="h-4 w-4" /></button></section>
          </>}
        </main>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
