import Link from "next/link";

/**
 * Localized 404. Direction/lang are inherited from the root <html>, which the
 * layout resolves from the locale cookie — so no hardcoded dir here.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[var(--color-background)] px-6 py-20">
      <div className="w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-black tracking-widest text-[var(--color-primary)]">404</p>
        <h1 className="mt-3 text-2xl font-black text-[var(--color-text-primary)]">
          الصفحة غير موجودة
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          الرابط الذي طلبته غير متوفر أو تم نقله.
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
            Page not found · Sayfa bulunamadı
          </span>
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-[var(--color-primary-foreground)] transition hover:bg-[var(--color-primary-hover)]"
          >
            العودة للرئيسية
          </Link>
          <Link
            href="/properties"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)]"
          >
            تصفح العقارات
          </Link>
        </div>
      </div>
    </main>
  );
}
