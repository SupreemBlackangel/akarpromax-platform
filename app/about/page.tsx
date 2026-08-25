'use client';

import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';

export default function AboutPage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  return (
    <>
      <PublicPageShell
        locale={locale}
        copy={copy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath="/about"
        pageHeader={{
          eyebrow: 'عقار بروماكس',
          title: 'من نحن',
          description: 'منصة عقارية متكاملة تهدف إلى تسهيل البحث عن العقارات وبيعها وإيجارها في عُمان والمنطقة.',
        }}
        adLayout={{ mode: 'standard', family: 'about' }}
        onLogin={() => openLogin('login')}
        onLogout={handleLogout}
      >
        <div dir={dir} className="mx-auto w-full max-w-4xl px-5 py-10">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">عقار بروماكس</strong> هي منصة عقارية متكاملة تهدف إلى تسهيل عملية البحث عن العقارات وبيعها وإيجارها.
            </p>
            <h2 className="mt-8 text-xl font-bold text-[var(--color-text-primary)]">رسالتنا</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">تقديم خدمات عقارية موثوقة وشفافة للمستخدمين في عُمان والمنطقة.</p>
            <h2 className="mt-8 text-xl font-bold text-[var(--color-text-primary)]">ماذا نقدم؟</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>عقارات للبيع والإيجار</li>
              <li>سوق خدمات متكامل</li>
              <li>أدوات هندسية متقدمة</li>
              <li>منتدى مجتمعي</li>
              <li>مكتبة معرفية</li>
            </ul>
          </div>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
