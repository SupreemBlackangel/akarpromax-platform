"use client";

import Link from "next/link";
import {
  CheckCircle2, Download, KeyRound, Link2, Monitor, Newspaper,
  Radar, ShieldCheck, UploadCloud, UserPlus,
} from "lucide-react";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import { ContentContainer } from "@/src/components/layout/Containers";

const SETUP_URL = "/downloads/AkarProMaxOffice-Setup.exe";
const DOTNET_URL = "https://dotnet.microsoft.com/download/dotnet/8.0";

const FEATURES = [
  { icon: UploadCloud, title: "رفع العقارات للمنصة", desc: "أنشئ مسودات عقاراتك في التطبيق وارفعها للمنصة للمراجعة والنشر، مع الصور والمرفقات." },
  { icon: Radar, title: "رادار الفرص القريبة", desc: "تنبيهات بالعقارات والخدمات المطابقة لمنطقتك ونوع نشاطك ضمن النطاق الذي تحدده." },
  { icon: Newspaper, title: "أخبار وإعلانات المنصة", desc: "شريط أخبار المنصة وإعلاناتها المفلترة حسب دولتك ومدينتك تصل مباشرة إلى مكتبك." },
  { icon: ShieldCheck, title: "اقتران آمن بدون كلمات مرور", desc: "يرتبط التطبيق بحسابك عبر كود اقتران لمرة واحدة، برموز وصول مشفرة قابلة للإلغاء من لوحتك." },
];

const LINK_STEPS = [
  { icon: UserPlus, title: "سجّل حسابك في المنصة", desc: "أنشئ حسابك بالبريد وكلمة المرور ووافق على الشروط والأحكام، ثم فعّل بريدك الإلكتروني.", href: "/register", linkLabel: "إنشاء حساب" },
  { icon: CheckCircle2, title: "فعّل صلاحية المكتب", desc: "بعد مراجعة الإدارة يُمنح حسابك صلاحيات المكتب العقاري وتظهر لك لوحة العمل الخاصة بالمكاتب." },
  { icon: KeyRound, title: "ولّد كود الاقتران", desc: "من لوحة العمل في المنصة أنشئ كود اقتران لمرة واحدة (صالح 15 دقيقة) خاصًا بجهازك." },
  { icon: Link2, title: "اربط التطبيق وابدأ", desc: "أدخل الكود في التطبيق المكتبي ليقترن بحسابك، وتبدأ المزامنة: رفع عقاراتك، واستقبال الأخبار والفرص المطابقة لمنطقتك." },
];

export default function DownloadOfficeAppPage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/download"
      adLayout={{ mode: "safe-no-ads" }}
      pageHeader={{
        eyebrow: "AkarProMax Office",
        title: "تطبيق المكتب العقاري لسطح المكتب",
        description: "أدر عقاراتك وعملاءك وعقودك من جهازك، وابقَ متصلًا بالمنصة: رفع العقارات، رادار الفرص، والأخبار والإعلانات حسب منطقتك.",
      }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-8">
        <ContentContainer>
          {/* Download card */}
          <section className="rounded-3xl border-2 border-[var(--color-primary)]/30 bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface)] p-6 sm:p-8">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25">
                <Monitor className="h-10 w-10" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-[var(--color-text-primary)]">AkarProMax Office</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  لنظام Windows 10 / 11 — مثبّت واحد (18 ميغابايت) — مجاني لمكاتب المنصة
                </p>
              </div>
              <a
                href={SETUP_URL}
                className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-[var(--color-primary)] px-7 py-4 text-base font-black text-white shadow-lg shadow-[var(--color-primary)]/25 transition hover:bg-[var(--color-primary-hover)]"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                تحميل المثبّت (Setup)
              </a>
            </div>
            <ul className="mt-6 grid gap-2 border-t border-[var(--color-primary)]/15 pt-5 text-sm text-[var(--color-text-secondary)] sm:grid-cols-3">
              <li>• يتطلب <a href={DOTNET_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--color-primary)] hover:underline">.NET 8 Desktop Runtime</a> (يفحصه المثبّت)</li>
              <li>• شغّل المثبّت واتبع الخطوات — يُنشئ اختصارات ويثبّت التطبيق</li>
              <li>• يعمل دون اتصال ويزامن مع المنصة عند توفره</li>
            </ul>
          </section>

          {/* Features */}
          <section className="mt-12">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">ماذا يقدم لك التطبيق؟</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 font-black text-[var(--color-text-primary)]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Linking steps */}
          <section className="mt-12">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">ربط التطبيق بحسابك في المنصة</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              حسابك في المنصة هو مفتاح التطبيق: التسجيل والموافقة على الشروط يتمان على الموقع، ثم يقترن التطبيق بحسابك بكود لمرة واحدة — دون إدخال كلمة مرورك في التطبيق أبدًا.
            </p>
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {LINK_STEPS.map(({ icon: Icon, title, desc, href, linkLabel }, index) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -top-2 -start-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-accent)] text-[11px] font-black text-[var(--color-text-primary)]">{index + 1}</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-black text-[var(--color-text-primary)]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{desc}</p>
                    {href && (
                      <Link href={href} className="mt-2 inline-block text-sm font-black text-[var(--color-primary)] hover:underline">
                        {linkLabel} ←
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </ContentContainer>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
