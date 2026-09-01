"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary: friendly, token-styled, trilingual-lite.
 * Technical details are shown only in development.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for diagnostics without leaking it to the UI.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center bg-[var(--color-background)] px-6 py-20">
      <div className="w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-black tracking-widest text-[var(--color-danger)]">خطأ</p>
        <h1 className="mt-3 text-2xl font-black text-[var(--color-text-primary)]">
          حدث خطأ غير متوقع
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          نعتذر عن ذلك — يمكنك إعادة المحاولة، وإن تكرر الخطأ تواصل معنا.
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
            Something went wrong · Bir hata oluştu
          </span>
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-3 text-start text-xs text-[var(--color-danger)]" dir="ltr">
            {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-[var(--color-primary-foreground)] transition hover:bg-[var(--color-primary-hover)]"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)]"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
